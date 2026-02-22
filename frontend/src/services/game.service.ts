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

  async getGameClock(id: string) {
    const response = await axiosInstance.get(`/games/${id}/clock`);
    return response.data;
  },

  async resignGame(id: string) {
    const response = await axiosInstance.post(`/games/${id}/moves/resign`);
    return response.data;
  },

  async abortGame(id: string) {
    const response = await axiosInstance.post(`/games/${id}/moves/abort`);
    return response.data;
  },
};
