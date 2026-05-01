import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../database/prisma/prisma.service';

/**
 * CleanupService
 * Scheduled tasks that keep the database tidy.
 */
@Injectable()
export class CleanupService {
  private readonly logger = new Logger(CleanupService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Abort WAITING invite games that were created more than 30 minutes ago
   * and still have an empty player slot (i.e., the invite was never accepted).
   * Runs every hour.
   */
  @Cron(CronExpression.EVERY_HOUR)
  async abortStaleInviteGames(): Promise<void> {
    const cutoff = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes ago

    const result = await this.prisma.game.updateMany({
      where: {
        status: 'WAITING',
        inviteCode: { not: null },
        createdAt: { lt: cutoff },
        OR: [{ blackPlayerId: null }, { whitePlayerId: null }],
      },
      data: { status: 'ABORTED' },
    });

    if (result.count > 0) {
      this.logger.log(`Aborted ${result.count} stale invite game(s)`);
    }
  }

  /**
   * Abandon ACTIVE games where the clock hasn't moved for more than 1 hour.
   * This catches games orphaned by server restarts or both players disconnecting
   * before the 60-second abandon timer fired — they would otherwise block both
   * players from ever joining matchmaking again.
   * Runs every 30 minutes.
   */
  @Cron(CronExpression.EVERY_30_MINUTES)
  async abandonStaleActiveGames(): Promise<void> {
    const cutoff = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago

    const result = await this.prisma.game.updateMany({
      where: {
        status: 'ACTIVE',
        gameType: { not: 'AI' },
        clock: { lastMoveAt: { lt: cutoff } },
      },
      data: {
        status: 'FINISHED',
        winner: 'DRAW',
        endReason: 'DISCONNECT',
        endedAt: new Date(),
      },
    });

    if (result.count > 0) {
      this.logger.log(
        `Abandoned ${result.count} stale active game(s) (no activity for 1h+)`,
      );
    }
  }

  /**
   * Permanently delete accounts that were soft-deleted more than 30 days ago.
   * Runs daily at 03:00 UTC.
   */
  @Cron('0 3 * * *')
  async hardDeleteExpiredAccounts(): Promise<void> {
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const result = await this.prisma.user.deleteMany({
      where: { deletedAt: { not: null, lt: cutoff } },
    });

    if (result.count > 0) {
      this.logger.log(`Hard-deleted ${result.count} expired account(s)`);
    }
  }

  /**
   * Remove matchmaking queue entries older than 5 minutes (stale from crashed clients).
   * Runs every 5 minutes.
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async cleanStaleQueueEntries(): Promise<void> {
    const cutoff = new Date(Date.now() - 5 * 60 * 1000);

    const result = await this.prisma.matchmakingQueue.deleteMany({
      where: { joinedAt: { lt: cutoff } },
    });

    if (result.count > 0) {
      this.logger.log(`Removed ${result.count} stale queue entry/entries`);
    }
  }
}
