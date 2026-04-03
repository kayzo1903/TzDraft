import { Injectable, Inject, Logger, forwardRef } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type {
  IMatchmakingRepository,
  MatchmakingEntry,
} from '../../domain/game/repositories/matchmaking.repository.interface';
import { Game } from '../../domain/game/entities/game.entity';
import { GameStatus, GameType } from '../../shared/constants/game.constants';
import { PrismaService } from '../../infrastructure/database/prisma/prisma.service';
import { MatchmakingAnalyticsService } from '../../infrastructure/analytics/matchmaking-analytics.service';
import { GamesGateway } from '../../infrastructure/messaging/games.gateway';

/** Stale queue entries older than this are removed on each enqueue. */
const STALE_QUEUE_AGE_MS = 1 * 60 * 1000; // 1 minute

export type JoinQueueResult =
  | { status: 'waiting' }
  | { status: 'matched'; gameId: string; opponentUserId: string };

@Injectable()
export class JoinQueueUseCase {
  private readonly logger = new Logger(JoinQueueUseCase.name);

  constructor(
    @Inject('IMatchmakingRepository')
    private readonly matchmakingRepo: IMatchmakingRepository,
    private readonly prisma: PrismaService,
    private readonly matchmakingAnalytics: MatchmakingAnalyticsService,
    @Inject(forwardRef(() => GamesGateway))
    private readonly gateway: GamesGateway,
  ) {}

  /**
   * Create a matched game in Postgres between userId and opponent.
   * Returns the new game's id and opponentUserId.
   */
  private async createMatchedGame(
    userId: string,
    opponent: MatchmakingEntry,
    timeMs: number,
  ): Promise<{ gameId: string; opponentUserId: string }> {
    const [whiteId, blackId] =
      Math.random() < 0.5
        ? [userId, opponent.userId]
        : [opponent.userId, userId];

    const game = new Game(
      randomUUID(),
      whiteId,
      blackId,
      GameType.RANKED,
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
        gameType: game.gameType as any,
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

    this.scheduleNoShowCheck(game.id);
    return { gameId: game.id, opponentUserId: opponent.userId };
  }

  /**
   * 30-second server-side safety net: if neither player makes a move after
   * matchmaking, auto-abort the game so the waiting player isn't stranded.
   * The frontend abort (on cancel/timeout) covers the normal case; this
   * covers tab-close and network drop at the exact moment of matching.
   */
  private scheduleNoShowCheck(gameId: string): void {
    if (
      typeof this.prisma.game?.findUnique !== 'function' ||
      typeof this.prisma.game?.update !== 'function'
    ) {
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const game = await this.prisma.game.findUnique({
          where: { id: gameId },
          include: { moves: { take: 1 } },
        });
        if (!game || game.status !== GameStatus.ACTIVE || game.moves.length > 0)
          return;

        await this.prisma.game.update({
          where: { id: gameId },
          data: { status: GameStatus.ABORTED, endedAt: new Date() },
        });
        this.gateway?.emitGameOver(gameId, {
          gameId,
          winner: 'NONE',
          reason: 'no_show',
        });
        this.logger.log(
          `[NO-SHOW] Auto-aborted game ${gameId} — no moves after 30s`,
        );
      } catch (err) {
        this.logger.error(`[NO-SHOW] Check failed for game ${gameId}`, err);
      }
    }, 30_000);

