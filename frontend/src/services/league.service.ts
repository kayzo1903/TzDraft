import axiosInstance from "@/lib/axios";

export type LeagueStatus = "REGISTRATION" | "ACTIVE" | "COMPLETED" | "CANCELLED";
export type LeagueMatchStatus = "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "FORFEITED" | "VOIDED";
export type LeagueMatchResult = "PLAYER1_WIN" | "PLAYER2_WIN" | "DRAW" | "PENDING";
export type LeagueGameStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED" | "FORFEITED";
export type LeagueGameResult = "WHITE_WIN" | "BLACK_WIN" | "DRAW" | "PENDING";

export interface League {
  id: string;
  name: string;
  status: LeagueStatus;
  startDate: string | null;
  endDate: string | null;
  maxPlayers: number;
  currentRound: number;
  roundDurationDays: number;
  createdAt: string;
  participants: LeagueParticipant[];
}

export interface LeagueParticipant {
  id: string;
  leagueId: string;
  userId: string;
  status: "ACTIVE" | "INACTIVE" | "DISQUALIFIED" | "WITHDRAWN";
  matchPoints: number;
  matchesPlayed: number;
  matchWins: number;
  matchDraws: number;
  matchLosses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  user?: {
    id: string;
    username: string;
    rating: number;
  };
}

export interface LeagueGame {
  id: string;
  matchId: string;
  leagueId: string;
  gameNumber: number;
  whitePlayerId: string;
  blackPlayerId: string;
  status: LeagueGameStatus;
  result: LeagueGameResult;
  forfeitedBy: string | null;
  completedAt: string | null;
}

export interface LeagueMatch {
  id: string;
  leagueId: string;
  roundId: string;
  player1Id: string;
  player2Id: string;
  status: LeagueMatchStatus;
  result: LeagueMatchResult;
  player1Goals: number;
  player2Goals: number;
  deadline: string | null;
  forfeitedBy: string | null;
  voidReason: string | null;
  completedAt: string | null;
  games: LeagueGame[];
}

export interface LeagueRound {
  id: string;
  leagueId: string;
  roundNumber: number;
  status: "PENDING" | "ACTIVE" | "COMPLETED";
  deadline: string | null;
  matches: LeagueMatch[];
}

export const leagueService = {
  getAll: async (): Promise<League[]> => {
    const response = await axiosInstance.get(`/leagues`);
    return response.data;
  },

  createLeague: async (name: string, roundDurationDays: number): Promise<League> => {
    const response = await axiosInstance.post(`/leagues`, { name, roundDurationDays });
    return response.data;
  },

  joinLeague: async (id: string): Promise<LeagueParticipant> => {
    const response = await axiosInstance.post(`/leagues/${id}/join`);
    return response.data;
  },

  startLeague: async (id: string): Promise<void> => {
    await axiosInstance.post(`/leagues/${id}/start`);
  },

  getStandings: async (id: string): Promise<LeagueParticipant[]> => {
    const response = await axiosInstance.get(`/leagues/${id}/standings`);
    return response.data;
  },

  getSchedule: async (id: string): Promise<LeagueRound[]> => {
    const response = await axiosInstance.get(`/leagues/${id}/schedule`);
    return response.data;
  },

  getRound: async (id: string, n: number): Promise<LeagueRound> => {
    const response = await axiosInstance.get(`/leagues/${id}/rounds/${n}`);
    return response.data;
  },

  getMatch: async (leagueId: string, matchId: string): Promise<LeagueMatch> => {
    const response = await axiosInstance.get(`/leagues/${leagueId}/matches/${matchId}`);
    return response.data;
  },

  startGame: async (leagueId: string, matchId: string, gameNumber: number): Promise<LeagueGame> => {
    const response = await axiosInstance.post(`/leagues/${leagueId}/matches/${matchId}/start-game`, { gameNumber });
    return response.data;
  },

  claimForfeit: async (leagueId: string, matchId: string): Promise<void> => {
    await axiosInstance.post(`/leagues/${leagueId}/matches/${matchId}/forfeit`);
  },

  getMyMatches: async (leagueId: string): Promise<LeagueMatch[]> => {
    const response = await axiosInstance.get(`/leagues/${leagueId}/my-matches`);
    return response.data;
  },

  advanceRound: async (leagueId: string, roundNumber: number): Promise<void> => {
    await axiosInstance.patch(`/leagues/${leagueId}/rounds/${roundNumber}/advance`);
  },
};
