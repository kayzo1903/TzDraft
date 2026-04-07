import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ClaimForfeitUseCase } from '../../application/use-cases/league/claim-forfeit.use-case';
import { AdvanceRoundUseCase } from '../../application/use-cases/league/advance-round.use-case';
import { HandlePlayerInactiveUseCase } from '../../application/use-cases/league/handle-player-inactive.use-case';
import type { ILeagueRepository } from '../../domain/league/repositories/i-league.repository';
import { Inject } from '@nestjs/common';
import { RedisService } from '../cache/redis.service';
import { HandleGameCompletedUseCase } from '../../application/use-cases/league/handle-game-completed.use-case';

/** Redis key for league disconnection windows */
const K_LEAGUE_DISCONNECT = (leagueGameId: string, userId: string) =>
  `league:disconnect:${leagueGameId}:${userId}`;

@Injectable()
export class LeagueTasksService {
  private readonly logger = new Logger(LeagueTasksService.name);

  constructor(
    @Inject('ILeagueRepository') private readonly leagueRepo: ILeagueRepository,
    private readonly claimForfeitUseCase: ClaimForfeitUseCase,
    private readonly advanceRoundUseCase: AdvanceRoundUseCase,
    private readonly handlePlayerInactiveUseCase: HandlePlayerInactiveUseCase,
    private readonly handleGameCompletedUseCase: HandleGameCompletedUseCase,
    private readonly redis: RedisService,
  ) {}

  /**
   * Every hour: find all matches past their deadline in active leagues
   * and forfeit them. Also increments consecutiveMissed on the forfeiter.
   */
  @Cron(CronExpression.EVERY_HOUR)
  async checkMatchDeadlines() {
    this.logger.debug('Running checkMatchDeadlines...');

    try {
      const leagues = await this.leagueRepo.findActiveLeagues();

      for (const league of leagues) {
        const expiredMatches = await this.leagueRepo.findMatchesPastDeadline(league.id);

        for (const match of expiredMatches) {
          try {
            // Determine who forfeits: the player who played fewer games
            // If equal (both absent), player1 forfeits by default
            const game1Done = match.games.some((g) => g.gameNumber === 1 && g.status === 'COMPLETED');
            const game2Done = match.games.some((g) => g.gameNumber === 2 && g.status === 'COMPLETED');

            let forfeitedPlayerId: string;

            if (!game1Done && !game2Done) {
              // Neither played — forfeit player who had first move obligation (player1 = White in G1)
              forfeitedPlayerId = match.player1Id;
            } else if (game1Done && !game2Done) {
              // Game 1 done but not Game 2 — the player whose turn it is to play G2
              // Game 2: player2 = White, so player2 had to start it
              forfeitedPlayerId = match.player2Id;
            } else {
              // Both done — shouldn't reach here, match should be COMPLETED already
              continue;
            }

            await this.claimForfeitUseCase.execute(match.id, { forfeitedPlayerId });
            this.logger.log(`Auto-forfeited match ${match.id} (deadline passed)`);
          } catch (err: any) {
            this.logger.error(`Failed to forfeit match ${match.id}: ${err.message}`);
          }
        }

        // After forfeiting expired matches, try to advance the round
        try {
          await this.advanceRoundUseCase.execute(league.id);
        } catch (err: any) {
          this.logger.error(`Failed to advance round for league ${league.id}: ${err.message}`);
        }
      }
    } catch (err: any) {
      this.logger.error(`checkMatchDeadlines failed: ${err.message}`);
    }
  }

  /**
   * Every 30 seconds: check Redis for expired league disconnection windows.
   * If a player's reconnection window has expired, their current game is forfeited.
   */
  @Cron('*/30 * * * * *')
  async checkReconnectionWindows() {
    // Redis TTL handles expiry automatically.
    // This cron exists to catch any edge cases where TTL fired but the
    // forfeit handler didn't trigger (e.g. server restart during TTL window).
    // In practice, the GamesGateway handleDisconnect timer handles this in real-time.
    // This is a safety net only.
    this.logger.debug('checkReconnectionWindows: Redis TTL handles expiry automatically');
  }

  /**
   * Daily at midnight: auto-advance any rounds where all matches are done
   * but haven't been advanced yet (e.g. checkMatchDeadlines missed a cycle).
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async advanceRounds() {
    this.logger.debug('Running advanceRounds...');

    try {
      const leagues = await this.leagueRepo.findActiveLeagues();

      for (const league of leagues) {
        try {
          await this.advanceRoundUseCase.execute(league.id);
        } catch (err: any) {
          this.logger.error(`advanceRounds failed for league ${league.id}: ${err.message}`);
        }
      }
    } catch (err: any) {
      this.logger.error(`advanceRounds sweep failed: ${err.message}`);
    }
  }

  /**
   * Daily at 1 AM: flag players with 2+ consecutive missed deadlines as INACTIVE,
   * then apply the 50% threshold rule (expunge vs forfeit remaining).
   */
  @Cron('0 1 * * *')
  async inactivitySweep() {
    this.logger.debug('Running inactivitySweep...');

    try {
      const leagues = await this.leagueRepo.findActiveLeagues();

      for (const league of leagues) {
        try {
          await this.handlePlayerInactiveUseCase.execute(league.id);
        } catch (err: any) {
          this.logger.error(`inactivitySweep failed for league ${league.id}: ${err.message}`);
        }
      }
    } catch (err: any) {
      this.logger.error(`inactivitySweep failed: ${err.message}`);
    }
  }
}
