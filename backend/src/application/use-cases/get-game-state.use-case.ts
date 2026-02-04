import { Injectable, Inject } from '@nestjs/common';
import type { IGameRepository } from '../../domain/game/repositories/game.repository.interface';
import type { IMoveRepository } from '../../domain/game/repositories/move.repository.interface';
import { Game } from '../../domain/game/entities/game.entity';
import { Move } from '../../domain/game/entities/move.entity';

/**
 * Get Game State Use Case
 * Retrieves complete game state including move history
 */
@Injectable()
export class GetGameStateUseCase {
  constructor(
    @Inject('IGameRepository')
    private readonly gameRepository: IGameRepository,
    @Inject('IMoveRepository')
    private readonly moveRepository: IMoveRepository,
  ) {}

  /**
   * Get complete game state
   */
  async execute(gameId: string): Promise<{
    game: Game;
    moves: Move[];
  }> {
    const game = await this.gameRepository.findById(gameId);
    if (!game) {
      throw new Error('Game not found');
    }

    const moves = await this.moveRepository.findByGameId(gameId);

    return {
      game,
      moves,
    };
  }

  /**
   * Get game with paginated moves
   */
  async executeWithPagination(
    gameId: string,
    skip: number,
    take: number,
  ): Promise<{
    game: Game;
    moves: Move[];
    totalMoves: number;
  }> {
    const game = await this.gameRepository.findById(gameId);
    if (!game) {
      throw new Error('Game not found');
    }

    const [moves, totalMoves] = await Promise.all([
      this.moveRepository.findByGameIdPaginated(gameId, skip, take),
      this.moveRepository.countByGameId(gameId),
    ]);

    return {
      game,
      moves,
      totalMoves,
    };
  }
}
