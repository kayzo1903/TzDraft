"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSocket } from "./useSocket";
import axiosInstance from "@/lib/axios";

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

/** STUN-only fallback used when /turn/credentials is unreachable */
const FALLBACK_ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

/** RMS amplitude threshold above which the remote peer is considered "speaking" */
const SPEAKING_THRESHOLD = 10;

export interface UseVoiceChatResult {
  callState: CallState;
  isLocalMuted: boolean;
  isRemoteSpeaking: boolean;
  isPttMode: boolean;
  error: string | null;
  remoteAudioRef: React.RefObject<HTMLAudioElement | null>;
  startCall: () => void;
  acceptCall: () => Promise<void>;
  declineCall: () => void;
  endCall: () => void;
  toggleMute: () => void;
  togglePttMode: () => void;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function micErrorMessage(e: any): string {
  switch (e?.name) {
    case "NotAllowedError":      return "Microphone access denied. Allow mic in browser settings.";
    case "NotFoundError":        return "No microphone found on this device.";
    case "OverconstrainedError": return "Microphone not compatible. Retrying…";
    case "SecurityError":        return "Voice chat requires a secure connection (HTTPS).";
    case "AbortError":           return "Microphone is in use by another app.";
    default:                     return "Could not access microphone.";
  }
}

/** F1: Remove sampleRate (crashes Safari/some Android). Retry with bare audio on OverconstrainedError. */
async function getMic(): Promise<MediaStream> {
  const preferred = { echoCancellation: true, noiseSuppression: true, autoGainControl: true };
  try {
    return await navigator.mediaDevices.getUserMedia({ audio: preferred });
  } catch (e: any) {
    if (e?.name === "OverconstrainedError") {
      return await navigator.mediaDevices.getUserMedia({ audio: true });
    }
    throw e;
  }
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useVoiceChat(gameId: string): UseVoiceChatResult {
  const { socket } = useSocket();

  const [callState, setCallState]           = useState<CallState>("idle");
  const [isLocalMuted, setIsLocalMuted]     = useState(false);
  const [isRemoteSpeaking, setIsRemoteSpeaking] = useState(false);
  const [isPttMode, setIsPttMode]           = useState(false);
  const [error, setError]                   = useState<string | null>(null);

  const pcRef            = useRef<RTCPeerConnection | null>(null);
  const localStreamRef   = useRef<MediaStream | null>(null);
  const remoteAudioRef   = useRef<HTMLAudioElement | null>(null);

  // F7: speaking indicator
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef      = useRef<number | null>(null);

  // F10: ICE candidate buffering
  const iceCandidateQueueRef = useRef<RTCIceCandidateInit[]>([]);
  const remoteDescReadyRef   = useRef(false);

  // Stable refs for values used inside socket callbacks
  const callStateRef  = useRef<CallState>("idle");
  const socketRef     = useRef(socket);
  const gameIdRef     = useRef(gameId);
  const isPttModeRef  = useRef(false);
  const pendingAcceptRef = useRef(false);

  useEffect(() => { callStateRef.current = callState; },   [callState]);
  useEffect(() => { socketRef.current    = socket; },      [socket]);
  useEffect(() => { gameIdRef.current    = gameId; },      [gameId]);
  useEffect(() => { isPttModeRef.current = isPttMode; },   [isPttMode]);

  // ── F7: Speaking indicator ────────────────────────────────────────────────

  const startSpeakingIndicator = useCallback((stream: MediaStream) => {
    try {
      const ctx      = new AudioContext();
      audioCtxRef.current = ctx;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      ctx.createMediaStreamSource(stream).connect(analyser);
      const buf = new Uint8Array(analyser.frequencyBinCount);
      const poll = () => {
        analyser.getByteFrequencyData(buf);
        const rms = Math.sqrt(buf.reduce((s, v) => s + v * v, 0) / buf.length);
        setIsRemoteSpeaking(rms > SPEAKING_THRESHOLD);
        rafRef.current = requestAnimationFrame(poll);
      };
      rafRef.current = requestAnimationFrame(poll);
    } catch {
      // AudioContext unavailable — non-fatal, indicator just won't show
    }
  }, []);

  const stopSpeakingIndicator = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    setIsRemoteSpeaking(false);
  }, []);

  // ── F10: ICE candidate drain ──────────────────────────────────────────────

