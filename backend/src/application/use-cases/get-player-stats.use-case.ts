import { Injectable, Inject } from '@nestjs/common';
import type { IGameRepository, PlayerStats } from '../../domain/game/repositories/game.repository.interface';

@Injectable()
export class GetPlayerStatsUseCase {
  constructor(
    @Inject('IGameRepository')
    private readonly gameRepository: IGameRepository,
  ) {}

  async execute(playerId: string): Promise<PlayerStats> {
    return this.gameRepository.getPlayerStats(playerId);
  }
}
