import { Injectable, Inject } from '@nestjs/common';
import type { IGameRepository } from '../../domain/game/repositories/game.repository.interface';
import type { IMoveRepository } from '../../domain/game/repositories/move.repository.interface';
import { Game } from '../../domain/game/entities/game.entity';
import { Move } from '../../domain/game/entities/move.entity';
import { UserService } from '../../domain/user/user.service';
import { User } from '@prisma/client';

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
    private readonly userService: UserService,
  ) {}

  /**
   * Get complete game state
   */
  async execute(gameId: string): Promise<{
    game: Game;
    moves: Move[];
    players: { white: User | null; black: User | null };
  }> {
    const game = await this.gameRepository.findById(gameId);
    if (!game) {
      throw new Error('Game not found');
    }

    const moves = await this.moveRepository.findByGameId(gameId);
    const players = await this.getPlayers(game);

    return {
      game,
      moves,
      players,
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
    players: { white: User | null; black: User | null };
  }> {
    const game = await this.gameRepository.findById(gameId);
    if (!game) {
      throw new Error('Game not found');
    }

    const [moves, totalMoves] = await Promise.all([
      this.moveRepository.findByGameIdPaginated(gameId, skip, take),
      this.moveRepository.countByGameId(gameId),
    ]);

    const players = await this.getPlayers(game);

    return {
      game,
      moves,
      totalMoves,
      players,
    };
  }

  private async getPlayers(
    game: Game,
  ): Promise<{ white: User | null; black: User | null }> {
    const [white, black] = await Promise.all([
      this.userService.findById(game.whitePlayerId),
      game.blackPlayerId
        ? this.userService.findById(game.blackPlayerId)
        : Promise.resolve(null),
    ]);

    return { white, black };
  }
}
