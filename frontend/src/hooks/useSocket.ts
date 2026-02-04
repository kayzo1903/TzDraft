import { useEffect, useState } from "react";
import { socketService } from "@/services/socket.service";
import { Socket } from "socket.io-client";

export const useSocket = (gameId?: string) => {
  // Initialize socket once
  const [socket] = useState<Socket>(() => socketService.connect());
  const [isConnected, setIsConnected] = useState(socket.connected);

  useEffect(() => {
    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);

    // If we have a gameId, join the game room
    if (gameId) {
      if (socket.connected) {
        socketService.joinGame(gameId);
      } else {
        socket.once("connect", () => {
          socketService.joinGame(gameId);
        });
      }
    }

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
    };
  }, [gameId, socket]);

  return { socket, isConnected };
};
