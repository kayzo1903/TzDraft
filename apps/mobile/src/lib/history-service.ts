import api from "./api";

// ── Types ──────────────────────────────────────────────────────

export interface GameHistoryItem {
  id: string;
  gameType: "AI" | "RANKED" | "CASUAL";
  result: "WIN" | "LOSS" | "DRAW";
  endReason: string | null;
  opponent: { id: string; displayName: string; username: string; elo: number | null } | null;
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

export interface HistoryFilters {
  result?: "WIN" | "LOSS" | "DRAW" | "ALL";
  gameType?: "AI" | "RANKED" | "CASUAL" | "ALL";
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string;
  username: string;
  avatarUrl?: string | null;
  country: string | null;
  region: string | null;
  rating: number;
  gamesPlayed: number;
}

export interface PublicPlayerProfile {
  id: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
  country: string | null;
  region: string | null;
  rating: number;
  gamesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
  rank: number | null;
  totalPlayers: number;
}

export interface LeaderboardFilters {
  skip?: number;
  take?: number;
  country?: string;
  region?: string;
  search?: string;
}

export interface ReplayMove {
  id: string;
  moveNumber: number;
  player: "WHITE" | "BLACK";
  fromSquare: number;
  toSquare: number;
  capturedSquares: number[];
  isPromotion: boolean;
  notation: string;
  createdAt: string;
}

export interface GameReplayData {
  game: {
    id: string;
    status: string;
    winner: string | null;
    endReason: string | null;
    whitePlayerId: string;
    blackPlayerId: string | null;
    gameType: string;
    createdAt: string;
    endedAt: string | null;
  };
  players: {
    white: { id: string; displayName: string } | null;
    black: { id: string; displayName: string } | null;
  };
  moves: ReplayMove[];
}

// ── Service ────────────────────────────────────────────────────

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

    const res = await api.get("/games/history", { params });
    return res.data.data;
  },

  async getStats(): Promise<PlayerStats> {
    const res = await api.get("/games/stats");
    return res.data.data;
  },

  async getReplay(gameId: string): Promise<GameReplayData> {
    const res = await api.get(`/games/${gameId}/replay`);
    return res.data.data;
  },

  async getLeaderboard(
    filters: LeaderboardFilters = {},
  ): Promise<{ items: LeaderboardEntry[]; total: number }> {
    const params: Record<string, string> = {
      skip: String(filters.skip ?? 0),
      take: String(filters.take ?? 50),
    };
    if (filters.country) params.country = filters.country;
    if (filters.region) params.region = filters.region;
    if (filters.search) params.search = filters.search;
    const res = await api.get("/auth/leaderboard", { params });
    return res.data.data;
  },

  async getPlayerProfile(userId: string): Promise<PublicPlayerProfile> {
    const res = await api.get(`/games/players/${userId}/profile`);
    return res.data.data;
  },

  async getPlayerGames(
    userId: string,
    skip = 0,
    take = 20,
  ): Promise<{ items: GameHistoryItem[]; total: number }> {
    const res = await api.get(`/games/players/${userId}/games`, {
      params: { skip: String(skip), take: String(take) },
    });
    return res.data.data;
  },
};
