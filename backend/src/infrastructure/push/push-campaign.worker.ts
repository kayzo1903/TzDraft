import { randomUUID } from 'crypto';
import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Worker, Job, ConnectionOptions } from 'bullmq';
import { PrismaService } from '../database/prisma/prisma.service';
import { ExpoPushService } from './expo-push.service';
import {
  PushCampaignQueue,
  PUSH_QUEUE_NAME,
  SendCampaignJobData,
  CheckReceiptsJobData,
  PuzzleNotificationJobData,
} from './push-campaign.queue';

function urlToConnectionOptions(url: string): ConnectionOptions {
  const parsed = new URL(url);
  const opts: ConnectionOptions = {
    host: parsed.hostname,
    port: Number(parsed.port) || 6379,
    maxRetriesPerRequest: null,
  } as ConnectionOptions;
  if (parsed.password)
    (opts as any).password = decodeURIComponent(parsed.password);
  if (parsed.protocol === 'rediss:') (opts as any).tls = {};
  return opts;
}

const PAGE_SIZE = 500;

@Injectable()
export class PushCampaignWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PushCampaignWorker.name);
  private worker: Worker | null = null;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly expoPush: ExpoPushService,
    private readonly queue: PushCampaignQueue,
  ) {}

  onModuleInit(): void {
    const url = this.config.get<string>('REDIS_URL');
    if (!url) return;

    const connection = urlToConnectionOptions(url);
    this.worker = new Worker(
      PUSH_QUEUE_NAME,
      (job: Job) => this.dispatch(job),
      { connection, concurrency: 2 },
    );

    this.worker.on('failed', (job, err) => {
      this.logger.error(`Job ${job?.id} (${job?.name}) failed: ${err.message}`);
    });

    this.logger.log('Push campaign worker started');
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close();
  }

  private async dispatch(job: Job): Promise<void> {
    if (job.name === 'send-campaign') {
      await this.handleSendCampaign(job.data as SendCampaignJobData);
    } else if (job.name === 'check-receipts') {
      await this.handleCheckReceipts(job.data as CheckReceiptsJobData);
    } else if (job.name === 'puzzle-notification') {
      await this.handlePuzzleNotification(job.data as PuzzleNotificationJobData);
    }
  }

  private async handleSendCampaign(data: SendCampaignJobData): Promise<void> {
    const { campaignId, audience, title, body, cursor, totalDelivered } = data;

    const users = await this.prisma.user.findMany({
      where: {
        ...this.buildAudienceWhere(audience),
        pushToken: { not: null },
        ...(cursor ? { id: { gt: cursor } } : {}),
      },
      select: { id: true, pushToken: true },
      orderBy: { id: 'asc' },
      take: PAGE_SIZE,
    });

    if (users.length === 0) {
      this.logger.log(
        `[Push] Campaign ${campaignId} complete — ${totalDelivered} delivered total`,
      );
      return;
    }

    const tokens = users.map((u) => u.pushToken!).filter(Boolean);
    const ticketIds = await this.expoPush.sendToTokens(tokens, title, body, {
      type: 'ADMIN_ANNOUNCEMENT',
      campaignId,
      href: `/community/announcement/${campaignId}`,
      screen: 'notifications',
    });

    const newTotal = totalDelivered + tokens.length;
    await this.bumpAnalytics(campaignId, users.length, newTotal);

    if (ticketIds.length > 0) {
      await this.queue.enqueueCheckReceipts({
        campaignId,
        receiptIds: ticketIds,
      });
    }

    if (users.length === PAGE_SIZE) {
      await this.queue.enqueueSendCampaign({
        campaignId,
        audience,
        title,
        body,
        cursor: users[users.length - 1].id,
        totalDelivered: newTotal,
      });
    } else {
      this.logger.log(
        `[Push] Campaign ${campaignId} complete — ${newTotal} delivered total`,
      );
    }
  }

  private async handleCheckReceipts(data: CheckReceiptsJobData): Promise<void> {
    const { campaignId, receiptIds } = data;
    const failedCount = await this.expoPush.checkReceipts(receiptIds);

    if (failedCount > 0) {
      const row = await this.prisma.communicationCampaign.findUnique({
        where: { id: campaignId },
        select: { analytics: true },
      });
      if (row) {
        const analytics = row.analytics as any;
        await this.prisma.communicationCampaign.update({
          where: { id: campaignId },
          data: {
            analytics: {
              ...analytics,
              failed: (analytics.failed ?? 0) + failedCount,
            },
          },
        });
      }
    }
  }

  private async bumpAnalytics(
    campaignId: string,
    eligible: number,
    delivered: number,
  ): Promise<void> {
    const row = await this.prisma.communicationCampaign.findUnique({
      where: { id: campaignId },
      select: { analytics: true },
    });
    if (!row) return;
    const current = row.analytics as any;
    await this.prisma.communicationCampaign.update({
      where: { id: campaignId },
      data: {
        analytics: {
          ...current,
          eligibleUsers: (current.eligibleUsers ?? 0) + eligible,
          delivered,
        },
      },
    });
  }

  private async handlePuzzleNotification(data: PuzzleNotificationJobData): Promise<void> {
    const { puzzleId, title, body, cursor } = data;

    // Fetch ALL users (not just those with push tokens) for this page
    const users = await this.prisma.user.findMany({
      where: {
        ...(cursor ? { id: { gt: cursor } } : {}),
      },
      select: { id: true, pushToken: true },
      orderBy: { id: 'asc' },
      take: PAGE_SIZE,
    });

    if (users.length === 0) {
      this.logger.log(`[Push] Puzzle notification ${puzzleId} complete`);
      return;
    }

    // Write in-app notifications for every user in this page
    const now = new Date();
    await this.prisma.notification.createMany({
      data: users.map((u) => ({
        id: randomUUID(),
        userId: u.id,
        type: 'PUZZLE_RELEASED' as any,
        title,
        body,
        metadata: { type: 'PUZZLE_RELEASED', puzzleId, screen: 'puzzles' },
        read: false,
        createdAt: now,
      })),
      skipDuplicates: true,
    });

    // Send device push only to users who have a token
    const tokens = users.map((u) => u.pushToken!).filter(Boolean);
    if (tokens.length > 0) {
      await this.expoPush.sendToTokens(tokens, title, body, {
        type: 'PUZZLE_RELEASED',
        puzzleId,
        screen: 'puzzles',
      });
    }

    // If there are more users, enqueue the next page
    if (users.length === PAGE_SIZE) {
      await this.queue.enqueuePuzzleNotification({
        puzzleId,
        title,
        body,
        cursor: users[users.length - 1].id,
      });
    } else {
      this.logger.log(`[Push] Puzzle notification ${puzzleId} complete`);
    }
  }


  private buildAudienceWhere(audience: string): Record<string, unknown> {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    switch (audience) {
      case 'NEW_USERS':
        return { createdAt: { gte: sevenDaysAgo } };
      case 'ACTIVE_USERS':
        return { lastSeenAt: { gte: sevenDaysAgo } };
      case 'INACTIVE_USERS':
        return { lastSeenAt: { lt: thirtyDaysAgo } };
      case 'NEVER_JOINED_GAME':
        return { gamesCreated: 0 };
      default:
        return {};
    }
  }
}
