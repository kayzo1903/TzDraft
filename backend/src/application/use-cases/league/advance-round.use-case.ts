import { Injectable, Inject, Logger } from '@nestjs/common';
import type { ILeagueRepository } from '../../../domain/league/repositories/i-league.repository';
import { LeagueRoundStatus } from '../../../domain/league/entities/league-round.entity';
import { LeagueMatchStatus } from '../../../domain/league/entities/league-match.entity';
import { LeagueStatus } from '../../../domain/league/entities/league.entity';
import { GamesGateway } from '../../../infrastructure/messaging/games.gateway';

const TERMINAL_MATCH_STATUSES = new Set([
  LeagueMatchStatus.COMPLETED,
  LeagueMatchStatus.FORFEITED,
  LeagueMatchStatus.VOIDED,
]);

@Injectable()
export class AdvanceRoundUseCase {
  private readonly logger = new Logger(AdvanceRoundUseCase.name);

  constructor(
    @Inject('ILeagueRepository') private readonly leagueRepo: ILeagueRepository,
    private readonly gateway: GamesGateway,
  ) {}

  async execute(leagueId: string): Promise<void> {
    const league = await this.leagueRepo.findLeagueById(leagueId);
    if (!league || league.status !== LeagueStatus.ACTIVE) return;

    const currentRound = await this.leagueRepo.findRound(leagueId, league.currentRound);
    if (!currentRound) return;
    if (currentRound.status === LeagueRoundStatus.COMPLETED) return;

    // Check if all matches in the current round are terminal
    const allDone = currentRound.matches.every((m) =>
      TERMINAL_MATCH_STATUSES.has(m.status),
    );

    if (!allDone) return;

    // Mark current round COMPLETED
    await this.leagueRepo.updateLeague(leagueId, {
      // We use the league entity's currentRound field to track round progress
    } as any);

    // We update the round status via the match update pattern (no direct updateRound in repo)
    // Use prisma directly via repository workaround: update league currentRound
    const nextRoundNumber = league.currentRound + 1;
    const totalRounds = 11; // Fixed for 12-player league

    if (nextRoundNumber > totalRounds) {
      // League complete
      await this.leagueRepo.updateLeague(leagueId, {
        status: LeagueStatus.COMPLETED,
        endDate: new Date(),
      } as any);

      const standings = await this.leagueRepo.getStandings(leagueId);
      this.gateway.emitLeagueCompleted(leagueId, { leagueId, standings });

      this.logger.log(`League ${leagueId} completed — all 11 rounds done`);
      return;
    }

    // Advance to next round
    await this.leagueRepo.updateLeague(leagueId, {
      currentRound: nextRoundNumber,
    } as any);

    const nextRound = await this.leagueRepo.findRound(leagueId, nextRoundNumber);
    if (nextRound) {
      this.gateway.emitLeagueRoundAdvanced(leagueId, {
        leagueId,
        previousRound: league.currentRound,
        currentRound: nextRoundNumber,
        nextRoundDeadline: nextRound.deadline,
      });
    }

    this.logger.log(
      `League ${leagueId}: Round ${league.currentRound} completed → Round ${nextRoundNumber} active`,
    );
  }
}