    timer.unref?.();
  }

  async execute(
    userId: string,
    timeMs: number,
    socketId: string,
    userRating?: number | null,
  ): Promise<JoinQueueResult> {
    this.logger.log(
      `[QUEUE] user=${userId} timeMs=${timeMs} rating=${userRating ?? 'null'}`,
    );

    // 1. Remove stale entries (Redis TTL handles this automatically, but
    //    we also clean up explicitly to keep queue counts accurate).
    await this.matchmakingRepo.removeStale(STALE_QUEUE_AGE_MS);

    // 2. Remove any existing entry for this user so they re-queue fresh.
    await this.matchmakingRepo.remove(userId);

    // 3. Prevent queueing while already in an ACTIVE game.
    //    WAITING games are solo invite lobbies — they must not block matchmaking.
    const selfActiveGameCount = await this.prisma.game.count({
      where: {
        status: GameStatus.ACTIVE,
        gameType: { not: 'AI' },
        OR: [{ whitePlayerId: userId }, { blackPlayerId: userId }],
      },
    });
    if (selfActiveGameCount > 0) {
      this.logger.warn(
        `[QUEUE] user=${userId} blocked — already in ACTIVE game`,
      );
      return { status: 'waiting' };
    }

    await this.matchmakingAnalytics.startSearch(userId, timeMs);

    // 4. Atomically find and claim an opponent from the queue.
    //    RedisMatchmakingRepository uses a Lua script; PrismaMatchmakingRepository
    //    uses a Postgres $transaction — both guarantee only one worker claims each entry.
    const opponent = await this.matchmakingRepo.findAndClaimMatch(
      timeMs,
      userId,
      userRating,
    );
    this.logger.log(
      `[QUEUE] step4 user=${userId} opponent=${opponent?.userId ?? 'null'}`,
    );

    if (opponent) {
      // 5. Double-check the opponent is not already in a live game.
      const opponentActiveGameCount = await this.prisma.game.count({
        where: {
          // WAITING invite lobbies are not live games and must not block matchmaking.
          status: GameStatus.ACTIVE,
          OR: [
            { whitePlayerId: opponent.userId },
            { blackPlayerId: opponent.userId },
          ],
        },
      });

      if (opponentActiveGameCount > 0) {
        // Opponent slipped into another game between enqueue and claim.
        // Re-add this user to the queue, then run race-condition recovery
        // in case another user upserted concurrently.
        await this.matchmakingRepo.upsert({
          userId,
          timeMs,
          socketId,
          rating: userRating ?? null,
          rd: null,
          volatility: null,
        });
        const recoveredOpponent = await this.matchmakingRepo.findAndClaimMatch(
          timeMs,
          userId,
          userRating,
        );
        if (recoveredOpponent) {
          const { gameId, opponentUserId } = await this.createMatchedGame(
            userId,
            recoveredOpponent,
            timeMs,
          );
          await this.matchmakingAnalytics.markMatchedUsers(
            [userId, opponentUserId],
            gameId,
          );
          return { status: 'matched', gameId, opponentUserId };
        }
        return { status: 'waiting' };
      }

      // 6. Create the game and return matched result.
      const { gameId, opponentUserId } = await this.createMatchedGame(
        userId,
        opponent,
        timeMs,
      );
      await this.matchmakingAnalytics.markMatchedUsers(
        [userId, opponentUserId],
        gameId,
      );
      this.logger.log(
        `[QUEUE] step6 matched user=${userId} vs ${opponentUserId} gameId=${gameId}`,
      );
      return { status: 'matched', gameId, opponentUserId };
    }

    // 7. No match found — add this user to the queue.
    this.logger.log(`[QUEUE] step7 user=${userId} upserting into queue`);
    await this.matchmakingRepo.upsert({
      userId,
      timeMs,
      socketId,
      rating: userRating ?? null,
      rd: null,
      volatility: null,
    });

    // 7b. Race-condition recovery: a concurrent user may have upserted between
    //     our findAndClaimMatch (step 4) and our own upsert above — check once more.
    const lateOpponent = await this.matchmakingRepo.findAndClaimMatch(
      timeMs,
      userId,
      userRating,
    );
    this.logger.log(
      `[QUEUE] step7b user=${userId} lateOpponent=${lateOpponent?.userId ?? 'null'}`,
    );

    if (lateOpponent) {
      const { gameId, opponentUserId } = await this.createMatchedGame(
        userId,
        lateOpponent,
        timeMs,
      );
      await this.matchmakingAnalytics.markMatchedUsers(
        [userId, opponentUserId],
        gameId,
      );
      // The opponent is waiting in the queue (not making an HTTP call), so we
      // must push the matchFound event to them via the WebSocket gateway.
      // We return the opponent's userId so the controller can do the emit.
      this.logger.log(
        `[QUEUE] step7b matched user=${userId} vs ${opponentUserId} gameId=${gameId}`,
      );
      return { status: 'matched', gameId, opponentUserId };
    }

    this.logger.log(`[QUEUE] result user=${userId} => waiting`);
    return { status: 'waiting' };
  }

  async cancelQueue(userId: string): Promise<void> {
    await this.matchmakingAnalytics.closeSearch(userId);
    await this.matchmakingRepo.remove(userId);
  }
}
