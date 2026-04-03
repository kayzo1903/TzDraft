import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma/prisma.service';

const SEARCH_TIMEOUT_MS = 60_000;

type SearchRow = {
  id: string;
  started_at: Date;
};

@Injectable()
export class MatchmakingAnalyticsService {
  private readonly logger = new Logger(MatchmakingAnalyticsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async startSearch(userId: string, timeMs: number): Promise<void> {
    const now = new Date();

    try {
      await this.prisma.$transaction([
        this.prisma.$executeRaw`
          UPDATE "matchmaking_searches"
          SET
            "status" = 'CANCELLED',
            "ended_at" = ${now},
            "cancel_reason" = 'requeued'
          WHERE "user_id" = ${userId}
            AND "status" = 'SEARCHING'
        `,
        this.prisma.$executeRaw`
          INSERT INTO "matchmaking_searches" (
            "id",
            "user_id",
            "time_ms",
            "status",
            "started_at"
          )
          VALUES (
            ${randomUUID()},
            ${userId},
            ${timeMs},
            'SEARCHING',
            ${now}
          )
        `,
      ]);
    } catch (error) {
      if (this.isMissingTable(error)) {
        this.logger.warn(
          'matchmaking_searches table missing — skipping startSearch analytics',
        );
        return;
      }
      throw error;
    }
  }

  private async markMatched(userId: string, gameId: string): Promise<void> {
    const now = new Date();

    await this.prisma.$executeRaw`
      UPDATE "matchmaking_searches"
      SET
        "status" = 'MATCHED',
        "matched_at" = ${now},
        "ended_at" = ${now},
        "game_id" = ${gameId}
      WHERE "id" = (
        SELECT "id"
        FROM "matchmaking_searches"
        WHERE "user_id" = ${userId}
          AND "status" = 'SEARCHING'
        ORDER BY "started_at" DESC
        LIMIT 1
      )
    `;
  }

  async markMatchedUsers(userIds: string[], gameId: string): Promise<void> {
    try {
      await Promise.all(
        userIds.map((userId) => this.markMatched(userId, gameId)),
      );
    } catch (error) {
      if (this.isMissingTable(error)) {
        this.logger.warn(
          'matchmaking_searches table missing — skipping markMatchedUsers analytics',
        );
        return;
      }
      throw error;
    }
  }

  async closeSearch(userId: string): Promise<void> {
    try {
      const [openSearch] = await this.prisma.$queryRaw<SearchRow[]>(Prisma.sql`
        SELECT "id", "started_at"
        FROM "matchmaking_searches"
        WHERE "user_id" = ${userId}
          AND "status" = 'SEARCHING'
        ORDER BY "started_at" DESC
        LIMIT 1
      `);

      if (!openSearch) return;

      const now = new Date();
      const elapsedMs =
        now.getTime() - new Date(openSearch.started_at).getTime();
      const isExpired = elapsedMs >= SEARCH_TIMEOUT_MS;

      await this.prisma.$executeRaw`
        UPDATE "matchmaking_searches"
        SET
          "status" = ${isExpired ? 'EXPIRED' : 'CANCELLED'},
          "ended_at" = ${now},
          "cancel_reason" = ${isExpired ? 'timeout' : 'cancelled'}
        WHERE "id" = ${openSearch.id}
      `;
    } catch (error) {
      if (this.isMissingTable(error)) {
        this.logger.warn(
          'matchmaking_searches table missing — skipping closeSearch analytics',
        );
        return;
      }
      throw error;
    }
  }

  private isMissingTable(error: unknown): boolean {
    if (!(error instanceof Error)) return false;
    return error.message.includes(
      'relation "matchmaking_searches" does not exist',
    );
  }
}
