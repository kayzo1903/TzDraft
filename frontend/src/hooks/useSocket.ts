"use client";

import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useAuthStore } from "@/lib/auth/auth-store";

/**
 * A single shared socket instance for the entire app lifetime.
 * Authentication is handled via httpOnly cookies sent automatically on the
 * WebSocket upgrade handshake (withCredentials: true).
 */
let sharedSocket: Socket | null = null;

function getOrCreateSocket(): Socket {
  if (sharedSocket) return sharedSocket;

  const apiBase = process.env.NEXT_PUBLIC_API_URL || "";

  sharedSocket = io(`${apiBase}/games`, {
    // Cookies (including httpOnly accessToken) are sent on the HTTP upgrade
    withCredentials: true,
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 10000,
  });

  sharedSocket.on("connect", () =>
    console.log("[Socket] Connected:", sharedSocket?.id),
  );
  sharedSocket.on("disconnect", (reason) =>
    console.log("[Socket] Disconnected:", reason),
  );
  sharedSocket.on("connect_error", (err) => {
    console.error("[Socket] Connection error:", err.message);
    const msg = (err.message || "").toLowerCase();
    if (
      msg === "invalid token" ||
      msg === "no token" ||
      msg === "unauthorized"
    ) {
      sharedSocket?.disconnect();
      sharedSocket = null;
    }
  });

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
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    if (!isAuthenticated) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSocket(null);
      return;
    }

    const s = getOrCreateSocket();
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
  }, [isAuthenticated]);

  return { socket, connected, reconnecting };
}
