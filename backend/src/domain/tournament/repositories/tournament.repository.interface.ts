import {
  Tournament,
  TournamentStatus,
  TournamentFormat,
  TournamentScope,
} from '../entities/tournament.entity';
import { TournamentParticipant } from '../entities/tournament-participant.entity';
import { TournamentPrize } from '../entities/tournament-prize.entity';
import { TournamentRound } from '../entities/tournament-round.entity';
import { TournamentMatch } from '../entities/tournament-match.entity';
import { TournamentMatchGame } from '../entities/tournament-match-game.entity';

export interface TournamentFilters {
  status?: TournamentStatus;
  format?: TournamentFormat;
  scope?: TournamentScope;
  country?: string;
  region?: string;
  /** When true (admin view), hidden tournaments are included */
  adminView?: boolean;
}

export interface TournamentPrizeInput {
  placement: number;
  amount: number;
  currency: string;
  label?: string;
}

export interface TournamentScheduleUpdate {
  scheduledStartAt: Date;
  registrationDeadline: Date | null;
}

export interface TournamentAdminUpdate {
  name: string;
  descriptionEn: string;
  descriptionSw: string;
  rulesEn: string | null;
  rulesSw: string | null;
  style: string;
  scope: TournamentScope;
  country: string | null;
  region: string | null;
  maxPlayers: number;
  minPlayers: number;
  scheduledStartAt: Date;
  registrationDeadline: Date | null;
}

export interface ITournamentRepository {
  // Tournament
  create(tournament: Tournament): Promise<Tournament>;
  findById(id: string): Promise<Tournament | null>;
  findAll(filters?: TournamentFilters): Promise<Tournament[]>;
  update(tournament: Tournament): Promise<Tournament>;
  updateSchedule(
    id: string,
    schedule: TournamentScheduleUpdate,
  ): Promise<Tournament>;
  updateDetails(
    id: string,
    details: TournamentAdminUpdate,
  ): Promise<Tournament>;
  setPrizes(
    tournamentId: string,
    prizes: TournamentPrizeInput[],
  ): Promise<TournamentPrize[]>;
  setHidden(id: string, hidden: boolean): Promise<Tournament>;
  deleteTournament(id: string): Promise<void>;

  // Participants
  createParticipant(
    participant: TournamentParticipant,
  ): Promise<TournamentParticipant>;
  findParticipant(
    tournamentId: string,
    userId: string,
  ): Promise<TournamentParticipant | null>;
  findParticipantsByTournament(
    tournamentId: string,
  ): Promise<TournamentParticipant[]>;
  updateParticipant(
    participant: TournamentParticipant,
  ): Promise<TournamentParticipant>;
  deleteParticipant(tournamentId: string, userId: string): Promise<void>;
  countParticipants(tournamentId: string): Promise<number>;

  // Rounds
  createRound(round: TournamentRound): Promise<TournamentRound>;
  findRoundsByTournament(tournamentId: string): Promise<TournamentRound[]>;
  findRoundByNumber(
    tournamentId: string,
    roundNumber: number,
  ): Promise<TournamentRound | null>;
  updateRound(round: TournamentRound): Promise<TournamentRound>;

  // Matches
  createMatch(match: TournamentMatch): Promise<TournamentMatch>;
  findMatchById(id: string): Promise<TournamentMatch | null>;
  findMatchesByRound(roundId: string): Promise<TournamentMatch[]>;
  findMatchesByTournament(tournamentId: string): Promise<TournamentMatch[]>;
  updateMatch(match: TournamentMatch): Promise<TournamentMatch>;
  findMatchByCurrentGameId(gameId: string): Promise<TournamentMatch | null>;

  // Match games
  createMatchGame(matchGame: TournamentMatchGame): Promise<TournamentMatchGame>;
  findMatchGamesByMatch(matchId: string): Promise<TournamentMatchGame[]>;
  updateMatchGame(matchGame: TournamentMatchGame): Promise<TournamentMatchGame>;
}
