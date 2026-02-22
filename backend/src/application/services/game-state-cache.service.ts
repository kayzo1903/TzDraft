import { Injectable, Logger } from '@nestjs/common';
import { Game } from '../../domain/game/entities/game.entity';

/**
 * GameStateCacheService
 *
 * In-memory store of the authoritative Game entity for every active game.
 *
 * WHY THIS EXISTS
 * ───────────────
 * Phase 2 introduced optimistic broadcasting: `gameStateUpdated` is emitted
 * to clients *before* the DB transaction completes. This creates a race window
 * where the next `makeMove` call arrives while the previous move's DB write is
 * still in-flight. Without this cache, `findById` would read the stale DB row
 * (move count unchanged → wrong `currentTurn`) and reject the incoming move.
 *
 * HOW IT WORKS
 * ────────────
 * 1. After in-memory validation & apply, `MakeMoveUseCase` stores the updated
 *    `Game` object here immediately (synchronous, 0 ms).
 * 2. Subsequent `makeMove`/`botMove` calls look here first; only fall back to
 *    the DB if no cache entry exists (cold start on restart).
 * 3. `invalidate()` removes the entry when a game finishes or errors out, so
 *    the next load always gets a fresh DB read.
 * 4. A TTL of 1 hour auto-evicts stale entries (e.g. abandoned games).
 */
@Injectable()
export class GameStateCacheService {
  private readonly logger = new Logger(GameStateCacheService.name);
  private readonly cache = new Map<
    string,
    { game: Game; expiresAt: number; ttlTimer: NodeJS.Timeout }
  >();

  /** Per-entry TTL: 1 hour of inactivity evicts the entry. */
  private readonly TTL_MS = 60 * 60 * 1000;

  /** Store / refresh the authoritative game state for a game. */
  set(game: Game): void {
    const existing = this.cache.get(game.id);
    if (existing) clearTimeout(existing.ttlTimer);

    const ttlTimer = setTimeout(() => {
      this.cache.delete(game.id);
      this.logger.debug(`Cache entry evicted (TTL) for game ${game.id}`);
    }, this.TTL_MS);

    // Allow the timer to be garbage-collected when the process exits.
    if (typeof ttlTimer.unref === 'function') ttlTimer.unref();

    this.cache.set(game.id, {
      game,
      expiresAt: Date.now() + this.TTL_MS,
      ttlTimer,
    });
  }

  /** Return the cached game entity, or null if not present. */
  get(gameId: string): Game | null {
    return this.cache.get(gameId)?.game ?? null;
  }

  /** Remove a game from the cache (call when game ends or on DB error). */
  invalidate(gameId: string): void {
    const entry = this.cache.get(gameId);
    if (!entry) return;
    clearTimeout(entry.ttlTimer);
    this.cache.delete(gameId);
    this.logger.debug(`Cache invalidated for game ${gameId}`);
  }

  /** Number of actively cached games (useful for monitoring). */
  get size(): number {
    return this.cache.size;
  }
}
