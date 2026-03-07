import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma/prisma.service';
import {
  IMatchmakingRepository,
  MatchmakingEntry,
} from '../../domain/game/repositories/matchmaking.repository.interface';

@Injectable()
export class PrismaMatchmakingRepository implements IMatchmakingRepository {
  constructor(private readonly prisma: PrismaService) {}

  async upsert(
    entry: Omit<MatchmakingEntry, 'id' | 'joinedAt'>,
  ): Promise<MatchmakingEntry> {
    const row = await this.prisma.matchmakingQueue.upsert({
      where: { userId: entry.userId },
      update: {
        timeMs: entry.timeMs,
        socketId: entry.socketId,
        joinedAt: new Date(),
        rating: entry.rating ?? null,
        rd: entry.rd ?? null,
        volatility: entry.volatility ?? null,
      },
      create: {
        userId: entry.userId,
        timeMs: entry.timeMs,
        socketId: entry.socketId,
        rating: entry.rating ?? null,
        rd: entry.rd ?? null,
        volatility: entry.volatility ?? null,
      },
    });
    return this.toDomain(row);
  }

  async findOldestMatch(
    timeMs: number,
    excludeUserId: string,
  ): Promise<MatchmakingEntry | null> {
    const row = await this.prisma.matchmakingQueue.findFirst({
      where: {
        timeMs,
        userId: { not: excludeUserId },
      },
      orderBy: { joinedAt: 'asc' },
    });
    return row ? this.toDomain(row) : null;
  }

  async findAndClaimMatch(
    timeMs: number,
    excludeUserId: string,
    userRating?: number | null,
  ): Promise<MatchmakingEntry | null> {
    const MAX_ELO_GAP = 200;
    const ratingFilter =
      userRating != null
        ? {
            OR: [
              { rating: null },
              {
                AND: [
                  { rating: { gte: userRating - MAX_ELO_GAP } },
                  { rating: { lte: userRating + MAX_ELO_GAP } },
                ],
              },
            ],
          }
        : {};

    return this.prisma.$transaction(async (tx) => {
      const row = await tx.matchmakingQueue.findFirst({
        where: { timeMs, userId: { not: excludeUserId }, ...ratingFilter },
        orderBy: { joinedAt: 'asc' },
      });
      if (!row) return null;

      const deleted = await tx.matchmakingQueue.deleteMany({
        where: { id: row.id },
      });
      // If another worker already deleted this row, abort and return null
      if (deleted.count !== 1) return null;

      return this.toDomain(row);
    });
  }

  async remove(userId: string): Promise<void> {
    await this.prisma.matchmakingQueue
      .delete({ where: { userId } })
      .catch(() => {
        // No-op if entry doesn't exist
      });
  }

  async removeStale(maxAgeMs: number): Promise<void> {
    const cutoff = new Date(Date.now() - maxAgeMs);
    await this.prisma.matchmakingQueue.deleteMany({
      where: { joinedAt: { lt: cutoff } },
    });
  }

  private toDomain(row: {
    id: string;
    userId: string;
    timeMs: number;
    socketId: string;
    joinedAt: Date;
    rating: number | null;
    rd: number | null;
    volatility: number | null;
  }): MatchmakingEntry {
    return {
      id: row.id,
      userId: row.userId,
      timeMs: row.timeMs,
      socketId: row.socketId,
      joinedAt: row.joinedAt,
      rating: row.rating,
      rd: row.rd,
      volatility: row.volatility,
    };
  }
}
