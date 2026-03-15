"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Phone, PhoneOff, PhoneIncoming, PhoneMissed, Volume2 } from "lucide-react";
import clsx from "clsx";
import { useVoiceChat, ConnectionQuality } from "@/hooks/useVoiceChat";

/** Seconds before an unanswered incoming call is auto-declined. */
const RING_TIMEOUT_SECS = 30;

function QualityDot({ quality }: { quality: ConnectionQuality }) {
  if (quality === "unknown") return null;
  return (
    <span
      title={`Connection: ${quality}`}
      className={clsx(
        "inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full",
        quality === "excellent" && "bg-emerald-500/15 text-emerald-400",
        quality === "good"      && "bg-amber-500/15 text-amber-400",
        quality === "poor"      && "bg-rose-500/15 text-rose-400",
      )}
    >
      <span className={clsx(
        "w-1.5 h-1.5 rounded-full",
        quality === "excellent" && "bg-emerald-400",
        quality === "good"      && "bg-amber-400",
        quality === "poor"      && "bg-rose-400",
      )} />
      {quality}
    </span>
  );
}

export function VoiceChatControls({ gameId }: { gameId: string }) {
  const {
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
  } = useVoiceChat(gameId);

  const [ringSecondsLeft, setRingSecondsLeft] = useState<number | null>(null);
  const ringIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (callState === "incoming") {
      setRingSecondsLeft(RING_TIMEOUT_SECS);
      ringIntervalRef.current = setInterval(() => {
        setRingSecondsLeft((prev) => {
          if (prev === null || prev <= 1) {
            clearInterval(ringIntervalRef.current!);
            ringIntervalRef.current = null;
            declineCall();
            return null;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (ringIntervalRef.current !== null) {
        clearInterval(ringIntervalRef.current);
        ringIntervalRef.current = null;
      }
      setRingSecondsLeft(null);
    }

    return () => {
      if (ringIntervalRef.current !== null) {
        clearInterval(ringIntervalRef.current);
        ringIntervalRef.current = null;
      }
    };
  }, [callState, declineCall]);

  return (
    <div
      className={clsx(
        "rounded-xl border bg-neutral-900/60 p-3 flex flex-col gap-2 transition-colors duration-300",
        callState === "connected" && isRemoteSpeaking
          ? "border-emerald-500/60"
          : "border-neutral-700/60",
      )}
    >
      {/* Header row */}
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] uppercase tracking-widest text-neutral-500 font-semibold flex-1">
          Voice Chat
        </span>
        {/* Connection quality badge */}
        {callState === "connected" && <QualityDot quality={connectionQuality} />}
        {/* State indicator dots */}
        {callState === "connected" && isRemoteSpeaking && (
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" title="Opponent is speaking" />
        )}
        {(callState === "ringing" || callState === "calling") && (
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
        )}
        {callState === "incoming" && (
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        )}
        {callState === "connected" && !isRemoteSpeaking && (
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
        )}
        {callState === "failed" && (
          <span className="w-2 h-2 rounded-full bg-rose-400" />
        )}
      </div>

      {/* Error / info message */}
      {error && (
        <p className="text-[11px] text-rose-400 leading-snug">{error}</p>
      )}

      {/* idle — show Call button */}
      {callState === "idle" && (
        <button
          onClick={startCall}
          className="w-full flex items-center justify-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/8 px-3 py-2 text-sm font-semibold text-emerald-300 hover:bg-emerald-500/15 transition"
        >
          <Phone className="w-4 h-4" />
          Call
        </button>
      )}

      {/* ringing — caller waiting */}
      {callState === "ringing" && (
        <div className="flex flex-col gap-1.5">
          <p className="text-center text-xs text-neutral-400">
            Calling… waiting for opponent
          </p>
          <button
            onClick={endCall}
            className="w-full flex items-center justify-center gap-2 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-500/20 transition"
          >
            <PhoneMissed className="w-3.5 h-3.5" />
            Cancel
          </button>
        </div>
      )}

      {/* incoming — accept / decline */}
      {callState === "incoming" && (
        <div className="flex flex-col gap-1.5">
          <p className="text-center text-xs text-emerald-300 font-semibold">
            <PhoneIncoming className="inline w-3.5 h-3.5 mr-1 mb-0.5 animate-bounce" />
            Incoming voice call
            {ringSecondsLeft !== null && (
              <span className="ml-1.5 text-neutral-400 font-normal">
                ({ringSecondsLeft}s)
              </span>
            )}
          </p>
          <div className="flex gap-2">
            <button
              onClick={acceptCall}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-2 py-2 text-xs font-bold text-emerald-300 hover:bg-emerald-500/25 transition"
            >
              <Phone className="w-3.5 h-3.5" />
              Accept
            </button>
            <button
              onClick={declineCall}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-rose-500/40 bg-rose-500/10 px-2 py-2 text-xs font-bold text-rose-300 hover:bg-rose-500/20 transition"
            >
              <PhoneOff className="w-3.5 h-3.5" />
              Decline
            </button>
          </div>
        </div>
      )}

      {/* calling — WebRTC negotiating */}
      {callState === "calling" && (
        <p className="text-center text-xs text-neutral-400">Connecting…</p>
      )}

      {/* connected — mute + PTT + hang-up + volume + device selector */}
      {callState === "connected" && (
        <div className="flex flex-col gap-1.5">
          <div className="flex gap-2">
            <button
              onClick={toggleMute}
              title={isPttMode ? "PTT active — hold Space to talk" : (isLocalMuted ? "Unmute" : "Mute")}
              disabled={isPttMode}
              className={clsx(
                "flex-1 flex items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-xs font-semibold transition",
                isPttMode
                  ? "border-neutral-700 bg-neutral-800/50 text-neutral-600 cursor-not-allowed"
                  : isLocalMuted
                    ? "border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20"
                    : "border-neutral-600 bg-neutral-800 text-neutral-300 hover:bg-neutral-700",
              )}
            >
              {isLocalMuted ? (
                <><MicOff className="w-3.5 h-3.5" /> Muted</>
              ) : (
                <><Mic className="w-3.5 h-3.5" /> Mute</>
              )}
            </button>
            <button
              onClick={endCall}
              title="End call"
              className="flex items-center justify-center rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-500/20 transition"
            >
              <PhoneOff className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Push-to-talk toggle */}
          <button
            onClick={togglePttMode}
            className={clsx(
              "w-full flex items-center justify-center gap-1.5 rounded-lg border px-2 py-1.5 text-[11px] font-semibold transition",
              isPttMode
                ? "border-violet-500/40 bg-violet-500/15 text-violet-300 hover:bg-violet-500/25"
                : "border-neutral-700/60 bg-neutral-800/40 text-neutral-500 hover:bg-neutral-700/40",
            )}
          >
            {isPttMode ? "PTT ON — Hold Space to talk" : "Push-to-talk: Off"}
          </button>

          {/* Volume slider */}
          <div className="flex items-center gap-2 px-0.5">
            <Volume2 className="w-3 h-3 text-neutral-500 shrink-0" />
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(remoteVolume * 100)}
              onChange={(e) => setRemoteVolume(Number(e.target.value) / 100)}
              className="flex-1 h-1 accent-emerald-500 cursor-pointer"
              title={`Opponent volume: ${Math.round(remoteVolume * 100)}%`}
            />
            <span className="text-[10px] text-neutral-600 w-6 text-right tabular-nums">
              {Math.round(remoteVolume * 100)}
            </span>
          </div>

          {/* Microphone selector — only shown when multiple devices available */}
          {audioDevices.length > 1 && (
            <select
              value={selectedDeviceId ?? ""}
              onChange={(e) => setAudioDevice(e.target.value)}
              className="w-full rounded-lg border border-neutral-700/60 bg-neutral-800/60 px-2 py-1.5 text-[11px] text-neutral-300 focus:outline-none focus:border-neutral-600"
            >
              <option value="" disabled>Select microphone</option>
              {audioDevices.map((d) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label || `Microphone ${d.deviceId.slice(0, 6)}`}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      {/* failed — retry */}
      {callState === "failed" && (
        <button
          onClick={startCall}
          className="w-full flex items-center justify-center gap-2 rounded-lg border border-neutral-600 bg-neutral-800 px-3 py-2 text-xs font-semibold text-neutral-300 hover:bg-neutral-700 transition"
        >
          Retry
        </button>
      )}

      {/* Hidden audio element — plays the remote peer's stream */}
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio
        ref={remoteAudioRef as React.RefObject<HTMLAudioElement>}
        autoPlay
        playsInline
        className="hidden"
      />
    </div>
  );
}
