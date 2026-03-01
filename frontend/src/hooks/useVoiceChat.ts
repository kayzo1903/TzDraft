"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSocket } from "./useSocket";

/**
 * Call state machine:
 *   idle      – no call in progress
 *   ringing   – I called; waiting for the other player to accept
 *   incoming  – the other player called me; I can accept or decline
 *   calling   – both agreed; WebRTC is being negotiated
 *   connected – audio is flowing P2P
 *   failed    – negotiation failed
 */
export type CallState = "idle" | "ringing" | "incoming" | "calling" | "connected" | "failed";

const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

export interface UseVoiceChatResult {
  callState: CallState;
  isLocalMuted: boolean;
  error: string | null;
  remoteAudioRef: React.RefObject<HTMLAudioElement | null>;
  startCall: () => void;
  acceptCall: () => Promise<void>;
  declineCall: () => void;
  endCall: () => void;
  toggleMute: () => void;
}

export function useVoiceChat(gameId: string): UseVoiceChatResult {
  const { socket } = useSocket();

  const [callState, setCallState] = useState<CallState>("idle");
  const [isLocalMuted, setIsLocalMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);

  // Stable refs for values needed inside socket callbacks
  const callStateRef = useRef<CallState>("idle");
  const socketRef = useRef(socket);
  const gameIdRef = useRef(gameId);
  // Set to true by acceptCall() so the onOffer listener knows it should answer
  const pendingAcceptRef = useRef(false);

  useEffect(() => { callStateRef.current = callState; }, [callState]);
  useEffect(() => { socketRef.current = socket; }, [socket]);
  useEffect(() => { gameIdRef.current = gameId; }, [gameId]);

  // ── Teardown ─────────────────────────────────────────────────────────────

  const cleanup = useCallback(() => {
    pendingAcceptRef.current = false;
    if (pcRef.current) {
      pcRef.current.onicecandidate = null;
      pcRef.current.ontrack = null;
      pcRef.current.onconnectionstatechange = null;
      pcRef.current.close();
      pcRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null;
    }
    setCallState("idle");
    setIsLocalMuted(false);
  }, []);

  // ── RTCPeerConnection factory ─────────────────────────────────────────────

  const buildPc = useCallback((): RTCPeerConnection => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    pc.onicecandidate = ({ candidate }) => {
      if (candidate && socketRef.current) {
        socketRef.current.emit("voice:ice-candidate", {
          gameId: gameIdRef.current,
          candidate: candidate.toJSON(),
        });
      }
    };

    pc.ontrack = ({ streams }) => {
      if (remoteAudioRef.current && streams[0]) {
        remoteAudioRef.current.srcObject = streams[0];
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected") {
        setCallState("connected");
        setError(null);
      } else if (pc.connectionState === "failed") {
        setError("Connection failed — try calling again.");
        cleanup();
      }
    };

    return pc;
  }, [cleanup]);

  const getMic = (): Promise<MediaStream> =>
    navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 16000 },
    });

  // ── Public API ────────────────────────────────────────────────────────────

  /** Caller: ring the opponent. WebRTC starts only after they accept. */
  const startCall = useCallback(() => {
    if (!socket || callStateRef.current !== "idle") return;
    setError(null);
    setCallState("ringing");
    socket.emit("voice:ring", { gameId });
  }, [socket, gameId]);

  /** Callee: accept the incoming call. Readies the PC to receive the offer. */
  const acceptCall = useCallback(async () => {
    if (!socket || callStateRef.current !== "incoming") return;
    setError(null);
    setCallState("calling");
    pendingAcceptRef.current = true;
    socket.emit("voice:accept", { gameId });
  }, [socket, gameId]);

  /** Callee: decline the incoming call. */
  const declineCall = useCallback(() => {
    if (!socket) return;
    socket.emit("voice:decline", { gameId });
    setCallState("idle");
    setError(null);
  }, [socket, gameId]);

  /** End an active call, cancel ringing, or reject — works from any non-idle state. */
  const endCall = useCallback(() => {
    if (socketRef.current && callStateRef.current !== "idle") {
      socketRef.current.emit("voice:hangup", { gameId: gameIdRef.current });
    }
    cleanup();
  }, [cleanup]);

  const toggleMute = useCallback(() => {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setIsLocalMuted(!track.enabled);
  }, []);

  // ── Socket signaling listeners ────────────────────────────────────────────

  useEffect(() => {
    if (!socket) return;

    // Callee: opponent is calling — show the incoming call UI
    const onRing = () => {
      if (callStateRef.current !== "idle") return;
      setError(null);
      setCallState("incoming");
    };

    // Caller: callee accepted — NOW create and send the WebRTC offer
    const onAccept = async () => {
      if (callStateRef.current !== "ringing") return;
      setCallState("calling");
      try {
        const stream = await getMic();
        localStreamRef.current = stream;
        const pc = buildPc();
        pcRef.current = pc;
        stream.getTracks().forEach((t) => pc.addTrack(t, stream));
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socketRef.current?.emit("voice:offer", {
          gameId: gameIdRef.current,
          sdp: pc.localDescription,
        });
      } catch (err: any) {
        cleanup();
        setError(
          err?.name === "NotAllowedError"
            ? "Microphone access denied."
            : "Could not start call.",
        );
      }
    };

    // Caller: callee declined — show brief message
    const onDecline = () => {
      if (callStateRef.current !== "ringing") return;
      cleanup();
      setError("Call was declined.");
    };

    // Callee: receives offer after having accepted — complete the handshake
    const onOffer = async ({ sdp }: { sdp: RTCSessionDescriptionInit }) => {
      if (!pendingAcceptRef.current) return; // ignore unsolicited offers
      pendingAcceptRef.current = false;
      try {
        const stream = await getMic();
        localStreamRef.current = stream;
        const pc = buildPc();
        pcRef.current = pc;
        stream.getTracks().forEach((t) => pc.addTrack(t, stream));
        await pc.setRemoteDescription(sdp);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socketRef.current?.emit("voice:answer", {
          gameId: gameIdRef.current,
          sdp: pc.localDescription,
        });
      } catch (err: any) {
        cleanup();
        setError(
          err?.name === "NotAllowedError"
            ? "Microphone access denied."
            : "Could not connect call.",
        );
      }
    };

    const onAnswer = async ({ sdp }: { sdp: RTCSessionDescriptionInit }) => {
      await pcRef.current?.setRemoteDescription(sdp).catch(() => {});
    };

    const onIceCandidate = async ({ candidate }: { candidate: RTCIceCandidateInit }) => {
      await pcRef.current?.addIceCandidate(candidate).catch(() => {});
    };

    const onHangup = () => cleanup();

    socket.on("voice:ring", onRing);
    socket.on("voice:accept", onAccept);
    socket.on("voice:decline", onDecline);
    socket.on("voice:offer", onOffer);
    socket.on("voice:answer", onAnswer);
    socket.on("voice:ice-candidate", onIceCandidate);
    socket.on("voice:hangup", onHangup);

    return () => {
      socket.off("voice:ring", onRing);
      socket.off("voice:accept", onAccept);
      socket.off("voice:decline", onDecline);
      socket.off("voice:offer", onOffer);
      socket.off("voice:answer", onAnswer);
      socket.off("voice:ice-candidate", onIceCandidate);
      socket.off("voice:hangup", onHangup);
    };
  }, [socket, buildPc, cleanup]);

  // Cleanup on gameId change or unmount
  useEffect(() => {
    return () => {
      endCall();
    };
  }, [gameId]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    callState,
    isLocalMuted,
    error,
    remoteAudioRef,
    startCall,
    acceptCall,
    declineCall,
    endCall,
    toggleMute,
  };
}
