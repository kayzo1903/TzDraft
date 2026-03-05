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
