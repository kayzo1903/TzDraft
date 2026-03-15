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
export type ConnectionQuality = "unknown" | "poor" | "good" | "excellent";

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
  connectionQuality: ConnectionQuality;
  audioDevices: MediaDeviceInfo[];
  selectedDeviceId: string | null;
  remoteVolume: number;
  error: string | null;
  remoteAudioRef: React.RefObject<HTMLAudioElement | null>;
  startCall: () => void;
  acceptCall: () => Promise<void>;
  declineCall: () => void;
  endCall: () => void;
  toggleMute: () => void;
  togglePttMode: () => void;
  setAudioDevice: (deviceId: string) => Promise<void>;
  setRemoteVolume: (vol: number) => void;
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
async function getMic(deviceId?: string | null): Promise<MediaStream> {
  const preferred: MediaTrackConstraints = { echoCancellation: true, noiseSuppression: true, autoGainControl: true };
  if (deviceId) preferred.deviceId = { exact: deviceId };
  try {
    return await navigator.mediaDevices.getUserMedia({ audio: preferred });
  } catch (e: any) {
    if (e?.name === "OverconstrainedError") {
      return await navigator.mediaDevices.getUserMedia({ audio: deviceId ? { deviceId: { exact: deviceId } } : true });
    }
    throw e;
  }
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useVoiceChat(gameId: string): UseVoiceChatResult {
  const { socket } = useSocket();

  const [callState, setCallState]                 = useState<CallState>("idle");
  const [isLocalMuted, setIsLocalMuted]           = useState(false);
  const [isRemoteSpeaking, setIsRemoteSpeaking]   = useState(false);
  const [isPttMode, setIsPttMode]                 = useState(false);
  const [connectionQuality, setConnectionQuality] = useState<ConnectionQuality>("unknown");
  const [audioDevices, setAudioDevices]           = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId]   = useState<string | null>(null);
  const [remoteVolume, setRemoteVolumeState]       = useState(1);
  const [error, setError]                         = useState<string | null>(null);

  const pcRef          = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);

  // F7: speaking indicator
  const audioCtxRef = useRef<AudioContext | null>(null);
  const rafRef      = useRef<number | null>(null);

  // F10: ICE candidate buffering
  const iceCandidateQueueRef = useRef<RTCIceCandidateInit[]>([]);
  const remoteDescReadyRef   = useRef(false);

  // Phase 3: quality polling
  const qualityIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Stable refs for values used inside socket callbacks
  const callStateRef        = useRef<CallState>("idle");
  const socketRef           = useRef(socket);
  const gameIdRef           = useRef(gameId);
  const isPttModeRef        = useRef(false);
  const pendingAcceptRef    = useRef(false);
  const selectedDeviceIdRef = useRef<string | null>(null);
  const remoteVolumeRef     = useRef(1);

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

  // ── Phase 3: Audio device loading ────────────────────────────────────────

  const loadAudioDevices = useCallback(async () => {
    try {
      const all = await navigator.mediaDevices.enumerateDevices();
      setAudioDevices(all.filter((d) => d.kind === "audioinput"));
    } catch {
      // permissions not yet granted — will reload after getMic() succeeds
    }
  }, []);

  // ── Phase 3: Connection quality polling ──────────────────────────────────

  const startQualityPolling = useCallback((pc: RTCPeerConnection) => {
    qualityIntervalRef.current = setInterval(async () => {
      try {
        const stats = await pc.getStats();
        let rtt: number | null = null;
        stats.forEach((report) => {
          if (
            report.type === "candidate-pair" &&
            report.state === "succeeded" &&
            typeof report.currentRoundTripTime === "number"
          ) {
            rtt = report.currentRoundTripTime * 1000; // seconds → ms
          }
        });
        if (rtt === null)   setConnectionQuality("unknown");
        else if (rtt < 100) setConnectionQuality("excellent");
        else if (rtt < 300) setConnectionQuality("good");
        else                setConnectionQuality("poor");
      } catch {
        setConnectionQuality("unknown");
      }
    }, 3000);
  }, []);

  const stopQualityPolling = useCallback(() => {
    if (qualityIntervalRef.current !== null) {
      clearInterval(qualityIntervalRef.current);
      qualityIntervalRef.current = null;
    }
    setConnectionQuality("unknown");
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
    pendingAcceptRef.current     = false;
    iceCandidateQueueRef.current = [];
    remoteDescReadyRef.current   = false;

    stopSpeakingIndicator();
    stopQualityPolling();

    if (pcRef.current) {
      pcRef.current.onicecandidate            = null;
      pcRef.current.ontrack                   = null;
      pcRef.current.onconnectionstatechange   = null;
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
  }, [stopSpeakingIndicator, stopQualityPolling]);

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
        remoteAudioRef.current.volume = remoteVolumeRef.current;
        remoteAudioRef.current.play().catch(() => {});
        startSpeakingIndicator(streams[0]);
      }
    };

    const onConnected = () => {
      setCallState("connected");
      setError(null);
      startQualityPolling(pc);
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
  }, [cleanup, startSpeakingIndicator, startQualityPolling]);

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
      if (track) track.enabled = !next;
      setIsLocalMuted(next);
      return next;
    });
  }, []);

  /** Phase 3: Switch active microphone. Replaces track mid-call if connected. */
  const setAudioDevice = useCallback(async (deviceId: string) => {
    selectedDeviceIdRef.current = deviceId;
    setSelectedDeviceId(deviceId);
    if (callStateRef.current !== "connected" || !pcRef.current) return;
    try {
      const newStream = await getMic(deviceId);
      const newTrack  = newStream.getAudioTracks()[0];
      const sender    = pcRef.current.getSenders().find((s) => s.track?.kind === "audio");
      if (sender) await sender.replaceTrack(newTrack);
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      localStreamRef.current = newStream;
    } catch {
      // device switch failed — keep current mic
    }
  }, []);

  /** Phase 3: Remote volume control (0–1). Applied to <audio> element directly. */
  const setRemoteVolume = useCallback((vol: number) => {
    const clamped = Math.max(0, Math.min(1, vol));
    remoteVolumeRef.current = clamped;
    setRemoteVolumeState(clamped);
    if (remoteAudioRef.current) remoteAudioRef.current.volume = clamped;
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

  // ── Phase 3: Load audio devices on mount + react to device plug/unplug ───

  useEffect(() => {
    loadAudioDevices();
    navigator.mediaDevices.addEventListener("devicechange", loadAudioDevices);
    return () => {
      navigator.mediaDevices.removeEventListener("devicechange", loadAudioDevices);
    };
  }, [loadAudioDevices]);

  // ── Socket signaling listeners ────────────────────────────────────────────

  useEffect(() => {
    if (!socket) return;

    const onRing = () => {
      if (callStateRef.current !== "idle") return;
      setError(null);
      setCallState("incoming");
    };

    const onAccept = async () => {
      if (callStateRef.current !== "ringing") return;
      setCallState("calling");
      try {
        const iceServers = await fetchIceServers();
        const stream     = await getMic(selectedDeviceIdRef.current);
        localStreamRef.current = stream;
        loadAudioDevices(); // reload with labels now that permission is granted
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
        setError(micErrorMessage(err));
      }
    };

    const onDecline = () => {
      if (callStateRef.current !== "ringing") return;
      cleanup();
      setError("Call was declined.");
    };

    const onOffer = async ({ sdp }: { sdp: RTCSessionDescriptionInit }) => {
      if (!pendingAcceptRef.current) return;
      pendingAcceptRef.current = false;
      try {
        const iceServers = await fetchIceServers();
        const stream     = await getMic(selectedDeviceIdRef.current);
        localStreamRef.current = stream;
        loadAudioDevices(); // reload with labels now that permission is granted
        const pc = buildPc(iceServers);
        pcRef.current = pc;
        stream.getTracks().forEach((t) => pc.addTrack(t, stream));
        await pc.setRemoteDescription(sdp);
        await drainCandidateQueue(pc);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socketRef.current?.emit("voice:answer", {
          gameId: gameIdRef.current,
          sdp: pc.localDescription,
        });
      } catch (err: any) {
        cleanup();
        setError(micErrorMessage(err));
      }
    };

    const onAnswer = async ({ sdp }: { sdp: RTCSessionDescriptionInit }) => {
      const pc = pcRef.current;
      if (!pc) return;
      try {
        await pc.setRemoteDescription(sdp);
        await drainCandidateQueue(pc);
      } catch {
        // stale answer — ignore
      }
    };

    // F10: buffer candidates until setRemoteDescription completes
    const onIceCandidate = ({ candidate }: { candidate: RTCIceCandidateInit }) => {
      if (!candidate) return;
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
  }, [socket, buildPc, cleanup, drainCandidateQueue, fetchIceServers, loadAudioDevices]);

  // Cleanup on gameId change or unmount
  useEffect(() => {
    return () => { endCall(); };
  }, [gameId]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    callState,
    isLocalMuted,
    isRemoteSpeaking,
    isPttMode,
    connectionQuality,
    audioDevices,
    selectedDeviceId,
    remoteVolume,
    error,
    remoteAudioRef,
    startCall,
    acceptCall,
    declineCall,
    endCall,
    toggleMute,
    togglePttMode,
    setAudioDevice,
    setRemoteVolume,
  };
}
