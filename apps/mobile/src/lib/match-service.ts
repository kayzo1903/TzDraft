import api from "./api";
import { PlayerColor } from "../shared/constants/game.constants";

export interface CreateInviteResponse {
  gameId: string;
  inviteCode: string;
}

export interface JoinInviteResponse {
  gameId: string;
}

export const matchService = {
  /**
   * Create an invite game
   * @param color The creator's color ('WHITE', 'BLACK', or 'RANDOM')
   * @param timeMs Initial time in milliseconds
   */
  async createInviteGame(color: string, timeMs: number): Promise<CreateInviteResponse> {
    const response = await api.post("/games/invite", {
      color,
      timeMs,
    });
    return response.data.data;
  },

  /**
   * Join an invite game via code
   * @param code The 8-character invite code
   */
  async joinInviteGame(code: string): Promise<JoinInviteResponse> {
    const response = await api.post(`/games/invite/${code}/join`);
    return response.data.data;
  },

  /**
   * Host starts the game
   * @param gameId The game ID
   */
  async startGame(gameId: string): Promise<void> {
    await api.post(`/games/${gameId}/start`);
  },

  /**
   * Get game details
   * @param gameId The game ID
   */
  async getGame(gameId: string): Promise<any> {
    const response = await api.get(`/games/${gameId}`);
    return response.data.data;
  }
};
