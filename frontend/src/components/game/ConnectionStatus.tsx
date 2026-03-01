"use client";

import { Loader2, WifiOff } from "lucide-react";

interface ConnectionStatusProps {
  connected: boolean;
  reconnecting: boolean;
}

/**
 * Small fixed banner shown at the top of the screen when the WebSocket
 * connection is lost or actively reconnecting.
 * Renders nothing when the socket is connected.
 */
export function ConnectionStatus({
  connected,
  reconnecting,
}: ConnectionStatusProps) {
  if (connected) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium shadow-lg bg-zinc-900 text-white border border-zinc-700">
      {reconnecting ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin text-yellow-400" />
          <span>Reconnecting…</span>
        </>
      ) : (
        <>
          <WifiOff className="w-4 h-4 text-red-400" />
          <span>Connection lost</span>
        </>
      )}
    </div>
  );
}
