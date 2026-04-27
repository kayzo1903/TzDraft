import axiosInstance from "@/lib/axios";

export interface CreatePvEGameDto {
  playerId: string;
  playerColor: "WHITE" | "BLACK";
  playerElo: number;
  aiLevel: number;
  initialTimeMs: number;
}

export const gameService = {
  async createPvEGame(data: CreatePvEGameDto) {
    const response = await axiosInstance.post("/games/pve", data);
    return response.data;
  },

  async getGame(id: string) {
    const response = await axiosInstance.get(`/games/${id}`);
    return response.data;
  },

  async createInvite(data: { color: string; timeMs: number }) {
    const response = await axiosInstance.post("/games/invite", data);
    return response.data;
  },

  async joinInvite(code: string) {
    const response = await axiosInstance.post(`/games/invite/${code}/join`);
    return response.data;
  },

  async startGame(gameId: string) {
    const response = await axiosInstance.post(`/games/${gameId}/start`);
    return response.data;
  },

  async makeMove(gameId: string, from: number, to: number) {
    const response = await axiosInstance.post(`/games/${gameId}/moves`, {
      from,
      to,
    });
    return response.data;
  },

  async getLegalMoves(gameId: string) {
    const response = await axiosInstance.get(`/games/${gameId}/moves/legal`);
    return response.data;
  },

  async resign(gameId: string) {
    const response = await axiosInstance.post(`/games/${gameId}/resign`);
    return response.data;
  },

  async offerDraw(gameId: string) {
    const response = await axiosInstance.post(`/games/${gameId}/draw`);
    return response.data;
  },

  async abort(gameId: string) {
    const response = await axiosInstance.post(`/games/${gameId}/abort`);
    return response.data;
  },

  async joinQueue(timeMs: number, socketId: string) {
    const response = await axiosInstance.post("/games/queue/join", { timeMs, socketId });
    return response.data as {
      success: boolean;
      data: { status: "waiting" | "matched"; gameId?: string };
    };
  },

  async cancelQueue() {
    await axiosInstance.post("/games/queue/cancel");
  },

  async getActiveGame(): Promise<{ id: string; gameType: string } | null> {
    const response = await axiosInstance.get("/games/active");
    return response.data.data;
  },
};
