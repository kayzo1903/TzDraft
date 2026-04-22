import api from "./api";

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
  },

  /**
   * Join the matchmaking queue.
   * Returns { status: "matched", gameId } if an opponent was found immediately,
   * or { status: "waiting" } — then listen for the "matchFound" WS event.
   *
   * 30s timeout: the server may spend several seconds on zombie cleanup.
   * If the HTTP response is dropped, the server still emits "matchFound"
   * via WebSocket to both players, so the lobby catches it either way.
   */
  async joinQueue(
    timeMs: number,
    socketId: string,
  ): Promise<{ status: "matched"; gameId: string } | { status: "waiting" }> {
    const response = await api.post(
      "/games/queue/join",
      { timeMs, socketId },
      { timeout: 30_000 },
    );
    return response.data.data;
  },

  /** Remove the current user from the matchmaking queue. */
  async cancelQueue(): Promise<void> {
    await api.post("/games/queue/cancel");
  },

  /** Get the current active game for the user, if any. */
  async getActiveGame(): Promise<{ id: string; gameType: string } | null> {
    const response = await api.get("/games/active");
    return response.data.data;
  },
};
