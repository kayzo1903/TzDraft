import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);

  /**
   * Underlying ioredis client.
   * NULL when REDIS_URL is not configured (development / no-Redis environments).
   * All public methods are no-ops when client is null OR when the connection
   * is down — callers never need to guard against missing Redis.
   */
  readonly client: Redis | null;

  /** True only when the client is connected and ready to accept commands. */
  private _ready = false;

  constructor(private readonly config: ConfigService) {
    const url = this.config.get<string>('REDIS_URL');

    if (!url) {
      this.logger.warn(
        'REDIS_URL not set — Redis disabled, using DB fallback only',
      );
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
      this._ready = false;
    });

    this.client.on('ready', () => {
      lastErrorMsg = null;
      this._ready = true;
      this.logger.log('Redis connection ready');
    });
  }

  onModuleDestroy(): void {
    this.client?.quit().catch(() => {});
  }

  private get isReady(): boolean {
    return !!this.client && this._ready;
  }

  async get(key: string): Promise<string | null> {
    if (!this.isReady) return null;
    try { return await this.client!.get(key); } catch { return null; }
  }

  async setex(key: string, ttlSeconds: number, value: string): Promise<void> {
    if (!this.isReady) return;
    try { await this.client!.setex(key, ttlSeconds, value); } catch { /* swallow */ }
  }

  async del(...keys: string[]): Promise<void> {
    if (!this.isReady || keys.length === 0) return;
    try { await this.client!.del(...keys); } catch { /* swallow */ }
  }

  async eval(script: string, keys: string[], args: string[]): Promise<unknown> {
    if (!this.isReady) return null;
    try { return await this.client!.eval(script, keys.length, ...keys, ...args); } catch { return null; }
  }
}
