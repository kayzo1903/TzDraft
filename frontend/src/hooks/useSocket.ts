import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useAuthStore } from "@/lib/auth/auth-store";
import { getOrCreateGuestId } from "@/lib/auth/guest-id";

export function useSocket() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const { accessToken, isAuthenticated } = useAuthStore();

  useEffect(() => {
    // If authenticated, prefer store token but fall back to localStorage on reload.
    const storedToken =
      typeof window !== "undefined"
        ? localStorage.getItem("accessToken")
        : null;
    const token = isAuthenticated ? accessToken || storedToken : null;
    const guestId = typeof window !== "undefined" ? getOrCreateGuestId() : null;
    const authPayload =
      token || guestId
        ? {
            ...(token ? { token } : {}),
            ...(guestId ? { guestId } : {}),
          }
        : undefined;
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";
    const socketUrl = `${baseUrl.replace(/\/$/, "")}/games`;

    const newSocket = io(socketUrl, {
      auth: authPayload,
      withCredentials: true,
      // Force WebSocket — avoids 200-500 ms polling overhead when the
      // connection falls back to HTTP long-polling.
      transports: ["websocket"],
    });

    newSocket.on("connect", () => {
      console.log("Connected to WebSocket");
    });

    newSocket.on("disconnect", () => {
      console.log("Disconnected from WebSocket");
    });

    newSocket.on("connect_error", (error) => {
      console.error("WebSocket connection error:", error);
    });

    newSocket.io.on("error", (error) => {
      console.error("websocket error", error);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [accessToken, isAuthenticated]);

  return socket;
}
