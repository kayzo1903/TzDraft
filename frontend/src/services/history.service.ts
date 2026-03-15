import axiosInstance from "@/lib/axios";

export interface GameHistoryItem {
  id: string;
  gameType: "AI" | "RANKED" | "CASUAL";
  result: "WIN" | "LOSS" | "DRAW";
  endReason: string | null;
  opponent: { id: string; displayName: string; elo: number | null } | null;
  myElo: number | null;
  moveCount: number;
  durationMs: number | null;
  playedAt: string | null;
}

export interface PlayerStats {
  total: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
  byType: {
    AI: { total: number; wins: number; losses: number; draws: number };
    RANKED: { total: number; wins: number; losses: number; draws: number };
    CASUAL: { total: number; wins: number; losses: number; draws: number };
  };
}

export interface PlayerRank {
  global: number | null;
  country: number | null;
  region: number | null;
  totalPlayers: number;
}

export interface HistoryFilters {
  result?: "WIN" | "LOSS" | "DRAW" | "ALL";
  gameType?: "AI" | "RANKED" | "CASUAL" | "ALL";
}

export const historyService = {
  async getHistory(
    skip = 0,
    take = 20,
    filters: HistoryFilters = {},
  ): Promise<{ items: GameHistoryItem[]; total: number }> {
    const params: Record<string, string> = {
      skip: String(skip),
      take: String(take),
    };
    if (filters.result && filters.result !== "ALL") params.result = filters.result;
    if (filters.gameType && filters.gameType !== "ALL") params.gameType = filters.gameType;

    const res = await axiosInstance.get("/games/history", { params });
    return res.data.data;
  },

  async getStats(): Promise<PlayerStats> {
    const res = await axiosInstance.get("/games/stats");
    return res.data.data;
  },

  async getReplay(gameId: string) {
    const res = await axiosInstance.get(`/games/${gameId}/replay`);
    return res.data.data;
  },

  async getRank(): Promise<PlayerRank> {
    const res = await axiosInstance.get("/auth/rank");
    return res.data.data;
  },
};
