import { Injectable, Inject } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { IMatchmakingRepository } from '../../domain/game/repositories/matchmaking.repository.interface';
import { Game } from '../../domain/game/entities/game.entity';
import { GameStatus, GameType } from '../../shared/constants/game.constants';
import { PrismaService } from '../../infrastructure/database/prisma/prisma.service';

/** Stale queue entries older than this are removed on each enqueue. */
const STALE_QUEUE_AGE_MS = 1 * 60 * 1000; // 1 minute

export type JoinQueueResult =
  | { status: 'waiting' }
  | { status: 'matched'; gameId: string; opponentUserId: string };

@Injectable()
export class JoinQueueUseCase {
  constructor(
    @Inject('IMatchmakingRepository')
    private readonly matchmakingRepo: IMatchmakingRepository,
    private readonly prisma: PrismaService,
  ) {}

  async execute(
    userId: string,
    timeMs: number,
    socketId: string,
    userRating?: number | null,
  ): Promise<JoinQueueResult> {
    // 1. Remove stale entries (Redis TTL handles this automatically, but
    //    we also clean up explicitly to keep queue counts accurate).
    await this.matchmakingRepo.removeStale(STALE_QUEUE_AGE_MS);

    // 2. Remove any existing entry for this user so they re-queue fresh.
    await this.matchmakingRepo.remove(userId);

    // 3. Prevent queueing while already in a live game (authoritative check via Postgres).
    const selfActiveGameCount = await this.prisma.game.count({
      where: {
        status: { in: [GameStatus.WAITING, GameStatus.ACTIVE] },
        OR: [{ whitePlayerId: userId }, { blackPlayerId: userId }],
      },
    });
    if (selfActiveGameCount > 0) {
      return { status: 'waiting' };
    }

    // 4. Atomically find and claim an opponent from the queue.
    //    RedisMatchmakingRepository uses a Lua script; PrismaMatchmakingRepository
    //    uses a Postgres $transaction — both guarantee only one worker claims each entry.
    const opponent = await this.matchmakingRepo.findAndClaimMatch(
      timeMs,
      userId,
      userRating,
    );

    if (opponent) {
      // 5. Double-check the opponent is not already in a live game.
      const opponentActiveGameCount = await this.prisma.game.count({
        where: {
          status: { in: [GameStatus.WAITING, GameStatus.ACTIVE] },
          OR: [
            { whitePlayerId: opponent.userId },
            { blackPlayerId: opponent.userId },
          ],
        },
      });

      if (opponentActiveGameCount > 0) {
        // Opponent slipped into another game between enqueue and claim.
        // Re-add this user to the queue and return waiting.
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

      // 6. Randomly assign colors and create the game in Postgres.
      const [whiteId, blackId] =
        Math.random() < 0.5
          ? [userId, opponent.userId]
          : [opponent.userId, userId];

      const game = new Game(
        randomUUID(),
        whiteId,
        blackId,
        GameType.CASUAL,
        null,
        null,
        null,
        timeMs,
        undefined,
      );
      game.start();

      await this.prisma.game.create({
        data: {
          id: game.id,
          status: game.status,
          gameType: game.gameType,
          ruleVersion: game.ruleVersion,
          initialTimeMs: game.initialTimeMs,
          whitePlayerId: game.whitePlayerId,
          blackPlayerId: game.blackPlayerId,
          whiteElo: game.whiteElo,
          blackElo: game.blackElo,
          aiLevel: game.aiLevel,
          inviteCode: game.inviteCode,
          creatorColor: game.creatorColor,
          winner: game.winner,
          endReason: game.endReason,
          createdAt: game.createdAt,
          startedAt: game.startedAt,
          endedAt: game.endedAt,
          clock: {
            create: {
              whiteTimeMs: game.initialTimeMs,
              blackTimeMs: game.initialTimeMs,
              lastMoveAt: new Date(),
            },
          },
        },
      });

      return {
        status: 'matched',
        gameId: game.id,
        opponentUserId: opponent.userId,
      };
    }

    // 7. No match found — add this user to the queue.
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
