import { Injectable, Optional } from '@nestjs/common';
import { PrismaService } from '../database/prisma/prisma.service';
import { RedisService } from '../cache/redis.service';
import {
  IGameRepository,
  GameHistoryFilters,
  PlayerStats,
} from '../../domain/game/repositories/game.repository.interface';
import { Game } from '../../domain/game/entities/game.entity';
import {
  BoardState,
  PieceSnapshot,
} from '../../domain/game/value-objects/board-state.vo';
import {
  GameStatus,
  GameType,
  PlayerColor,
  Winner,
  EndReason,
} from '../../shared/constants/game.constants';

/** Active games cached for 30 s; completed games cached for 5 min. */
const ACTIVE_GAME_CACHE_TTL = 30;
const FINISHED_GAME_CACHE_TTL = 300;

function gameCacheKey(id: string): string {
  return `game:${id}`;
}

/**
 * Prisma Game Repository
 * Implements game persistence using Prisma ORM.
 * Active game reads are cached in Redis to reduce DB round-trips.
 */
@Injectable()
export class PrismaGameRepository implements IGameRepository {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly redisService?: RedisService,
  ) {}

  async create(game: Game): Promise<Game> {
    const created = await this.prisma.game.create({
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
        tournamentMatchGameId: game.tournamentMatchGameId,
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
      include: {
        clock: true,
      },
    });

    return this.toDomain(created);
  }

  async findById(id: string): Promise<Game | null> {
    // 1. Try cache
    if (this.redisService) {
      try {
        const cached = await this.redisService.get(gameCacheKey(id));
        if (cached) {
          return this.toDomain(JSON.parse(cached));
        }
      } catch {
        // Cache miss or Redis unavailable — fall through to DB
      }
    }

    // 2. Load from DB
    const game = await this.prisma.game.findUnique({
      where: { id },
      include: {
        moves: { orderBy: { moveNumber: 'asc' } },
        clock: true,
      },
    });

    if (!game) return null;

    // 3. Write to cache — skip WAITING games to avoid race conditions where a
    // concurrent joinInvite/startGame invalidates the key and a stale read
    // immediately re-populates it with blackPlayerId=null.
    if (this.redisService && game.status !== GameStatus.WAITING) {
      const isFinished =
        game.status === GameStatus.FINISHED ||
        game.status === GameStatus.ABORTED;
      const ttl = isFinished ? FINISHED_GAME_CACHE_TTL : ACTIVE_GAME_CACHE_TTL;
      this.redisService
        .setex(
          gameCacheKey(id),
          ttl,
          JSON.stringify(game, (_, v) =>
            typeof v === 'bigint' ? v.toString() : v,
          ),
        )
        .catch(() => {
          // Non-fatal — DB is the source of truth
        });
    }

    return this.toDomain(game);
  }

  async update(game: Game): Promise<Game> {
    const updated = await this.prisma.game.update({
      where: { id: game.id },
      data: {
        status: game.status,
        winner: game.winner,
        endReason: game.endReason,
        startedAt: game.startedAt,
        endedAt: game.endedAt,
        // Persist current board so future loads skip full move replay
        boardSnapshot: game.board.serialize(),
      },
    });

    // Invalidate cache so next read gets fresh data from DB
    if (this.redisService) {
      this.redisService.del(gameCacheKey(game.id)).catch(() => {});
    }

    return this.toDomain(updated);
  }

  async findActiveGamesByPlayer(playerId: string): Promise<Game[]> {
    const games = await this.prisma.game.findMany({
      where: {
        OR: [{ whitePlayerId: playerId }, { blackPlayerId: playerId }],
        status: {
          in: [GameStatus.WAITING, GameStatus.ACTIVE],
        },
      },
      include: {
        moves: {
          orderBy: { moveNumber: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return games.map((g) => this.toDomain(g));
  }

  async findByStatus(status: GameStatus): Promise<Game[]> {
    const games = await this.prisma.game.findMany({
      where: { status },
      include: {
        moves: {
          orderBy: { moveNumber: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return games.map((g) => this.toDomain(g));
  }

  async findByType(gameType: GameType): Promise<Game[]> {
    const games = await this.prisma.game.findMany({
      where: { gameType: gameType as any },
      include: {
        moves: {
          orderBy: { moveNumber: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return games.map((g) => this.toDomain(g));
  }

  async delete(id: string): Promise<void> {
    await this.prisma.game.delete({ where: { id } });
    if (this.redisService) {
      this.redisService.del(gameCacheKey(id)).catch(() => {});
    }
  }

  async findRecentGamesByPlayer(
    playerId: string,
    limit: number,
  ): Promise<Game[]> {
    const games = await this.prisma.game.findMany({
      where: {
        OR: [{ whitePlayerId: playerId }, { blackPlayerId: playerId }],
      },
      include: {
        moves: {
          orderBy: { moveNumber: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return games.map((g) => this.toDomain(g));
  }

  async countGamesByPlayer(playerId: string): Promise<number> {
    return this.prisma.game.count({
      where: {
        OR: [{ whitePlayerId: playerId }, { blackPlayerId: playerId }],
      },
    });
  }

  async findByInviteCode(code: string): Promise<Game | null> {
    const game = await this.prisma.game.findUnique({
      where: { inviteCode: code },
      include: { clock: true },
    });
    if (!game) return null;

    // Auto-expire WAITING invites that are older than 30 minutes
    if (game.status === GameStatus.WAITING) {
      const ageMs = Date.now() - game.createdAt.getTime();
      const THIRTY_MINUTES_MS = 30 * 60 * 1000;
      if (ageMs > THIRTY_MINUTES_MS) {
        await this.prisma.game.update({
          where: { id: game.id },
          data: { status: GameStatus.ABORTED },
        });
        return null; // Treat as expired / not found
      }
    }

    return this.toDomain(game);
  }

  async joinInvite(gameId: string, joinerId: string): Promise<Game> {
    // Creator may have taken either side — fill whichever slot is empty.
    // Status stays WAITING; the host will call startGame() when ready.
    const existing = await this.prisma.game.findUnique({
      where: { id: gameId },
    });
    if (!existing) throw new Error(`Game ${gameId} not found`);

    const slotData =
      existing.whitePlayerId === null
        ? { whitePlayerId: joinerId }
        : { blackPlayerId: joinerId };

    const updated = await this.prisma.game.update({
      where: { id: gameId },
      data: {
        ...slotData,
        // status stays WAITING — host must click "Start Game"
      },
      include: { clock: true },
    });

    // Invalidate cache so creator's next fetchGameState sees the joiner
    if (this.redisService) {
      this.redisService.del(gameCacheKey(gameId)).catch(() => {});
    }

    return this.toDomain(updated);
  }

  async startGame(gameId: string): Promise<Game> {
    const now = new Date();
    const updated = await this.prisma.game.update({
      where: { id: gameId },
      data: {
        status: GameStatus.ACTIVE,
        startedAt: now,
        // Reset clock so the first player's timer starts from now
        clock: { update: { lastMoveAt: now } },
      },
      include: { clock: true },
    });

    // Invalidate cache so both clients see ACTIVE status after the WS event
    if (this.redisService) {
      this.redisService.del(gameCacheKey(gameId)).catch(() => {});
    }

    return this.toDomain(updated);
  }

  async expireStaleInvitesByPlayer(creatorId: string): Promise<void> {
    // Abort all WAITING invite games where this player is the only player
    await this.prisma.game.updateMany({
      where: {
        status: GameStatus.WAITING,
        inviteCode: { not: null },
        OR: [
          { whitePlayerId: creatorId, blackPlayerId: null },
          { blackPlayerId: creatorId, whitePlayerId: null },
        ],
      },
      data: { status: GameStatus.ABORTED },
    });
  }

  async updateClock(
    gameId: string,
    whiteTimeMs: number,
    blackTimeMs: number,
    lastMoveAt: Date,
  ): Promise<void> {
    await this.prisma.clock.update({
      where: { gameId },
      data: { whiteTimeMs, blackTimeMs, lastMoveAt },
    });
  }

  async findCompletedGamesByPlayer(
    playerId: string,
    skip: number,
    take: number,
    filters?: GameHistoryFilters,
  ): Promise<{ games: Game[]; total: number }> {
    const where: any = {
      OR: [{ whitePlayerId: playerId }, { blackPlayerId: playerId }],
      status: GameStatus.FINISHED,
    };

    if (filters?.gameType) {
      where.gameType = filters.gameType;
    }

    if (filters?.result === 'WIN') {
      where.OR = [
        { whitePlayerId: playerId, winner: Winner.WHITE },
        { blackPlayerId: playerId, winner: Winner.BLACK },
      ];
      where.status = GameStatus.FINISHED;
    } else if (filters?.result === 'LOSS') {
      where.OR = [
        { whitePlayerId: playerId, winner: Winner.BLACK },
        { blackPlayerId: playerId, winner: Winner.WHITE },
      ];
      where.status = GameStatus.FINISHED;
    } else if (filters?.result === 'DRAW') {
      where.AND = [
        { OR: [{ whitePlayerId: playerId }, { blackPlayerId: playerId }] },
        { winner: Winner.DRAW },
        { status: GameStatus.FINISHED },
      ];
      delete where.OR;
    }

    const [prismaGames, total] = await Promise.all([
      this.prisma.game.findMany({
        where,
        orderBy: { endedAt: 'desc' },
        skip,
        take,
        // No moves needed for history list — saves bandwidth
        include: { clock: true },
      }),
      this.prisma.game.count({ where }),
    ]);

    return {
      games: prismaGames.map((g) => this.toDomain(g)),
      total,
    };
  }

  async getPlayerStats(playerId: string): Promise<PlayerStats> {
    const finished = await this.prisma.game.findMany({
      where: {
        OR: [{ whitePlayerId: playerId }, { blackPlayerId: playerId }],
        status: GameStatus.FINISHED,
      },
      select: {
        gameType: true,
        winner: true,
        whitePlayerId: true,
        blackPlayerId: true,
      },
    });

    const empty = { total: 0, wins: 0, losses: 0, draws: 0 };
    const byType: PlayerStats['byType'] = {
      AI: { ...empty },
      RANKED: { ...empty },
      CASUAL: { ...empty },
    };

    let wins = 0,
      losses = 0,
      draws = 0;

    for (const g of finished) {
      const isWhite = g.whitePlayerId === playerId;
      let result: 'win' | 'loss' | 'draw';

      if (g.winner === Winner.DRAW) {
        result = 'draw';
        draws++;
      } else if (
        (isWhite && g.winner === Winner.WHITE) ||
        (!isWhite && g.winner === Winner.BLACK)
      ) {
        result = 'win';
        wins++;
      } else {
        result = 'loss';
        losses++;
      }

      const bucket = byType[g.gameType as keyof typeof byType];
      if (bucket) {
        bucket.total++;
        if (result === 'win') bucket.wins++;
        else if (result === 'loss') bucket.losses++;
        else bucket.draws++;
      }
    }

    const total = finished.length;
    return {
      total,
      wins,
      losses,
      draws,
      winRate: total > 0 ? Math.round((wins / total) * 100) : 0,
      byType,
    };
  }

  /**
   * Map Prisma model to domain entity
   */
  private toDomain(prismaGame: any): Game {
    // Derive whose turn it is from how many moves have been played.
    // WHITE moves first (move 0), so even move count → WHITE, odd → BLACK.
    const moves: any[] = prismaGame.moves ?? [];
    const moveCount = moves.length;
    const currentTurn =
      moveCount % 2 === 0 ? PlayerColor.WHITE : PlayerColor.BLACK;

    const game = new Game(
      prismaGame.id,
      prismaGame.whitePlayerId,
      prismaGame.blackPlayerId,
      prismaGame.gameType as GameType,
      prismaGame.whiteElo,
      prismaGame.blackElo,
      prismaGame.aiLevel,
      // Use persisted game initial time; fall back only for pre-migration rows.
      Number(
        prismaGame.initialTimeMs ?? prismaGame.clock?.whiteTimeMs ?? 600000,
      ),

      prismaGame.clock
        ? {
            whiteTimeMs: Number(prismaGame.clock.whiteTimeMs),
            blackTimeMs: Number(prismaGame.clock.blackTimeMs),
            lastMoveAt: new Date(prismaGame.clock.lastMoveAt),
          }
        : undefined,

      prismaGame.createdAt,
      prismaGame.startedAt,
      prismaGame.endedAt,
      prismaGame.status as GameStatus,
      prismaGame.winner as Winner | null,
      (prismaGame.endReason as EndReason | null) ?? null,
      currentTurn, // derived from move history
      prismaGame.inviteCode ?? null,
      (prismaGame.creatorColor as PlayerColor | null) ?? null,
      prismaGame.tournamentMatchGameId ?? null,
      prismaGame.leagueGameId ?? null,
    );

    // Restore board state: use the stored snapshot when available (O(1)),
    // otherwise fall back to replaying all moves from history (O(n)).
    if (prismaGame.boardSnapshot) {
      game.restoreFromSnapshot(
        prismaGame.boardSnapshot as PieceSnapshot[],
        moves,
      );
    } else if (moves.length > 0) {
      game.replayMovesFromHistory(moves);
    }

    return game;
  }
}
