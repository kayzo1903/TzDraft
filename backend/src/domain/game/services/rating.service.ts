import { Injectable, Inject } from '@nestjs/common';
import { Game } from '../entities/game.entity';
import { Winner, GameType } from '../../../shared/constants/game.constants';
import { UserService } from '../../user/user.service';

@Injectable()
export class RatingService {
  private readonly K_FACTOR = 32;

  constructor(private readonly userService: UserService) {}

  async updateRatings(game: Game, winner: Winner): Promise<void> {
    if (game.gameType !== GameType.RANKED) {
      return;
    }

    if (!game.whitePlayerId || !game.blackPlayerId) {
      return; // Cannot rate games without two players
    }

    if (winner === Winner.DRAW) {
      await this.calculateAndApply(game.whitePlayerId, game.blackPlayerId, 0.5);
    } else if (winner === Winner.WHITE) {
      await this.calculateAndApply(game.whitePlayerId, game.blackPlayerId, 1);
    } else if (winner === Winner.BLACK) {
      await this.calculateAndApply(game.whitePlayerId, game.blackPlayerId, 0);
    }
  }

  private async calculateAndApply(
    playerAId: string,
    playerBId: string,
    actualScoreA: number,
  ): Promise<void> {
    const playerA = await this.userService.findById(playerAId);
    const playerB = await this.userService.findById(playerBId);

    if (!playerA || !playerB) return;

    const ratingA = playerA.rating?.rating || 1200;
    const ratingB = playerB.rating?.rating || 1200;

    const expectedScoreA = 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
    const expectedScoreB = 1 - expectedScoreA;

    const actualScoreB = 1 - actualScoreA;

    const newRatingA = Math.round(
      ratingA + this.K_FACTOR * (actualScoreA - expectedScoreA),
    );
    const newRatingB = Math.round(
      ratingB + this.K_FACTOR * (actualScoreB - expectedScoreB),
    );

    await this.userService.updateRating(playerAId, newRatingA);
    await this.userService.updateRating(playerBId, newRatingB);
  }
}
