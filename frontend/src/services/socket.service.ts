import { io, Socket } from "socket.io-client";

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
      this.socket.emit("joinGame", { gameId });
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
