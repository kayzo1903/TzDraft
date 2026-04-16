import api from "./api";

// ── Types ──────────────────────────────────────────────────────

export type TournamentFormat = "SINGLE_ELIMINATION" | "ROUND_ROBIN" | "SWISS" | "DOUBLE_ELIMINATION";
export type TournamentStyle = "BLITZ" | "RAPID" | "CLASSICAL" | "UNLIMITED";
export type TournamentStatus = "DRAFT" | "REGISTRATION" | "ACTIVE" | "COMPLETED" | "CANCELLED";
export type TournamentScope = "GLOBAL" | "COUNTRY" | "REGION";

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
  maxPlayers: number;
  minPlayers: number;
  registrationDeadline: string | null;
  scheduledStartAt: string;
  createdAt: string;
  currentRound: number;
  participantsCount?: number;
}

export interface ListTournamentsQuery {
  status?: TournamentStatus;
}

// ── Service ────────────────────────────────────────────────────

export const tournamentService = {
  async list(query?: ListTournamentsQuery): Promise<Tournament[]> {
    const response = await api.get("/tournaments", { params: query });
    return response.data;
  },

  async get(id: string): Promise<any> {
    const response = await api.get(`/tournaments/${id}`);
    return response.data;
  },
};
