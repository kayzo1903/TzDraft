import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma/prisma.service';
import {
  ITournamentRepository,
  TournamentAdminUpdate,
  TournamentFilters,
  TournamentScheduleUpdate,
} from '../../domain/tournament/repositories/tournament.repository.interface';
import {
  Tournament,
  TournamentFormat,
  TournamentStyle,
  TournamentStatus,
  TournamentScope,
} from '../../domain/tournament/entities/tournament.entity';
import {
  TournamentParticipant,
  ParticipantStatus,
} from '../../domain/tournament/entities/tournament-participant.entity';
import {
  TournamentRound,
  RoundStatus,
} from '../../domain/tournament/entities/tournament-round.entity';
import {
  TournamentMatch,
  MatchStatus,
  MatchResult,
  MatchGameResult,
} from '../../domain/tournament/entities/tournament-match.entity';
import { TournamentMatchGame } from '../../domain/tournament/entities/tournament-match-game.entity';
import type { Prisma } from '@prisma/client';

@Injectable()
export class PrismaTournamentRepository implements ITournamentRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ── Tournament ──────────────────────────────────────────────

  async create(tournament: Tournament): Promise<Tournament> {
    const row = await this.prisma.tournament.create({
      data: this.toTournamentData(tournament),
    });
    return this.toDomainTournament(row);
  }

  async findById(id: string): Promise<Tournament | null> {
    const row = await this.prisma.tournament.findUnique({ where: { id } });
    return row ? this.toDomainTournament(row) : null;
  }

  async findAll(filters?: TournamentFilters): Promise<Tournament[]> {
    const where: Prisma.TournamentWhereInput = {};
    if (filters?.status) where.status = filters.status as any;
    if (filters?.format) where.format = filters.format as any;
    if (filters?.scope) where.scope = filters.scope as any;
    if (filters?.country) where.country = filters.country;
    if (filters?.region) where.region = filters.region;
    const rows = await this.prisma.tournament.findMany({
      where,
      orderBy: { scheduledStartAt: 'asc' },
    });
    return rows.map((r) => this.toDomainTournament(r));
  }

  async update(tournament: Tournament): Promise<Tournament> {
    const row = await this.prisma.tournament.update({
      where: { id: tournament.id },
      data: { status: tournament.status as any, updatedAt: new Date() },
    });
    return this.toDomainTournament(row);
  }

  async updateSchedule(
    id: string,
    schedule: TournamentScheduleUpdate,
  ): Promise<Tournament> {
    const row = await this.prisma.tournament.update({
      where: { id },
      data: {
        scheduledStartAt: schedule.scheduledStartAt,
        registrationDeadline: schedule.registrationDeadline,
        updatedAt: new Date(),
      },
    });
    return this.toDomainTournament(row);
  }

  async updateDetails(
    id: string,
    details: TournamentAdminUpdate,
  ): Promise<Tournament> {
    const row = await this.prisma.tournament.update({
      where: { id },
      data: {
        name: details.name,
        descriptionEn: details.descriptionEn,
        descriptionSw: details.descriptionSw,
        rulesEn: details.rulesEn,
        rulesSw: details.rulesSw,
        style: details.style as any,
        scope: details.scope as any,
        country: details.country,
        region: details.region,
        maxPlayers: details.maxPlayers,
        minPlayers: details.minPlayers,
        scheduledStartAt: details.scheduledStartAt,
        registrationDeadline: details.registrationDeadline,
        updatedAt: new Date(),
      },
    });
    return this.toDomainTournament(row);
  }

  // ── Participants ─────────────────────────────────────────────

  async createParticipant(
    p: TournamentParticipant,
  ): Promise<TournamentParticipant> {
    const row = await this.prisma.tournamentParticipant.create({
      data: this.toParticipantData(p),
    });
    return this.toDomainParticipant(row);
  }

  async findParticipant(
    tournamentId: string,
    userId: string,
  ): Promise<TournamentParticipant | null> {
    const row = await this.prisma.tournamentParticipant.findUnique({
      where: { tournamentId_userId: { tournamentId, userId } },
    });
    return row ? this.toDomainParticipant(row) : null;
  }

  async findParticipantsByTournament(
    tournamentId: string,
  ): Promise<TournamentParticipant[]> {
    const rows = await this.prisma.tournamentParticipant.findMany({
      where: { tournamentId },
      orderBy: { seed: 'asc' },
    });
    return rows.map((r) => this.toDomainParticipant(r));
  }

  async updateParticipant(
    p: TournamentParticipant,
  ): Promise<TournamentParticipant> {
    const row = await this.prisma.tournamentParticipant.update({
      where: {
        tournamentId_userId: { tournamentId: p.tournamentId, userId: p.userId },
      },
      data: {
        seed: p.seed,
        status: p.status as any,
        matchWins: p.matchWins,
        matchLosses: p.matchLosses,
        totalGamePoints: p.totalGamePoints,
        tiebreakScore: p.tiebreakScore,
      },
    });
    return this.toDomainParticipant(row);
  }

  async deleteParticipant(tournamentId: string, userId: string): Promise<void> {
    await this.prisma.tournamentParticipant.delete({
      where: { tournamentId_userId: { tournamentId, userId } },
    });
  }

  async countParticipants(tournamentId: string): Promise<number> {
    return this.prisma.tournamentParticipant.count({ where: { tournamentId } });
  }

  // ── Rounds ───────────────────────────────────────────────────

  async createRound(round: TournamentRound): Promise<TournamentRound> {
    const row = await this.prisma.tournamentRound.create({
      data: this.toRoundData(round),
    });
    return this.toDomainRound(row);
  }

  async findRoundsByTournament(
    tournamentId: string,
  ): Promise<TournamentRound[]> {
    const rows = await this.prisma.tournamentRound.findMany({
      where: { tournamentId },
      orderBy: { roundNumber: 'asc' },
    });
    return rows.map((r) => this.toDomainRound(r));
  }

  async findRoundByNumber(
    tournamentId: string,
    roundNumber: number,
  ): Promise<TournamentRound | null> {
    const row = await this.prisma.tournamentRound.findUnique({
      where: { tournamentId_roundNumber: { tournamentId, roundNumber } },
    });
    return row ? this.toDomainRound(row) : null;
  }

  async updateRound(round: TournamentRound): Promise<TournamentRound> {
    const row = await this.prisma.tournamentRound.update({
      where: { id: round.id },
      data: {
        status: round.status as any,
        startedAt: round.startedAt,
        completedAt: round.completedAt,
      },
    });
    return this.toDomainRound(row);
  }

  // ── Matches ──────────────────────────────────────────────────

  async createMatch(match: TournamentMatch): Promise<TournamentMatch> {
    const row = await this.prisma.tournamentMatch.create({
      data: this.toMatchData(match),
    });
    return this.toDomainMatch(row);
  }

  async findMatchById(id: string): Promise<TournamentMatch | null> {
    const row = await this.prisma.tournamentMatch.findUnique({ where: { id } });
    return row ? this.toDomainMatch(row) : null;
  }

  async findMatchesByRound(roundId: string): Promise<TournamentMatch[]> {
    const rows = await this.prisma.tournamentMatch.findMany({
      where: { roundId },
    });
    return rows.map((r) => this.toDomainMatch(r));
  }

  async findMatchesByTournament(
    tournamentId: string,
  ): Promise<TournamentMatch[]> {
    const rows = await this.prisma.tournamentMatch.findMany({
      where: { tournamentId },
    });
    return rows.map((r) => this.toDomainMatch(r));
  }

  async updateMatch(match: TournamentMatch): Promise<TournamentMatch> {
    const row = await this.prisma.tournamentMatch.update({
      where: { id: match.id },
      data: {
        status: match.status as any,
        result: match.result as any,
        player1Wins: match.player1Wins,
        player2Wins: match.player2Wins,
        player1ConsecLoss: match.player1ConsecLoss,
        player2ConsecLoss: match.player2ConsecLoss,
        gamesPlayed: match.gamesPlayed,
        player1GamePoints: match.player1GamePoints,
        player2GamePoints: match.player2GamePoints,
        currentGameId: match.currentGameId,
        startedAt: match.startedAt,
        completedAt: match.completedAt,
      },
    });
    return this.toDomainMatch(row);
  }

  async findMatchByCurrentGameId(
    gameId: string,
  ): Promise<TournamentMatch | null> {
    const row = await this.prisma.tournamentMatch.findFirst({
      where: { currentGameId: gameId },
    });
    return row ? this.toDomainMatch(row) : null;
  }

  // ── Match games ──────────────────────────────────────────────

  async createMatchGame(mg: TournamentMatchGame): Promise<TournamentMatchGame> {
    const row = await this.prisma.tournamentMatchGame.create({
      data: {
        id: mg.id,
        matchId: mg.matchId,
        gameNumber: mg.gameNumber,
        isExtra: mg.isExtra,
      },
    });
    return this.toDomainMatchGame(row);
  }

  async findMatchGamesByMatch(matchId: string): Promise<TournamentMatchGame[]> {
    const rows = await this.prisma.tournamentMatchGame.findMany({
      where: { matchId },
      orderBy: { gameNumber: 'asc' },
    });
    return rows.map((r) => this.toDomainMatchGame(r));
  }

  async updateMatchGame(mg: TournamentMatchGame): Promise<TournamentMatchGame> {
    const row = await this.prisma.tournamentMatchGame.update({
      where: { id: mg.id },
      data: { result: mg.result as any },
    });
    return this.toDomainMatchGame(row);
  }

  // ── Domain mappers ───────────────────────────────────────────

  private toDomainTournament(row: any): Tournament {
    return new Tournament(
      row.id,
      row.name,
      row.descriptionEn,
      row.descriptionSw,
      row.format as TournamentFormat,
      row.style as TournamentStyle,
      row.status as TournamentStatus,
      row.scope as TournamentScope,
      row.maxPlayers,
      row.minPlayers,
      row.scheduledStartAt,
      row.createdById,
      row.createdAt,
      row.country,
      row.region,
      row.rulesEn,
      row.rulesSw,
      row.minElo,
      row.maxElo,
      row.minMatchmakingWins,
      row.minAiLevelBeaten,
      row.requiredAiLevelPlayed,
      row.registrationDeadline,
    );
  }

  private toDomainParticipant(row: any): TournamentParticipant {
    return new TournamentParticipant(
      row.id,
      row.tournamentId,
      row.userId,
      row.eloAtSignup,
      row.registeredAt,
      row.status as ParticipantStatus,
      row.seed,
      row.matchWins,
      row.matchLosses,
      row.totalGamePoints,
      row.tiebreakScore,
    );
  }

  private toDomainRound(row: any): TournamentRound {
    return new TournamentRound(
      row.id,
      row.tournamentId,
      row.roundNumber,
      row.status as RoundStatus,
      row.startedAt,
      row.completedAt,
    );
  }

  private toDomainMatch(row: any): TournamentMatch {
    return new TournamentMatch(
      row.id,
      row.roundId,
      row.tournamentId,
      row.status as MatchStatus,
      row.result as MatchResult | null,
      row.player1Id,
      row.player2Id,
      row.player1Wins,
      row.player2Wins,
      row.player1ConsecLoss,
      row.player2ConsecLoss,
      row.gamesPlayed,
      row.player1GamePoints,
      row.player2GamePoints,
      row.currentGameId,
      row.startedAt,
      row.completedAt,
    );
  }

  private toDomainMatchGame(row: any): TournamentMatchGame {
    return new TournamentMatchGame(
      row.id,
      row.matchId,
      row.gameNumber,
      row.isExtra,
      row.result as MatchGameResult | null,
    );
  }

  private toTournamentData(t: Tournament) {
    return {
      id: t.id,
      name: t.name,
      descriptionEn: t.descriptionEn,
      descriptionSw: t.descriptionSw,
      rulesEn: t.rulesEn,
      rulesSw: t.rulesSw,
      format: t.format as any,
      style: t.style as any,
      status: t.status as any,
      scope: t.scope as any,
      country: t.country,
      region: t.region,
      minElo: t.minElo,
      maxElo: t.maxElo,
      minMatchmakingWins: t.minMatchmakingWins,
      minAiLevelBeaten: t.minAiLevelBeaten,
      requiredAiLevelPlayed: t.requiredAiLevelPlayed,
      maxPlayers: t.maxPlayers,
      minPlayers: t.minPlayers,
      registrationDeadline: t.registrationDeadline,
      scheduledStartAt: t.scheduledStartAt,
      createdById: t.createdById,
    };
  }

  private toParticipantData(p: TournamentParticipant) {
    return {
      id: p.id,
      tournamentId: p.tournamentId,
      userId: p.userId,
      seed: p.seed,
      eloAtSignup: p.eloAtSignup,
      status: p.status as any,
      matchWins: p.matchWins,
      matchLosses: p.matchLosses,
      totalGamePoints: p.totalGamePoints,
      tiebreakScore: p.tiebreakScore,
    };
  }

  private toRoundData(r: TournamentRound) {
    return {
      id: r.id,
      tournamentId: r.tournamentId,
      roundNumber: r.roundNumber,
      status: r.status as any,
      startedAt: r.startedAt,
      completedAt: r.completedAt,
    };
  }

  private toMatchData(m: TournamentMatch) {
    return {
      id: m.id,
      roundId: m.roundId,
      tournamentId: m.tournamentId,
      player1Id: m.player1Id,
      player2Id: m.player2Id,
      status: m.status as any,
      result: m.result as any,
      player1Wins: m.player1Wins,
      player2Wins: m.player2Wins,
      player1ConsecLoss: m.player1ConsecLoss,
      player2ConsecLoss: m.player2ConsecLoss,
      gamesPlayed: m.gamesPlayed,
      player1GamePoints: m.player1GamePoints,
      player2GamePoints: m.player2GamePoints,
      currentGameId: m.currentGameId,
      startedAt: m.startedAt,
      completedAt: m.completedAt,
    };
  }
}
