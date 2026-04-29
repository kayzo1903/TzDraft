import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue, ConnectionOptions } from 'bullmq';

export const PUSH_QUEUE_NAME = 'push-campaigns';

/** Convert a redis:// URL into a plain options object so BullMQ uses its own ioredis. */
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

export interface SendCampaignJobData {
  campaignId: string;
  audience: string;
  title: string;
  body: string;
  /** Cursor: last user id processed so far (null = first page). */
  cursor: string | null;
  /** Running total of delivered count across all pages. */
  totalDelivered: number;
}

export interface CheckReceiptsJobData {
  campaignId: string;
  receiptIds: string[];
}

export interface PuzzleNotificationJobData {
  puzzleId: string;
  title: string;
  body: string;
  /** Cursor: last user id processed so far (null = first page). */
  cursor: string | null;
}

@Injectable()
export class PushCampaignQueue implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PushCampaignQueue.name);
  private queue: Queue | null = null;

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    const url = this.config.get<string>('REDIS_URL');
    if (!url) {
      this.logger.warn('REDIS_URL not set — push queue disabled');
      return;
    }
    const connection = urlToConnectionOptions(url);
    this.queue = new Queue(PUSH_QUEUE_NAME, { connection });
    this.logger.log('Push campaign queue ready');
  }

  async onModuleDestroy(): Promise<void> {
    await this.queue?.close();
  }

  get isAvailable(): boolean {
    return this.queue !== null;
  }

  async enqueueSendCampaign(data: SendCampaignJobData): Promise<void> {
    if (!this.queue) return;
    await this.queue.add('send-campaign', data, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5_000 },
    });
  }

  async enqueueCheckReceipts(
    data: CheckReceiptsJobData,
    delayMs = 900_000,
  ): Promise<void> {
    if (!this.queue) return;
    await this.queue.add('check-receipts', data, {
      delay: delayMs,
      attempts: 2,
      backoff: { type: 'fixed', delay: 60_000 },
    });
  }

  async enqueuePuzzleNotification(data: PuzzleNotificationJobData): Promise<void> {
    if (!this.queue) return;
    await this.queue.add('puzzle-notification', data, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5_000 },
    });
  }
}
