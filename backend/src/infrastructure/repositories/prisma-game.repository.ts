import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma/prisma.service';
import { IGameRepository } from '../../domain/game/repositories/game.repository.interface';
import { Game } from '../../domain/game/entities/game.entity';
import { BoardState } from '../../domain/game/value-objects/board-state.vo';
import {
  GameStatus,
  GameType,
  PlayerColor,
  Winner,
  EndReason,
} from '../../shared/constants/game.constants';

/**
 * Prisma Game Repository
 * Implements game persistence using Prisma ORM
 */
@Injectable()
export class PrismaGameRepository implements IGameRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(game: Game): Promise<Game> {
    const created = await this.prisma.game.create({
      data: {
        id: game.id,
        status: game.status,
        gameType: game.gameType,
        ruleVersion: game.ruleVersion,
        whitePlayerId: game.whitePlayerId,
        blackPlayerId: game.blackPlayerId,
        whiteElo: game.whiteElo,
        blackElo: game.blackElo,
        aiLevel: game.aiLevel,
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
    const game = await this.prisma.game.findUnique({
      where: { id },
      include: {
        moves: {
          orderBy: { moveNumber: 'asc' },
        },
      },
    });

    if (!game) {
      return null;
    }

    console.log('📖 Loaded game from DB:', {
      id: game.id,
      status: game.status,
      moveCount: game.moves?.length || 0,
    });

    return this.toDomain(game);
  }

  async update(game: Game): Promise<Game> {
    console.log('🔍 Updating game:', {
      id: game.id,
      status: game.status,
    });

    const updated = await this.prisma.game.update({
      where: { id: game.id },
      data: {
        status: game.status,
        winner: game.winner,
        endReason: game.endReason,
        startedAt: game.startedAt,
        endedAt: game.endedAt,
      },
    });

    console.log('✅ Game updated in DB:', {
      id: updated.id,
    });

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
      where: { gameType },
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
    await this.prisma.game.delete({
      where: { id },
    });
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

  /**
   * Map Prisma model to domain entity
   */
  private toDomain(prismaGame: any): Game {
    return new Game(
      prismaGame.id,
      prismaGame.whitePlayerId,
      prismaGame.blackPlayerId,
      prismaGame.gameType as GameType,
      prismaGame.whiteElo,
      prismaGame.blackElo,
      prismaGame.aiLevel,
      // Use clock whiteTimeMs as initial time approximation if not stored, or default 10 mins
      Number(prismaGame.clock?.whiteTimeMs || 600000),

      prismaGame.clock
        ? {
            whiteTimeMs: Number(prismaGame.clock.whiteTimeMs),
            blackTimeMs: Number(prismaGame.clock.blackTimeMs),
            lastMoveAt: prismaGame.clock.lastMoveAt,
          }
        : undefined,

      prismaGame.createdAt,
      prismaGame.startedAt,
      prismaGame.endedAt,
      prismaGame.status as GameStatus,
      prismaGame.winner as Winner | null,
    );
  }
}
