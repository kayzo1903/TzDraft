import { Injectable, Inject, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../database/prisma/prisma.service';
import type { ITournamentRepository } from '../../domain/tournament/repositories/tournament.repository.interface';
import { 
  TournamentFormat, 
  TournamentStatus 
} from '../../domain/tournament/entities/tournament.entity';
import { RoundStatus } from '../../domain/tournament/entities/tournament-round.entity';
import { 
  MatchStatus, 
  MatchResult 
} from '../../domain/tournament/entities/tournament-match.entity';
import { ParticipantStatus } from '../../domain/tournament/entities/tournament-participant.entity';
import { AdvanceRoundUseCase } from '../../application/use-cases/tournament/advance-round.use-case';

@Injectable()
export class TournamentTasksService {
  private readonly logger = new Logger(TournamentTasksService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject('ITournamentRepository')
    private readonly repo: ITournamentRepository,
    private readonly advanceRound: AdvanceRoundUseCase,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async handleRoundExpiries() {
    this.logger.log('Checking for expired tournament rounds...');

    // 1. Find all ACTIVE rounds in ACTIVE tournaments
    const activeRounds = await this.prisma.tournamentRound.findMany({
      where: {
        status: RoundStatus.ACTIVE,
        startedAt: { not: null },
        tournament: {
          status: TournamentStatus.ACTIVE,
        },
      },
      include: {
        tournament: true,
      },
    });

    const now = new Date();

    for (const round of activeRounds) {
      const startedAt = new Date(round.startedAt!);
      const durationMinutes = round.tournament.roundDurationMinutes || 10080; // default 7 days
      const expiresAt = new Date(startedAt.getTime() + durationMinutes * 60000);

      if (now > expiresAt) {
        this.logger.warn(
          `Round ${round.roundNumber} of tournament ${round.tournamentId} has expired. Resolving pending matches...`
        );
        await this.resolveExpiredRound(round);
      }
    }
  }

  private async resolveExpiredRound(round: any) {
    const matches = await this.repo.findMatchesByRound(round.id);
    const pendingMatches = matches.filter(m => m.status !== MatchStatus.COMPLETED);

    for (const match of pendingMatches) {
      this.logger.log(`Auto-resolving match ${match.id} (Tournament: ${match.tournamentId})`);

      if (round.tournament.format === TournamentFormat.ROUND_ROBIN) {
        // ROUND_ROBIN: Always a DRAW (0-0)
        match.status = MatchStatus.COMPLETED;
        match.result = MatchResult.DRAW;
        match.completedAt = new Date();
        await this.repo.updateMatch(match);
        await this.updateRoundRobinStandings(match);
      } else {
        // SINGLE_ELIMINATION: Higher seed or leader wins
        const winnerId = await this.determineKnockoutWinner(match);
        match.status = MatchStatus.COMPLETED;
        match.result = winnerId === match.player1Id ? MatchResult.PLAYER1_WIN : MatchResult.PLAYER2_WIN;
        match.completedAt = new Date();
        await this.repo.updateMatch(match);
        await this.updateKnockoutParticipants(match, winnerId);
      }
    }

    // After resolving all matches, advance the round
    await this.advanceRound.execute(round.tournamentId, round.id);
  }

  private async updateRoundRobinStandings(match: any) {
    const p1 = match.player1Id ? await this.repo.findParticipant(match.tournamentId, match.player1Id) : null;
    const p2 = match.player2Id ? await this.repo.findParticipant(match.tournamentId, match.player2Id) : null;

    if (p1) {
      p1.matchesPlayed = (p1.matchesPlayed || 0) + 1;
      p1.matchDraws = (p1.matchDraws || 0) + 1;
      p1.matchPoints = (p1.matchPoints || 0) + 1;
      await this.repo.updateParticipant(p1);
    }
    if (p2) {
      p2.matchesPlayed = (p2.matchesPlayed || 0) + 1;
      p2.matchDraws = (p2.matchDraws || 0) + 1;
      p2.matchPoints = (p2.matchPoints || 0) + 1;
      await this.repo.updateParticipant(p2);
    }
  }

  private async determineKnockoutWinner(match: any): Promise<string> {
    // If one player has more wins already, they win
    if (match.player1Wins > match.player2Wins) return match.player1Id!;
    if (match.player2Wins > match.player1Wins) return match.player2Id!;

    // Otherwise, fetch participants to check seeds
    const p1 = match.player1Id ? await this.repo.findParticipant(match.tournamentId, match.player1Id) : null;
    const p2 = match.player2Id ? await this.repo.findParticipant(match.tournamentId, match.player2Id) : null;

    // Favor lower seed number (stronger player)
    if (p1 && p2) {
      if ((p1.seed || 999) < (p2.seed || 999)) return p1.userId;
      if ((p2.seed || 999) < (p1.seed || 999)) return p2.userId;
    }

    return match.player1Id || match.player2Id || ''; // Fallback
  }

  private async updateKnockoutParticipants(match: any, winnerId: string) {
    const participants = await this.repo.findParticipantsByTournament(match.tournamentId);
    const winner = participants.find(p => p.userId === winnerId);
    const loserId = winnerId === match.player1Id ? match.player2Id : match.player1Id;
    const loser = participants.find(p => p.userId === loserId);

    if (winner) {
      winner.matchWins += 1;
      winner.status = ParticipantStatus.ACTIVE;
      await this.repo.updateParticipant(winner);
    }
    if (loser) {
      loser.matchLosses += 1;
      loser.status = ParticipantStatus.ELIMINATED;
      await this.repo.updateParticipant(loser);
    }
  }
}
