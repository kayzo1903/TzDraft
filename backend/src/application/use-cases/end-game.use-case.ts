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
  async resign(gameId: string, playerId: string): Promise<{ winner: Winner }> {
    const game = await this.gameRepository.findById(gameId);
    if (!game) {
      throw new BadRequestException('Game not found');
    }
    this.ensureParticipant(game, playerId);

    // Determine winner (opponent of resigning player)
    const winner =
      game.whitePlayerId === playerId ? Winner.BLACK : Winner.WHITE;

    game.endGame(winner, EndReason.RESIGN);
    await this.gameRepository.update(game);
    return { winner };
  }

  /**
   * End game by timeout
   */
  async timeout(gameId: string, playerId: string): Promise<void> {
    const game = await this.gameRepository.findById(gameId);
    if (!game) {
      throw new BadRequestException('Game not found');
    }
    this.ensureParticipant(game, playerId);

    // Determine winner (opponent of timed-out player)
    const winner =
      game.whitePlayerId === playerId ? Winner.BLACK : Winner.WHITE;

    game.endGame(winner, EndReason.TIME);
    await this.gameRepository.update(game);
  }

  /**
   * End game by agreement (draw)
   */
  async drawByAgreement(gameId: string, playerId: string): Promise<void> {
    const game = await this.gameRepository.findById(gameId);
    if (!game) {
      throw new BadRequestException('Game not found');
    }
    this.ensureParticipant(game, playerId);

    game.endGame(Winner.DRAW, EndReason.DRAW);
    await this.gameRepository.update(game);
  }

  /**
   * Abort game (before the requesting player has made their first move).
   * WHITE can abort until they make move #1 (moveCount < 1).
   * BLACK can abort until they make move #2 (moveCount < 2).
   */
  async abort(gameId: string, playerId: string): Promise<void> {
    const game = await this.gameRepository.findById(gameId);
    if (!game) {
      throw new BadRequestException('Game not found');
    }
    this.ensureParticipant(game, playerId);

    // Per-player eligibility: you can only abort before you have moved.
    const moveCount = game.getMoveCount();
    const isWhite = game.whitePlayerId === playerId;
    const hasMoved = isWhite ? moveCount >= 1 : moveCount >= 2;

    if (hasMoved) {
      throw new BadRequestException('Cannot abort after you have made a move');
    }

    game.abort();
    await this.gameRepository.update(game);
  }

  private ensureParticipant(
    game: { whitePlayerId: string; blackPlayerId: string | null },
    playerId: string,
  ): void {
    if (game.whitePlayerId !== playerId && game.blackPlayerId !== playerId) {
      throw new BadRequestException('Player not in this game');
    }
  }
}
