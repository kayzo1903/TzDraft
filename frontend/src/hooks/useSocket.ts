import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useAuthStore } from "@/lib/auth/auth-store";

export function useSocket() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const { accessToken, isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated || !accessToken) {
      // Close existing socket if user is not authenticated
      if (socket) {
        socket.close();
        setSocket(null);
      }
      return;
    }

    const newSocket = io(
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002",
      {
        auth: {
          token: accessToken,
        },
        extraHeaders: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    newSocket.on("connect", () => {
      console.log("Connected to WebSocket");
    });

    newSocket.on("disconnect", () => {
      console.log("Disconnected from WebSocket");
    });

    newSocket.on("connect_error", (error) => {
      console.error("WebSocket connection error:", error);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [accessToken, isAuthenticated]);

  return socket;
}
