import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);

  /**
   * Underlying ioredis client.
   * NULL when REDIS_URL is not configured (development / no-Redis environments).
   * All public methods are no-ops when client is null, so callers never need
   * to guard against missing Redis — they get null/void silently.
   */
  readonly client: Redis | null;

  constructor(private readonly config: ConfigService) {
    const url = this.config.get<string>('REDIS_URL');

    if (!url) {
      this.logger.warn('REDIS_URL not set — Redis disabled, using DB fallback only');
      this.client = null;
      return;
    }

    this.client = new Redis(url, {
      lazyConnect: false,
      maxRetriesPerRequest: 0,
      enableReadyCheck: true,
    });

    let lastErrorMsg: string | null = null;
    this.client.on('error', (err) => {
      if (err.message !== lastErrorMsg) {
        this.logger.error(`Redis error: ${err.message}`);
        lastErrorMsg = err.message;
      }
    });

    this.client.on('ready', () => {
      lastErrorMsg = null;
      this.logger.log('Redis connection ready');
    });
  }

  onModuleDestroy(): void {
    this.client?.quit().catch(() => {});
  }

  async get(key: string): Promise<string | null> {
    if (!this.client) return null;
    return this.client.get(key);
  }

  async setex(key: string, ttlSeconds: number, value: string): Promise<void> {
    if (!this.client) return;
    await this.client.setex(key, ttlSeconds, value);
  }

  async del(...keys: string[]): Promise<void> {
    if (!this.client || keys.length === 0) return;
    await this.client.del(...keys);
  }

  async eval(script: string, keys: string[], args: string[]): Promise<unknown> {
    if (!this.client) return null;
    return this.client.eval(script, keys.length, ...keys, ...args);
  }
}
