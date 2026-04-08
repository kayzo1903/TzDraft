import axiosInstance from "@/lib/axios";

// ── Types ──────────────────────────────────────────────────────

export type TournamentFormat = "SINGLE_ELIMINATION" | "ROUND_ROBIN" | "SWISS" | "DOUBLE_ELIMINATION";
export type TournamentStyle = "BLITZ" | "RAPID" | "CLASSICAL" | "UNLIMITED";
export type TournamentStatus = "DRAFT" | "REGISTRATION" | "ACTIVE" | "COMPLETED" | "CANCELLED";
export type TournamentScope = "GLOBAL" | "COUNTRY" | "REGION";
export type PrizeCurrency = "TSH" | "USD";

export interface TournamentPrize {
  id: string;
  tournamentId: string;
  placement: number;
  amount: number;
  currency: PrizeCurrency;
  label: string | null;
}
export type MatchStatus = "PENDING" | "ACTIVE" | "COMPLETED" | "BYE";
export type MatchResult = "PLAYER1_WIN" | "PLAYER2_WIN" | "BYE";
export type MatchGameResult = "PLAYER1_WIN" | "PLAYER2_WIN" | "DRAW";
export type ParticipantStatus = "REGISTERED" | "ACTIVE" | "ELIMINATED" | "WITHDRAWN";
export type RoundStatus = "PENDING" | "ACTIVE" | "COMPLETED";

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
  minMatchmakingWins: number | null;
  minAiLevelBeaten: number | null;
  requiredAiLevelPlayed: number | null;
  registrationDeadline: string | null;
  scheduledStartAt: string;
  createdAt: string;
  hidden: boolean;
  roundDurationMinutes: number;
  currentRound: number;
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

export interface EligibilityCheck {
  key: string;
  passed: boolean;
  required: string | number | null;
  current: string | number | null;
}

export interface CreateTournamentInput {
  name: string;
  descriptionEn: string;
  descriptionSw: string;
  rulesEn?: string;
  rulesSw?: string;
  format: TournamentFormat;
  style: TournamentStyle;
  scope?: TournamentScope;
  country?: string;
  region?: string;
  maxPlayers: number;
  minPlayers?: number;
  scheduledStartAt: string;
  registrationDeadline?: string;
  minElo?: number;
  maxElo?: number;
  minMatchmakingWins?: number;
  minAiLevelBeaten?: number;
  requiredAiLevelPlayed?: number;
  roundDurationMinutes?: number;
  prizes?: { placement: number; amount: number; currency: PrizeCurrency; label?: string }[];
}

export interface UpdateTournamentInput {
  name?: string;
  descriptionEn?: string;
  descriptionSw?: string;
  rulesEn?: string | null;
  rulesSw?: string | null;
  style?: TournamentStyle;
  scope?: TournamentScope;
  country?: string | null;
  region?: string | null;
  maxPlayers?: number;
  minPlayers?: number;
  scheduledStartAt?: string;
  registrationDeadline?: string | null;
  roundDurationMinutes?: number;
  prizes?: { placement: number; amount: number; currency: PrizeCurrency; label?: string }[];
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
    const response = await axiosInstance.get("/tournaments", { params: query });
    return response.data;
  },

  async get(id: string): Promise<TournamentDetail> {
    const response = await axiosInstance.get(`/tournaments/${id}`);
    return response.data;
  },

  async register(id: string): Promise<TournamentParticipant> {
    const response = await axiosInstance.post(`/tournaments/${id}/register`);
    return response.data;
  },

  async withdraw(id: string): Promise<void> {
    await axiosInstance.delete(`/tournaments/${id}/register`);
  },

  // Admin
  async create(dto: CreateTournamentInput): Promise<Tournament> {
    const response = await axiosInstance.post("/tournaments", dto);
    return response.data;
  },

  async start(id: string): Promise<Tournament> {
    const response = await axiosInstance.post(`/tournaments/${id}/start`);
    return response.data;
  },

  async cancel(id: string): Promise<Tournament> {
    const response = await axiosInstance.post(`/tournaments/${id}/cancel`);
    return response.data;
  },

  async update(id: string, dto: UpdateTournamentInput): Promise<Tournament> {
    const response = await axiosInstance.patch(`/tournaments/${id}`, dto);
    return response.data;
  },

  async adminRemoveParticipant(tournamentId: string, userId: string): Promise<void> {
    await axiosInstance.delete(`/tournaments/${tournamentId}/participants/${userId}`);
  },

  async adminResolveMatch(
    tournamentId: string,
    matchId: string,
    result: "PLAYER1_WIN" | "PLAYER2_WIN"
  ): Promise<TournamentMatch> {
    const response = await axiosInstance.post(
      `/tournaments/${tournamentId}/matches/${matchId}/manual-result`,
      { result }
    );
    return response.data;
  },

  /** Admin-only list — includes hidden tournaments */
  async listAdmin(query?: ListTournamentsQuery): Promise<Tournament[]> {
    const response = await axiosInstance.get("/tournaments/admin/list", { params: query });
    return response.data;
  },

  async setVisibility(id: string, hidden: boolean): Promise<Tournament> {
    const response = await axiosInstance.patch(`/tournaments/${id}/visibility`, { hidden });
    return response.data;
  },

  async deleteTournament(id: string): Promise<void> {
    await axiosInstance.delete(`/tournaments/${id}`);
  },
};
