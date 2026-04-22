import { Injectable, Inject } from '@nestjs/common';
import type { IGameRepository } from '../../domain/game/repositories/game.repository.interface';
import { Game } from '../../domain/game/entities/game.entity';
import { GameStatus } from '../../shared/constants/game.constants';

@Injectable()
export class GetActiveGameUseCase {
  constructor(
    @Inject('IGameRepository')
    private readonly gameRepository: IGameRepository,
  ) {}

  async execute(userId: string): Promise<Game | null> {
    const activeGames = await this.gameRepository.findActiveGamesByPlayer(userId);
    
    if (activeGames.length > 0) {
      const game = activeGames[0];

      // If game is WAITING, only return if it was created in the last 15 minutes.
      // This prevents "zombie" invite games from showing up in the banner forever.
      if (game.status === GameStatus.WAITING) {
        const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000);
        if (game.createdAt < fifteenMinsAgo) {
          return null;
        }
      }

      return game;
    }
    
    return null;
  }
}
