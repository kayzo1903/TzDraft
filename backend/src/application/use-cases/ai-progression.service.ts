import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../infrastructure/database/prisma/prisma.service';

const INITIAL_FREE_AI_LEVELS = 5;
const TOTAL_AI_LEVELS = 19;
type AiChallengeResult = 'WIN' | 'LOSS' | 'DRAW';

interface AiProgressRatingRow {
  highestAiLevelPlayed: number | null;
  highestAiLevelBeaten: number | null;
  highestUnlockedAiLevel: number | null;
}

interface AiSessionRow {
  userId: string;
  aiLevel: number;
  completedAt: Date | null;
}

export interface AiProgressionSummary {
  highestAiLevelPlayed: number;
  highestAiLevelBeaten: number;
  highestUnlockedAiLevel: number;
  completedLevels: number[];
  initialFreeLevels: number;
  totalLevels: number;
}

@Injectable()
export class AiProgressionService {
  constructor(private readonly prisma: PrismaService) {}

  async getProgression(userId: string): Promise<AiProgressionSummary> {
    await this.ensureRating(userId);
    const rating = await this.getRatingProgress(userId);
    const completed = await this.prisma.$queryRaw<Array<{ aiLevel: number }>>`
      SELECT DISTINCT ai_level AS "aiLevel"
      FROM ai_challenge_sessions
      WHERE user_id = ${userId}
        AND result = 'WIN'
        AND undo_used = false
        AND completed_at IS NOT NULL
      ORDER BY ai_level ASC
    `;

    return {
      highestAiLevelPlayed: rating.highestAiLevelPlayed ?? 0,
      highestAiLevelBeaten: rating.highestAiLevelBeaten ?? 0,
      highestUnlockedAiLevel: rating.highestUnlockedAiLevel ?? INITIAL_FREE_AI_LEVELS,
      completedLevels: completed.map((entry) => entry.aiLevel),
      initialFreeLevels: INITIAL_FREE_AI_LEVELS,
      totalLevels: TOTAL_AI_LEVELS,
    };
  }

  async startSession(
    userId: string,
    aiLevel: number,
    playerColor: 'WHITE' | 'BLACK',
  ): Promise<{ sessionId: string; progression: AiProgressionSummary }> {
    this.assertAiLevel(aiLevel);
    const sessionId = randomUUID();

    await this.ensureRating(userId);
    const rating = await this.getRatingProgress(userId);
    const unlockedLevel = rating.highestUnlockedAiLevel ?? INITIAL_FREE_AI_LEVELS;
    if (aiLevel > unlockedLevel) {
      throw new BadRequestException(`AI level ${aiLevel} is still locked for this user`);
    }

    await this.prisma.$transaction([
      this.prisma.$executeRaw`
        UPDATE ratings
        SET highest_ai_level_played = GREATEST(COALESCE(highest_ai_level_played, 0), ${aiLevel})
        WHERE user_id = ${userId}
      `,
      this.prisma.$executeRaw`
        INSERT INTO ai_challenge_sessions (id, user_id, ai_level, player_color)
        VALUES (${sessionId}, ${userId}, ${aiLevel}, ${playerColor})
      `,
    ]);

    return {
      sessionId,
      progression: await this.getProgression(userId),
    };
  }

  async completeSession(
    userId: string,
    sessionId: string,
    result: AiChallengeResult,
    undoUsed: boolean,
  ): Promise<AiProgressionSummary> {
    const session = await this.getSession(sessionId);

    if (!session) {
      throw new NotFoundException('AI challenge session not found');
    }

    if (session.userId !== userId) {
      throw new ForbiddenException('You cannot complete this AI challenge session');
    }

    if (session.completedAt) {
      throw new BadRequestException('AI challenge session has already been completed');
    }

    await this.ensureRating(userId);
    await this.prisma.$executeRaw`
      UPDATE ai_challenge_sessions
      SET result = ${result}, undo_used = ${undoUsed}, completed_at = NOW()
      WHERE id = ${sessionId}
    `;

    if (result === 'WIN' && !undoUsed) {
      const rating = await this.getRatingProgress(userId);
      const nextUnlockedLevel =
        (rating.highestUnlockedAiLevel ?? INITIAL_FREE_AI_LEVELS) <= session.aiLevel
          ? Math.min(TOTAL_AI_LEVELS, session.aiLevel + 1)
          : rating.highestUnlockedAiLevel ?? INITIAL_FREE_AI_LEVELS;

      await this.prisma.$executeRaw`
        UPDATE ratings
        SET
          highest_ai_level_beaten = GREATEST(COALESCE(highest_ai_level_beaten, 0), ${session.aiLevel}),
          highest_unlocked_ai_level = GREATEST(COALESCE(highest_unlocked_ai_level, ${INITIAL_FREE_AI_LEVELS}), ${nextUnlockedLevel})
        WHERE user_id = ${userId}
      `;
    }

    return this.getProgression(userId);
  }

  private async ensureRating(userId: string) {
    await this.prisma.rating.upsert({
      where: { userId },
      create: {
        userId,
        rating: 1200,
        gamesPlayed: 0,
      },
      update: {},
    });
  }

  private async getRatingProgress(userId: string): Promise<AiProgressRatingRow> {
    const [row] = await this.prisma.$queryRaw<AiProgressRatingRow[]>`
      SELECT
        highest_ai_level_played AS "highestAiLevelPlayed",
        highest_ai_level_beaten AS "highestAiLevelBeaten",
        highest_unlocked_ai_level AS "highestUnlockedAiLevel"
      FROM ratings
      WHERE user_id = ${userId}
      LIMIT 1
    `;

    return row ?? {
      highestAiLevelPlayed: 0,
      highestAiLevelBeaten: 0,
      highestUnlockedAiLevel: INITIAL_FREE_AI_LEVELS,
    };
  }

  private async getSession(sessionId: string): Promise<AiSessionRow | null> {
    const [row] = await this.prisma.$queryRaw<AiSessionRow[]>`
      SELECT
        user_id AS "userId",
        ai_level AS "aiLevel",
        completed_at AS "completedAt"
      FROM ai_challenge_sessions
      WHERE id = ${sessionId}
      LIMIT 1
    `;

    return row ?? null;
  }

  private assertAiLevel(aiLevel: number) {
    if (!Number.isInteger(aiLevel) || aiLevel < 1 || aiLevel > TOTAL_AI_LEVELS) {
      throw new BadRequestException(`AI level must be between 1 and ${TOTAL_AI_LEVELS}`);
    }
  }
}
