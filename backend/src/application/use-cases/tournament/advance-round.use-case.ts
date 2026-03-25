import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { ITournamentRepository } from '../../../domain/tournament/repositories/tournament.repository.interface';
import { BracketGenerationService } from '../../../domain/tournament/services/bracket-generation.service';
import { TournamentStatus } from '../../../domain/tournament/entities/tournament.entity';
import { TournamentRound, RoundStatus } from '../../../domain/tournament/entities/tournament-round.entity';
import { TournamentMatch, MatchStatus, MatchResult } from '../../../domain/tournament/entities/tournament-match.entity';
import { GamesGateway } from '../../../infrastructure/messaging/games.gateway';
import { StartTournamentUseCase } from './start-tournament.use-case';
import { TournamentNotificationService } from '../../services/tournament-notification.service';

@Injectable()
export class AdvanceRoundUseCase {
  constructor(
    @Inject('ITournamentRepository')
    private readonly repo: ITournamentRepository,
    private readonly bracket: BracketGenerationService,
    @Inject(forwardRef(() => GamesGateway))
    private readonly gateway: GamesGateway,
    @Inject(forwardRef(() => StartTournamentUseCase))
    private readonly startUseCase: StartTournamentUseCase,
    private readonly notificationService: TournamentNotificationService,
  ) {}

  async execute(tournamentId: string, completedRoundId: string): Promise<void> {
    const tournament = await this.repo.findById(tournamentId);
    if (!tournament) return;

    // Mark completed round as done
    const rounds = await this.repo.findRoundsByTournament(tournamentId);
    const completedRound = rounds.find((r) => r.id === completedRoundId);
    if (completedRound) {
      completedRound.status = RoundStatus.COMPLETED;
      completedRound.completedAt = new Date();
      await this.repo.updateRound(completedRound);
    }

    // Collect winners from completed round
    const matches = await this.repo.findMatchesByRound(completedRoundId);
    const winners: { userId: string; seed: number | null }[] = [];

    for (const match of matches) {
      const winnerId = match.getWinnerId();
      if (winnerId) {
        const participant = await this.repo.findParticipant(tournamentId, winnerId);
        winners.push({ userId: winnerId, seed: participant?.seed ?? null });
      }
    }

    // Only one winner = tournament is over
    if (winners.length <= 1) {
      tournament.status = TournamentStatus.COMPLETED;
      await this.repo.update(tournament);
      const winnerId = winners[0]?.userId ?? null;
      this.gateway.emitTournamentCompleted(tournamentId, { tournamentId, winnerId });

      const allParticipants = await this.repo.findParticipantsByTournament(tournamentId);
      void this.notificationService.notifyTournamentCompleted(
        allParticipants.map((p) => p.userId),
        winnerId,
        tournament,
      );
      return;
    }

    // Create next round
    const nextRoundNumber = (completedRound?.roundNumber ?? 1) + 1;
    const newRound = new TournamentRound(
      randomUUID(),
      tournamentId,
      nextRoundNumber,
      RoundStatus.ACTIVE,
      new Date(),
    );
    const savedRound = await this.repo.createRound(newRound);

    // Generate pairings
    const stubs = this.bracket.generateNextRound(winners, savedRound.id, tournamentId);

    for (const stub of stubs) {
      const matchId = randomUUID();
      const match = new TournamentMatch(matchId, stub.roundId, stub.tournamentId,
        MatchStatus.PENDING, null, stub.player1Id, stub.player2Id);
      const saved = await this.repo.createMatch(match);

      if (stub.player1Id && stub.player2Id) {
        await this.startUseCase.spawnGameForMatch(
          saved,
          tournament,
          1,
          stub.player1Id,
          stub.player2Id,
          nextRoundNumber,
        );
      }
    }

    this.gateway.emitTournamentRoundAdvanced(tournamentId, {
      roundNumber: nextRoundNumber,
      tournamentId,
    });
  }
}
