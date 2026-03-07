import { Injectable } from '@nestjs/common';
import {
  IMatchmakingRepository,
  MatchmakingEntry,
} from '../../domain/game/repositories/matchmaking.repository.interface';
import { RedisService } from '../cache/redis.service';

/**
 * Redis-backed matchmaking queue.
 *
 * Key layout
 * ──────────
 *  mmq:zset:{timeMs}      ZSET   score = joinedAt timestamp (ms), member = userId
 *  mmq:entry:{userId}     HASH   all MatchmakingEntry fields
 *
 * Why Redis instead of Postgres?
 * • Sub-millisecond queue reads — no DB round-trip per match attempt
 * • Atomic Lua scripts replace Postgres SERIALIZABLE transactions
 * • Matchmaking state is transient — Redis TTL handles cleanup naturally
 */
@Injectable()
export class RedisMatchmakingRepository implements IMatchmakingRepository {
  private static readonly ENTRY_TTL_SECONDS = 120; // auto-expire after 2 min
  private static readonly MAX_ELO_GAP = 200;

  constructor(private readonly redis: RedisService) {}

  // ── Key helpers ────────────────────────────────────────────────────────────

  private zsetKey(timeMs: number): string {
    return `mmq:zset:${timeMs}`;
  }

  private entryKey(userId: string): string {
    return `mmq:entry:${userId}`;
  }

  // ── IMatchmakingRepository ─────────────────────────────────────────────────

  async upsert(
    entry: Omit<MatchmakingEntry, 'id' | 'joinedAt'>,
  ): Promise<MatchmakingEntry> {
    const now = Date.now();
    const entryKey = this.entryKey(entry.userId);
    const zsetKey = this.zsetKey(entry.timeMs);

    // Overwrite any previous entry for this user (re-queue with fresh joinedAt)
    await this.redis.client
      .pipeline()
      .zadd(zsetKey, now, entry.userId)
      .hset(entryKey, {
        userId: entry.userId,
        timeMs: String(entry.timeMs),
        socketId: entry.socketId,
        joinedAt: String(now),
        rating: entry.rating != null ? String(entry.rating) : '',
        rd: entry.rd != null ? String(entry.rd) : '',
        volatility: entry.volatility != null ? String(entry.volatility) : '',
      })
      .expire(entryKey, RedisMatchmakingRepository.ENTRY_TTL_SECONDS)
      .exec();

    return {
      id: entry.userId, // Redis has no surrogate key; userId is unique
      userId: entry.userId,
      timeMs: entry.timeMs,
      socketId: entry.socketId,
      joinedAt: new Date(now),
      rating: entry.rating ?? null,
      rd: entry.rd ?? null,
      volatility: entry.volatility ?? null,
    };
  }

  async findOldestMatch(
    timeMs: number,
    excludeUserId: string,
  ): Promise<MatchmakingEntry | null> {
    return this.findAndClaimMatch(timeMs, excludeUserId, null);
  }

  /**
   * Atomically find and claim the oldest waiting opponent.
   *
   * Algorithm:
   * 1. ZRANGEBYSCORE to get candidates sorted by joinedAt (oldest first)
   * 2. Filter in application code: skip self, apply Elo window
   * 3. Lua: atomically ZREM + DEL — if ZREM returns 0 the entry was already
   *    taken by a concurrent worker, so skip and try the next candidate
   */
  async findAndClaimMatch(
    timeMs: number,
    excludeUserId: string,
    userRating?: number | null,
  ): Promise<MatchmakingEntry | null> {
    const zsetKey = this.zsetKey(timeMs);

    // Fetch up to 50 oldest candidates (plenty for any realistic queue)
    const candidates: string[] = await this.redis.client.zrangebyscore(
      zsetKey,
      '-inf',
      '+inf',
      'LIMIT',
      0,
      50,
    );

    for (const candidateUserId of candidates) {
      if (candidateUserId === excludeUserId) continue;

      // Load entry data
      const raw = await this.redis.client.hgetall(
        this.entryKey(candidateUserId),
      );
      if (!raw || !raw.userId) continue; // entry expired or missing

      // Apply Elo window when the current user has a known rating
      if (userRating != null && raw.rating) {
        const candidateRating = parseFloat(raw.rating);
        if (
          Math.abs(candidateRating - userRating) >
          RedisMatchmakingRepository.MAX_ELO_GAP
        ) {
          continue;
        }
      }

      // Atomic claim: ZREM + DEL via Lua script
      const claimScript = `
        local removed = redis.call('ZREM', KEYS[1], ARGV[1])
        if removed == 1 then
          redis.call('DEL', KEYS[2])
          return 1
        end
        return 0
      `;

      const claimed = await this.redis.eval(
        claimScript,
        [zsetKey, this.entryKey(candidateUserId)],
        [candidateUserId],
      );

      if (claimed === 1) {
        const joinedAt = raw.joinedAt ? parseInt(raw.joinedAt, 10) : Date.now();
        return {
          id: raw.userId,
          userId: raw.userId,
          timeMs: parseInt(raw.timeMs, 10),
          socketId: raw.socketId,
          joinedAt: new Date(joinedAt),
          rating: raw.rating ? parseFloat(raw.rating) : null,
          rd: raw.rd ? parseFloat(raw.rd) : null,
          volatility: raw.volatility ? parseFloat(raw.volatility) : null,
        };
      }
      // Claim lost to another worker — try next candidate
    }

    return null;
  }

  async remove(userId: string): Promise<void> {
    // We don't know which timeMs buckets this user is in without a reverse index,
    // so we use the pattern scan approach. In practice, users are in at most one bucket.
    const entryRaw = await this.redis.client.hgetall(this.entryKey(userId));
    if (entryRaw?.timeMs) {
      await this.redis.client
        .pipeline()
        .zrem(this.zsetKey(parseInt(entryRaw.timeMs, 10)), userId)
        .del(this.entryKey(userId))
        .exec();
    } else {
      // Entry might have expired; just clean up any stray HASH
      await this.redis.del(this.entryKey(userId));
    }
  }

  async removeStale(maxAgeMs: number): Promise<void> {
    const cutoffScore = Date.now() - maxAgeMs;
    // We'd need to know all timeMs buckets to prune their ZSETs.
    // Redis SCAN is the right tool here — use pattern "mmq:zset:*"
    const keys: string[] = [];
    let cursor = '0';
    do {
      const [nextCursor, found] = await this.redis.client.scan(
        cursor,
        'MATCH',
        'mmq:zset:*',
        'COUNT',
        100,
      );
      cursor = nextCursor;
      keys.push(...found);
    } while (cursor !== '0');

    for (const zsetKey of keys) {
      // Remove ZSET members with score (joinedAt) older than cutoff
      const stale: string[] = await this.redis.client.zrangebyscore(
        zsetKey,
        '-inf',
        cutoffScore,
      );
      if (stale.length > 0) {
        const pipeline = this.redis.client.pipeline();
        pipeline.zremrangebyscore(zsetKey, '-inf', cutoffScore);
        for (const userId of stale) {
          pipeline.del(this.entryKey(userId));
        }
        await pipeline.exec();
      }
    }
  }
}
