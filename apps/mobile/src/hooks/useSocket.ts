import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useAuthStore } from "../auth/auth-store";
import { API_URL } from "../lib/api";

/**
 * Mobile socket singleton — uses handshake.auth.token instead of cookies
 * because React Native has no httpOnly cookie jar.
 */
let sharedSocket: Socket | null = null;
let sharedToken: string | null = null;

function getOrCreateSocket(token: string): Socket {
  // Re-use the socket if the token hasn't changed
  if (sharedSocket && sharedToken === token) return sharedSocket;

  // Token changed or socket was dropped — disconnect the old one
  if (sharedSocket) {
    sharedSocket.disconnect();
    sharedSocket = null;
  }

  sharedToken = token;

  sharedSocket = io(`${API_URL}/games`, {
    auth: { token },
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
      sharedToken = null;
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
  const token = useAuthStore((s) => s.token);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    if (!isAuthenticated || !token) {
      if (sharedSocket) {
        sharedSocket.disconnect();
        sharedSocket = null;
        sharedToken = null;
      }
      setSocket(null);
      setConnected(false);
      return;
    }

    const s = getOrCreateSocket(token);
    setSocket(s);
    setConnected(s.connected);

    const onConnect = () => {
      setConnected(true);
      setReconnecting(false);
    };
    const onDisconnect = () => setConnected(false);
    const onReconnectAttempt = () => setReconnecting(true);
    const onReconnect = () => setReconnecting(false);

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
  }, [isAuthenticated, token]);

  return { socket, connected, reconnecting };
}