  const drainCandidateQueue = useCallback(async (pc: RTCPeerConnection) => {
    remoteDescReadyRef.current = true;
    for (const c of iceCandidateQueueRef.current) {
      await pc.addIceCandidate(c).catch(() => {});
    }
    iceCandidateQueueRef.current = [];
  }, []);

  // ── F6: Fetch ICE servers from backend (TURN + STUN) ─────────────────────

  const fetchIceServers = useCallback(async (): Promise<RTCIceServer[]> => {
    try {
      const { data } = await axiosInstance.get<{ iceServers: RTCIceServer[] }>("/turn/credentials");
      return data.iceServers;
    } catch {
      return FALLBACK_ICE_SERVERS;
    }
  }, []);

  // ── Teardown ──────────────────────────────────────────────────────────────

  const cleanup = useCallback(() => {
    pendingAcceptRef.current       = false;
    iceCandidateQueueRef.current   = [];
    remoteDescReadyRef.current     = false;

    stopSpeakingIndicator();

    if (pcRef.current) {
      pcRef.current.onicecandidate          = null;
      pcRef.current.ontrack                 = null;
      pcRef.current.onconnectionstatechange = null;
      pcRef.current.oniceconnectionstatechange = null;
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
    setIsPttMode(false);
  }, [stopSpeakingIndicator]);

  // ── RTCPeerConnection factory ─────────────────────────────────────────────

  const buildPc = useCallback((iceServers: RTCIceServer[]): RTCPeerConnection => {
    const pc = new RTCPeerConnection({ iceServers });

    pc.onicecandidate = ({ candidate }) => {
      if (candidate && socketRef.current) {
        socketRef.current.emit("voice:ice-candidate", {
          gameId: gameIdRef.current,
          candidate: candidate.toJSON(),
        });
      }
    };

    // F2: explicit .play() required on iOS Safari + Chrome Mobile
    pc.ontrack = ({ streams }) => {
      if (remoteAudioRef.current && streams[0]) {
        remoteAudioRef.current.srcObject = streams[0];
        remoteAudioRef.current.play().catch(() => {});
        startSpeakingIndicator(streams[0]);
      }
    };

    // Shared handlers — F3: both events cover Firefox + all modern browsers
    const onConnected = () => {
      setCallState("connected");
      setError(null);
    };

    const onFailed = () => {
      // F8: if we were connected, attempt auto-reconnect instead of hard fail
      if (callStateRef.current === "connected") {
        cleanup();
        setError("Connection dropped — reconnecting…");
        socketRef.current?.emit("voice:ring", { gameId: gameIdRef.current });
        setCallState("ringing");
      } else {
        setError("Connection failed. Try calling again.");
        cleanup();
      }
    };

    // F3: connectionstatechange (Chrome, Safari, Edge) + iceconnectionstatechange (Firefox)
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected") onConnected();
      else if (pc.connectionState === "failed") onFailed();
    };

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === "connected" || pc.iceConnectionState === "completed") onConnected();
      else if (pc.iceConnectionState === "failed") onFailed();
    };

