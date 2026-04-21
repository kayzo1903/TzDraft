export interface MatchmakingEntry {
  id: string;
  userId: string;
  timeMs: number;
  socketId: string;
  joinedAt: Date;
  rating?: number | null;
  rd?: number | null;
  volatility?: number | null;
}

export interface IMatchmakingRepository {
  /** Insert or replace the queue entry for a user (upsert by userId). */
  upsert(
    entry: Omit<MatchmakingEntry, 'id' | 'joinedAt'>,
  ): Promise<MatchmakingEntry>;

  /** Find the oldest waiting entry for the given timeMs, excluding the given userId. */
  findOldestMatch(
    timeMs: number,
    excludeUserId: string,
  ): Promise<MatchmakingEntry | null>;

  /**
   * Atomically find and claim (remove) the oldest waiting opponent matching
   * the given timeMs and optional Elo window (±200 pts when both players are rated).
   * Returns the claimed entry, or null if no suitable opponent was found.
   */
  findAndClaimMatch(
    timeMs: number,
    excludeUserId: string,
    userRating?: number | null,
  ): Promise<MatchmakingEntry | null>;

  /** Remove the queue entry for a user. No-op if not queued. */
  remove(userId: string): Promise<void>;

  /** Remove entries older than the given age in milliseconds. */
  removeStale(maxAgeMs: number): Promise<void>;

  /** Count total number of players currently searching in the queue. */
  count(): Promise<number>;
}
