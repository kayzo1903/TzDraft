import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma/prisma.service';
import { IMoveRepository } from '../../domain/game/repositories/move.repository.interface';
import { Move } from '../../domain/game/entities/move.entity';
import { Position } from '../../domain/game/value-objects/position.vo';
import { PlayerColor } from '../../shared/constants/game.constants';

/**
 * Prisma Move Repository
 * Implements move persistence using Prisma ORM
 */
@Injectable()
export class PrismaMoveRepository implements IMoveRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(move: Move): Promise<Move> {
    const created = await this.prisma.move.create({
      data: {
        id: move.id,
        gameId: move.gameId,
        moveNumber: move.moveNumber,
        player: move.player,
        fromSquare: move.from.value,
        toSquare: move.to.value,
        capturedSquares: move.capturedSquares.map((p) => p.value),
        isPromotion: move.isPromotion,
        isMultiCapture: move.isMultiCapture(),
        notation: move.notation,
        createdAt: move.createdAt,
      },
    });

    return this.toDomain(created);
  }

  async findById(id: string): Promise<Move | null> {
    const move = await this.prisma.move.findUnique({
      where: { id },
    });

    if (!move) {
      return null;
    }

    return this.toDomain(move);
  }

  async findByGameId(gameId: string): Promise<Move[]> {
    const moves = await this.prisma.move.findMany({
      where: { gameId },
      orderBy: { moveNumber: 'asc' },
    });

    return moves.map((m) => this.toDomain(m));
  }

  async findByGameIdPaginated(
    gameId: string,
    skip: number,
    take: number,
  ): Promise<Move[]> {
    const moves = await this.prisma.move.findMany({
      where: { gameId },
      orderBy: { moveNumber: 'asc' },
      skip,
      take,
    });

    return moves.map((m) => this.toDomain(m));
  }

  async countByGameId(gameId: string): Promise<number> {
    return this.prisma.move.count({
      where: { gameId },
    });
  }

  async getLastMove(gameId: string): Promise<Move | null> {
    const move = await this.prisma.move.findFirst({
      where: { gameId },
      orderBy: { moveNumber: 'desc' },
    });

    if (!move) {
      return null;
    }

    return this.toDomain(move);
  }

  async deleteByGameId(gameId: string): Promise<void> {
    await this.prisma.move.deleteMany({
      where: { gameId },
    });
  }

  /**
   * Map Prisma model to domain entity
   */
  private toDomain(prismaMove: any): Move {
    return new Move(
      prismaMove.id,
      prismaMove.gameId,
      prismaMove.moveNumber,
      prismaMove.player as PlayerColor,
      new Position(prismaMove.fromSquare),
      new Position(prismaMove.toSquare),
      prismaMove.capturedSquares.map((s: number) => new Position(s)),
      prismaMove.isPromotion,
      prismaMove.notation,
      prismaMove.createdAt,
    );
  }
}
