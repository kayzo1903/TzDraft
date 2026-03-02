import { Injectable, Inject } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { IMatchmakingRepository } from '../../domain/game/repositories/matchmaking.repository.interface';
import type { IGameRepository } from '../../domain/game/repositories/game.repository.interface';
import { Game } from '../../domain/game/entities/game.entity';
import { GameType, PlayerColor } from '../../shared/constants/game.constants';

/** Stale queue entries older than this are removed on each enqueue. */
const STALE_QUEUE_AGE_MS = 3 * 60 * 1000; // 3 minutes

export type JoinQueueResult =
  | { status: 'waiting' }
  | { status: 'matched'; gameId: string; opponentSocketId: string };

@Injectable()
export class JoinQueueUseCase {
  constructor(
    @Inject('IMatchmakingRepository')
    private readonly matchmakingRepo: IMatchmakingRepository,
    @Inject('IGameRepository')
    private readonly gameRepo: IGameRepository,
  ) {}

  async execute(
    userId: string,
    timeMs: number,
    socketId: string,
    userRating?: number | null,
  ): Promise<JoinQueueResult> {
    // 1. Clean up stale entries (older than 3 min) first
    await this.matchmakingRepo.removeStale(STALE_QUEUE_AGE_MS);

    // 2. Remove any existing entry for this user (re-queue with fresh socketId)
    await this.matchmakingRepo.remove(userId);

    // 3. Look for the oldest waiting entry with the same timeMs
    const opponent = await this.matchmakingRepo.findOldestMatch(timeMs, userId);

    if (opponent) {
      // 4a. Match found — remove opponent from queue and create game
      await this.matchmakingRepo.remove(opponent.userId);

      // Randomly assign colors
      const [whiteId, blackId] =
        Math.random() < 0.5
          ? [userId, opponent.userId]
          : [opponent.userId, userId];

      const game = new Game(
        randomUUID(),
        whiteId,
        blackId,
        GameType.CASUAL,
        null, // whiteElo — unused until rating system active
        null, // blackElo
        null,
        timeMs,
        undefined,
      );
      game.start();
      const created = await this.gameRepo.create(game);

      return {
        status: 'matched',
        gameId: created.id,
        opponentSocketId: opponent.socketId,
      };
    }

    // 4b. No match — add this user to the queue
    await this.matchmakingRepo.upsert({
      userId,
      timeMs,
      socketId,
      rating: userRating ?? null,
      rd: null,
      volatility: null,
    });

    return { status: 'waiting' };
  }

  async cancelQueue(userId: string): Promise<void> {
    await this.matchmakingRepo.remove(userId);
  }
}
