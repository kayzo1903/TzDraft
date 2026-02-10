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
};
