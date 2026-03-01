"use client";

import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";

/**
 * A single shared socket instance for the entire app lifetime.
 * Creating multiple instances causes duplicate events, missed rooms, and
 * auth failures on reconnect.
 */
let sharedSocket: Socket | null = null;
let currentToken: string | null = null;

function getOrCreateSocket(token: string): Socket {
  // Recreate if token changed (user switch / refresh)
  if (sharedSocket && currentToken !== token) {
    sharedSocket.disconnect();
    sharedSocket = null;
  }

  if (!sharedSocket) {
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";

    sharedSocket = io(`${apiBase}/games`, {
      // handshake.auth is where socket.io actually places auth data
      auth: { token },
      // also send as header for belt-and-suspenders
      extraHeaders: { Authorization: `Bearer ${token}` },
      // prefer WebSocket, fall back to long-polling when WebSocket is blocked
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
    });

    currentToken = token;

    sharedSocket.on("connect", () =>
      console.log("[Socket] Connected:", sharedSocket?.id),
    );
    sharedSocket.on("disconnect", (reason) =>
      console.log("[Socket] Disconnected:", reason),
    );
    sharedSocket.on("connect_error", (err) =>
      console.error("[Socket] Connection error:", err.message),
    );
  }

  return sharedSocket;
}

export interface UseSocketResult {
  socket: Socket | null;
  connected: boolean;
  reconnecting: boolean;
}

export function useSocket(): UseSocketResult {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);

  useEffect(() => {
    // Read token from localStorage directly — always fresh, even after page reload
    const token =
      localStorage.getItem("accessToken") ??
      // fallback: read from Zustand persisted store key
      (() => {
        try {
          const raw = localStorage.getItem("auth-storage");
          if (!raw) return null;
          return (
            (JSON.parse(raw) as { state?: { accessToken?: string } })?.state
              ?.accessToken ?? null
          );
        } catch {
          return null;
        }
      })();

    if (!token) {
      setSocket(null);
      return;
    }

    const s = getOrCreateSocket(token);
    setSocket(s);
    setConnected(s.connected);

    const onConnect = () => {
      setConnected(true);
      setReconnecting(false);
    };
    const onDisconnect = () => {
      setConnected(false);
    };
    const onReconnectAttempt = () => {
      setReconnecting(true);
    };
    const onReconnect = () => {
      setReconnecting(false);
    };

    s.on("connect", onConnect);
    s.on("disconnect", onDisconnect);
    s.io.on("reconnect_attempt", onReconnectAttempt);
    s.io.on("reconnect", onReconnect);

    return () => {
      s.off("connect", onConnect);
      s.off("disconnect", onDisconnect);
      s.io.off("reconnect_attempt", onReconnectAttempt);
      s.io.off("reconnect", onReconnect);
    };

    // No socket cleanup: we keep the shared socket alive across page navigations.
    // It gets destroyed only when the token changes.
  }, []);

  return { socket, connected, reconnecting };
}