    return pc;
  }, [cleanup, startSpeakingIndicator]);

  // ── Public API ────────────────────────────────────────────────────────────

  const startCall = useCallback(() => {
    if (!socket || callStateRef.current !== "idle") return;
    setError(null);
    setCallState("ringing");
    socket.emit("voice:ring", { gameId });
  }, [socket, gameId]);

  const acceptCall = useCallback(async () => {
    if (!socket || callStateRef.current !== "incoming") return;
    setError(null);
    setCallState("calling");
    pendingAcceptRef.current = true;
    socket.emit("voice:accept", { gameId });
  }, [socket, gameId]);

  const declineCall = useCallback(() => {
    if (!socket) return;
    socket.emit("voice:decline", { gameId });
    setCallState("idle");
    setError(null);
  }, [socket, gameId]);

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

  /** F9: Toggle push-to-talk mode. Mutes mic immediately when enabling. */
  const togglePttMode = useCallback(() => {
    setIsPttMode((prev) => {
      const next = !prev;
      const track = localStreamRef.current?.getAudioTracks()[0];
      if (track) track.enabled = !next; // mute when PTT enabled, unmute when disabled
      setIsLocalMuted(next);
      return next;
    });
  }, []);

  // ── F9: PTT Space key handler ─────────────────────────────────────────────

  useEffect(() => {
    if (callState !== "connected") return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== "Space" || !isPttModeRef.current || e.repeat) return;
      e.preventDefault();
      const track = localStreamRef.current?.getAudioTracks()[0];
      if (track) { track.enabled = true; setIsLocalMuted(false); }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code !== "Space" || !isPttModeRef.current) return;
      const track = localStreamRef.current?.getAudioTracks()[0];
      if (track) { track.enabled = false; setIsLocalMuted(true); }
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [callState]);

  // ── Socket signaling listeners ────────────────────────────────────────────

  useEffect(() => {
    if (!socket) return;

    // Callee: opponent is calling
    const onRing = () => {
      if (callStateRef.current !== "idle") return;
      setError(null);
      setCallState("incoming");
    };

    // Caller: callee accepted — fetch ICE servers, get mic, create and send offer
    const onAccept = async () => {
      if (callStateRef.current !== "ringing") return;
      setCallState("calling");
      try {
        const iceServers = await fetchIceServers();   // F6
        const stream     = await getMic();             // F1
        localStreamRef.current = stream;
        const pc = buildPc(iceServers);
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
        setError(micErrorMessage(err));               // F5
      }
    };

    // Caller: callee declined
    const onDecline = () => {
      if (callStateRef.current !== "ringing") return;
      cleanup();
      setError("Call was declined.");
    };

    // Callee: receives offer — get mic, answer, drain buffered candidates
    const onOffer = async ({ sdp }: { sdp: RTCSessionDescriptionInit }) => {
      if (!pendingAcceptRef.current) return;
      pendingAcceptRef.current = false;
      try {
        const iceServers = await fetchIceServers();   // F6
        const stream     = await getMic();             // F1
        localStreamRef.current = stream;
        const pc = buildPc(iceServers);
        pcRef.current = pc;
        stream.getTracks().forEach((t) => pc.addTrack(t, stream));
        await pc.setRemoteDescription(sdp);
        await drainCandidateQueue(pc);                // F10: drain any buffered candidates
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socketRef.current?.emit("voice:answer", {
          gameId: gameIdRef.current,
          sdp: pc.localDescription,
        });
      } catch (err: any) {
        cleanup();
        setError(micErrorMessage(err));               // F5
      }
    };

    // Caller: receives answer — set remote description, drain buffered candidates
    const onAnswer = async ({ sdp }: { sdp: RTCSessionDescriptionInit }) => {
      const pc = pcRef.current;
      if (!pc) return;
      try {
        await pc.setRemoteDescription(sdp);
        await drainCandidateQueue(pc);                // F10
      } catch {
        // stale answer — ignore
      }
    };

    // F10: buffer candidates until setRemoteDescription completes
    const onIceCandidate = ({ candidate }: { candidate: RTCIceCandidateInit }) => {
      if (!candidate) return; // null = end-of-candidates signal, ignore
      if (!remoteDescReadyRef.current || !pcRef.current) {
        iceCandidateQueueRef.current.push(candidate);
      } else {
        pcRef.current.addIceCandidate(candidate).catch(() => {});
      }
    };

    const onHangup = () => cleanup();

    socket.on("voice:ring",          onRing);
    socket.on("voice:accept",        onAccept);
    socket.on("voice:decline",       onDecline);
    socket.on("voice:offer",         onOffer);
    socket.on("voice:answer",        onAnswer);
    socket.on("voice:ice-candidate", onIceCandidate);
    socket.on("voice:hangup",        onHangup);

    return () => {
      socket.off("voice:ring",          onRing);
      socket.off("voice:accept",        onAccept);
      socket.off("voice:decline",       onDecline);
      socket.off("voice:offer",         onOffer);
      socket.off("voice:answer",        onAnswer);
      socket.off("voice:ice-candidate", onIceCandidate);
      socket.off("voice:hangup",        onHangup);
    };
  }, [socket, buildPc, cleanup, drainCandidateQueue, fetchIceServers]);

  // Cleanup on gameId change or unmount
  useEffect(() => {
    return () => { endCall(); };
  }, [gameId]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    callState,
    isLocalMuted,
    isRemoteSpeaking,
    isPttMode,
    error,
    remoteAudioRef,
    startCall,
    acceptCall,
    declineCall,
    endCall,
    toggleMute,
    togglePttMode,
  };
}
