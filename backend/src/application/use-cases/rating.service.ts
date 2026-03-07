import { Injectable } from '@nestjs/common';
import { Winner, GameType } from '../../shared/constants/game.constants';
import { PrismaService } from '../../infrastructure/database/prisma/prisma.service';

/**
 * RatingService
 * Calculates and atomically persists Elo rating changes after a game ends.
 * Both EndGameUseCase and MakeMoveUseCase delegate here to avoid duplication.
 */
@Injectable()
export class RatingService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Update Elo ratings for both players in a single atomic transaction.
   * Only applies to RANKED PvP games. No-ops for AI or unranked games.
   */
  async updateRatings(
    whitePlayerId: string,
    blackPlayerId: string | null,
    winner: Winner,
    gameType: GameType,
  ): Promise<void> {
    if (gameType !== GameType.RANKED || !blackPlayerId) return;

    await this.prisma.$transaction(async (tx) => {
      const [whiteRating, blackRating] = await Promise.all([
        tx.rating.upsert({
          where: { userId: whitePlayerId },
          create: { userId: whitePlayerId, rating: 1200, gamesPlayed: 0 },
          update: {},
        }),
        tx.rating.upsert({
          where: { userId: blackPlayerId },
          create: { userId: blackPlayerId, rating: 1200, gamesPlayed: 0 },
          update: {},
        }),
      ]);

      const scoreWhite =
        winner === Winner.WHITE ? 1 : winner === Winner.BLACK ? 0 : 0.5;

      const { newA: newWhite, newB: newBlack } = this.calculateElo(
        whiteRating.rating,
        blackRating.rating,
        scoreWhite,
        1 - scoreWhite,
        whiteRating.gamesPlayed,
        blackRating.gamesPlayed,
      );

      await Promise.all([
        tx.rating.update({
          where: { userId: whitePlayerId },
          data: { rating: newWhite, gamesPlayed: { increment: 1 } },
        }),
        tx.rating.update({
          where: { userId: blackPlayerId },
          data: { rating: newBlack, gamesPlayed: { increment: 1 } },
        }),
      ]);
    });
  }

  /** Standard Elo formula. K=32 for <30 games, K=16 otherwise. */
  private calculateElo(
    ratingA: number,
    ratingB: number,
    scoreA: number,
    scoreB: number,
    gamesA: number,
    gamesB: number,
  ): { newA: number; newB: number } {
    const kA = gamesA < 30 ? 32 : 16;
    const kB = gamesB < 30 ? 32 : 16;
    const expectedA = 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
    return {
      newA: Math.round(ratingA + kA * (scoreA - expectedA)),
      newB: Math.round(ratingB + kB * (scoreB - (1 - expectedA))),
    };
  }
}
