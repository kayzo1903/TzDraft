import { Injectable, Inject } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import type { IMatchmakingRepository } from '../../domain/game/repositories/matchmaking.repository.interface';
import { Game } from '../../domain/game/entities/game.entity';
import { GameStatus, GameType } from '../../shared/constants/game.constants';
import { PrismaService } from '../../infrastructure/database/prisma/prisma.service';

/** Stale queue entries older than this are removed on each enqueue. */
const STALE_QUEUE_AGE_MS = 1 * 60 * 1000; // 1 minute
const MAX_TX_RETRIES = 5;

export type JoinQueueResult =
  | { status: 'waiting' }
  | { status: 'matched'; gameId: string; opponentUserId: string };

type JoinQueueTxResult = JoinQueueResult | { status: 'retry' };

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
    for (let attempt = 0; attempt < MAX_TX_RETRIES; attempt += 1) {
      try {
        const txResult = await this.prisma.$transaction(
          async (tx): Promise<JoinQueueTxResult> => {
            // 1. Clean up stale entries first.
            const staleCutoff = new Date(Date.now() - STALE_QUEUE_AGE_MS);
            await tx.matchmakingQueue.deleteMany({
              where: { joinedAt: { lt: staleCutoff } },
            });

            // 2. Remove any existing entry for this user (re-queue with fresh socketId).
            await tx.matchmakingQueue.deleteMany({ where: { userId } });

            // Prevent queueing/matching while the user is already in a live game.
            const selfActiveGameCount = await tx.game.count({
              where: {
                status: { in: [GameStatus.WAITING, GameStatus.ACTIVE] },
                OR: [{ whitePlayerId: userId }, { blackPlayerId: userId }],
              },
            });

            if (selfActiveGameCount > 0) {
              return { status: 'waiting' };
            }

            // 3. Look for the oldest waiting entry with the same timeMs.
            const opponent = await tx.matchmakingQueue.findFirst({
              where: {
                timeMs,
                userId: { not: userId },
              },
              orderBy: { joinedAt: 'asc' },
            });

            if (opponent) {
              // 4a. Claim opponent atomically.
              const claim = await tx.matchmakingQueue.deleteMany({
                where: { id: opponent.id },
              });

              if (claim.count !== 1) {
                return { status: 'retry' };
              }

              // Ensure opponent did not enter another live game before this claim.
              const opponentActiveGameCount = await tx.game.count({
                where: {
                  status: { in: [GameStatus.WAITING, GameStatus.ACTIVE] },
                  OR: [
                    { whitePlayerId: opponent.userId },
                    { blackPlayerId: opponent.userId },
                  ],
                },
              });

              if (opponentActiveGameCount > 0) {
                return { status: 'retry' };
              }

              // Randomly assign colors.
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

              await tx.game.create({
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

            // 4b. No match: add this user to the queue.
            await tx.matchmakingQueue.upsert({
              where: { userId },
              update: {
                timeMs,
                socketId,
                joinedAt: new Date(),
                rating: userRating ?? null,
                rd: null,
                volatility: null,
              },
              create: {
                userId,
                timeMs,
                socketId,
                rating: userRating ?? null,
                rd: null,
                volatility: null,
              },
            });

            return { status: 'waiting' };
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        );

        if (txResult.status === 'retry') {
          continue;
        }

        return txResult;
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2034'
        ) {
          // Serialization failure / write conflict; retry transaction.
          continue;
        }
        throw error;
      }
    }

    // Fallback if all retries conflict under load.
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
