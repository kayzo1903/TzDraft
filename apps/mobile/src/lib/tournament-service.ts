import api from "./api";

// ── Types ──────────────────────────────────────────────────────

export type TournamentFormat = "SINGLE_ELIMINATION" | "ROUND_ROBIN" | "SWISS" | "DOUBLE_ELIMINATION";
export type TournamentStyle = "BLITZ" | "RAPID" | "CLASSICAL" | "UNLIMITED";
export type TournamentStatus = "DRAFT" | "REGISTRATION" | "ACTIVE" | "COMPLETED" | "CANCELLED";
export type TournamentScope = "GLOBAL" | "COUNTRY" | "REGION";
export type PrizeCurrency = "TSH" | "USD";
export type MatchStatus = "PENDING" | "ACTIVE" | "COMPLETED" | "BYE";
export type MatchResult = "PLAYER1_WIN" | "PLAYER2_WIN" | "BYE";
export type ParticipantStatus = "REGISTERED" | "ACTIVE" | "ELIMINATED" | "WITHDRAWN";
export type RoundStatus = "PENDING" | "ACTIVE" | "COMPLETED";

export interface TournamentPrize {
  id: string;
  tournamentId: string;
  placement: number;
  amount: number;
  currency: PrizeCurrency;
  label: string | null;
}

export interface Tournament {
  id: string;
  name: string;
  descriptionEn: string;
  descriptionSw: string;
  rulesEn: string | null;
  rulesSw: string | null;
  format: TournamentFormat;
  style: TournamentStyle;
  status: TournamentStatus;
  scope: TournamentScope;
  country: string | null;
  region: string | null;
  maxPlayers: number;
  minPlayers: number;
  minElo: number | null;
  maxElo: number | null;
  registrationDeadline: string | null;
  scheduledStartAt: string;
  createdAt: string;
  currentRound: number;
  roundDurationMinutes: number;
  participantsCount?: number;
  prizes: TournamentPrize[];
}

export interface TournamentParticipant {
  id: string;
  tournamentId: string;
  userId: string;
  displayName: string;
  username: string;
  seed: number | null;
  eloAtSignup: number;
  status: ParticipantStatus;
  matchWins: number;
  matchLosses: number;
  totalGamePoints: number;
  registeredAt: string;
}

export interface TournamentRound {
  id: string;
  tournamentId: string;
  roundNumber: number;
  status: RoundStatus;
  startedAt: string | null;
  completedAt: string | null;
}

export interface TournamentMatch {
  id: string;
  roundId: string;
  tournamentId: string;
  player1Id: string | null;
  player2Id: string | null;
  status: MatchStatus;
  result: MatchResult | null;
  player1Wins: number;
  player2Wins: number;
  player1GamePoints: number;
  player2GamePoints: number;
  gamesPlayed: number;
  currentGameId: string | null;
  startedAt: string | null;
  completedAt: string | null;
}

export interface TournamentDetail {
  tournament: Tournament;
  participants: TournamentParticipant[];
  rounds: TournamentRound[];
  matches: TournamentMatch[];
}

export interface ListTournamentsQuery {
  status?: TournamentStatus;
  format?: TournamentFormat;
  scope?: TournamentScope;
  country?: string;
  region?: string;
}

// ── Service ────────────────────────────────────────────────────

export const tournamentService = {
  async list(query?: ListTournamentsQuery): Promise<Tournament[]> {
    const response = await api.get("/tournaments", { params: query });
    return response.data;
  },

  async get(id: string): Promise<TournamentDetail> {
    const response = await api.get(`/tournaments/${id}`);
    return response.data;
  },

  async register(id: string): Promise<TournamentParticipant> {
    const response = await api.post(`/tournaments/${id}/register`);
    return response.data;
  },

  async withdraw(id: string): Promise<void> {
    await api.delete(`/tournaments/${id}/register`);
  },
};
