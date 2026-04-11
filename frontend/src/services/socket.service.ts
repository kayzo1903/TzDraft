import { io, Socket } from "socket.io-client";
import { refreshAccessToken } from "@/lib/axios";

class SocketService {
  private socket: Socket | null = null;

  public connect(url: string = "http://localhost:3000/games"): Socket {
    if (this.socket) {
      return this.socket;
    }

    this.socket = io(url, {
      transports: ["websocket"],
      autoConnect: true,
    });

    this.socket.on("connect", () => {
      console.log("Socket connected:", this.socket?.id);
    });

    this.socket.on("disconnect", () => {
      console.log("Socket disconnected");
    });

    this.socket.on("connect_error", async (error) => {
      console.error("Socket connection error:", error.message);
      
      // If the handshake was rejected due to an expired token,
      // trigger the silent refresh and retry the connection.
      if (error.message === "Unauthorized") {
        try {
          await refreshAccessToken();
          this.socket?.connect(); // Retry with updated cookie
        } catch (refreshError) {
          console.error("Socket re-auth failed:", refreshError);
        }
      }
    });

    return this.socket;
  }

  public disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  public joinGame(gameId: string): void {
    if (this.socket) {
      // Must send the raw string — NOT { gameId }.
      // The NestJS gateway uses @MessageBody() gameId: string which expects
      // a plain string payload. Sending an object creates a room named
      // "[object Object]" and no events are ever delivered to that socket.
      this.socket.emit("joinGame", gameId);
    }
  }

  public onGameStateUpdated(callback: (gameState: unknown) => void): void {
    if (this.socket) {
      this.socket.on("gameStateUpdated", callback);
    }
  }

  public offGameStateUpdated(callback: (gameState: unknown) => void): void {
    if (this.socket) {
      this.socket.off("gameStateUpdated", callback);
    }
  }

  public getSocket(): Socket | null {
    return this.socket;
  }
}

export const socketService = new SocketService();
