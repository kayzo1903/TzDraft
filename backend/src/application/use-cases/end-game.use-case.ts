import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import type { IGameRepository } from '../../domain/game/repositories/game.repository.interface';
import { Winner, EndReason } from '../../shared/constants/game.constants';

/**
 * End Game Use Case
 * Handles game termination (resignation, timeout, etc.)
 */
@Injectable()
export class EndGameUseCase {
  constructor(
    @Inject('IGameRepository')
    private readonly gameRepository: IGameRepository,
  ) {}

  /**
   * End game by resignation
   */
  async resign(gameId: string, playerId: string): Promise<void> {
    const game = await this.gameRepository.findById(gameId);
    if (!game) {
      throw new BadRequestException('Game not found');
    }

    // Determine winner (opponent of resigning player)
    const winner =
      game.whitePlayerId === playerId ? Winner.BLACK : Winner.WHITE;

    game.endGame(winner, EndReason.RESIGN);
    await this.gameRepository.update(game);
  }

  /**
   * End game by timeout
   */
  async timeout(gameId: string, playerId: string): Promise<void> {
    const game = await this.gameRepository.findById(gameId);
    if (!game) {
      throw new BadRequestException('Game not found');
    }

    // Determine winner (opponent of timed-out player)
    const winner =
      game.whitePlayerId === playerId ? Winner.BLACK : Winner.WHITE;

    game.endGame(winner, EndReason.TIME);
    await this.gameRepository.update(game);
  }

  /**
   * End game by agreement (draw)
   */
  async drawByAgreement(gameId: string): Promise<void> {
    const game = await this.gameRepository.findById(gameId);
    if (!game) {
      throw new BadRequestException('Game not found');
    }

    game.endGame(Winner.DRAW, EndReason.DRAW);
    await this.gameRepository.update(game);
  }

  /**
   * Abort game (before moves are made)
   */
  async abort(gameId: string): Promise<void> {
    const game = await this.gameRepository.findById(gameId);
    if (!game) {
      throw new BadRequestException('Game not found');
    }

    if (game.getMoveCount() > 0) {
      throw new BadRequestException('Cannot abort game after moves are made');
    }

    game.abort();
    await this.gameRepository.update(game);
  }
}
