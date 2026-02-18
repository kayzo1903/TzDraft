import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useAuthStore } from "@/lib/auth/auth-store";

export function useSocket() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const { accessToken, isAuthenticated } = useAuthStore();

  useEffect(() => {
    // If authenticated, prefer store token but fall back to localStorage on reload.
    const storedToken =
      typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
    const token = isAuthenticated ? accessToken || storedToken : null;
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002";
    const socketUrl = `${baseUrl.replace(/\/$/, "")}/games`;

    const newSocket = io(socketUrl, {
      auth: token ? { token } : undefined,
      withCredentials: true,
      transports: ["websocket", "polling"],
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
