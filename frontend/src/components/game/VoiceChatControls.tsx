"use client";

import { Mic, MicOff, Phone, PhoneOff } from "lucide-react";
import clsx from "clsx";
import { useVoiceChat } from "@/hooks/useVoiceChat";

export function VoiceChatControls({ gameId }: { gameId: string }) {
  const {
    callState,
    isLocalMuted,
    error,
    remoteAudioRef,
    startCall,
    endCall,
    toggleMute,
  } = useVoiceChat(gameId);

  return (
    <div className="rounded-xl border border-neutral-700/60 bg-neutral-900/60 p-3 flex flex-col gap-2">
      {/* Header row */}
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] uppercase tracking-widest text-neutral-500 font-semibold flex-1">
          Voice Chat
        </span>
        {callState === "calling" && (
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
        )}
        {callState === "connected" && (
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
        )}
        {callState === "failed" && (
          <span className="w-2 h-2 rounded-full bg-rose-400" />
        )}
      </div>

      {/* Error message */}
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

      {/* calling — waiting for peer */}
      {callState === "calling" && (
        <p className="text-center text-xs text-neutral-400">Connecting…</p>
      )}

      {/* connected — mute + hang-up */}
      {callState === "connected" && (
        <div className="flex gap-2">
          <button
            onClick={toggleMute}
            title={isLocalMuted ? "Unmute" : "Mute"}
            className={clsx(
              "flex-1 flex items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-xs font-semibold transition",
              isLocalMuted
                ? "border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20"
                : "border-neutral-600 bg-neutral-800 text-neutral-300 hover:bg-neutral-700",
            )}
          >
            {isLocalMuted ? (
              <>
                <MicOff className="w-3.5 h-3.5" />
                Unmute
              </>
            ) : (
              <>
                <Mic className="w-3.5 h-3.5" />
                Mute
              </>
            )}
          </button>
          <button
            onClick={endCall}
            title="End call"
            className="flex items-center justify-center gap-1.5 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-500/20 transition"
          >
            <PhoneOff className="w-3.5 h-3.5" />
          </button>
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
