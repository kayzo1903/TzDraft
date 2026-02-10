import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import type { IGameRepository } from '../../domain/game/repositories/game.repository.interface';
import { Game } from '../../domain/game/entities/game.entity';
import { GameType, PlayerColor } from '../../shared/constants/game.constants';
import { randomUUID } from 'crypto';

/**
 * Create Game Use Case
 * Handles game creation for PvP and PvE modes
 */
@Injectable()
export class CreateGameUseCase {
  constructor(
    @Inject('IGameRepository')
    private readonly gameRepository: IGameRepository,
  ) {}

  /**
   * Create a new PvP game
   */
  async createPvPGame(
    whitePlayerId: string,
    blackPlayerId: string,
    whiteElo: number,
    blackElo: number,
  ): Promise<Game> {
    const game = new Game(
      randomUUID(),
      whitePlayerId,
      blackPlayerId,
      GameType.RANKED,
      whiteElo,
      blackElo,
      null,
      600000, // Default 10 mins for PvP for now (TODO: Add time selection for PvP)
      undefined,
    );

    game.start();
    return this.gameRepository.create(game);
  }

  /**
   * Create a new PvE game (Player vs AI)
   */
  async createPvEGame(
    playerId: string,
    playerColor: PlayerColor,
    playerElo: number,
    aiLevel: number,
    dto: { initialTimeMs?: number } = {},
  ): Promise<Game> {
    const whitePlayerId = playerColor === PlayerColor.WHITE ? playerId : 'AI';
    const blackPlayerId = playerColor === PlayerColor.BLACK ? playerId : 'AI';
    const whiteElo = playerColor === PlayerColor.WHITE ? playerElo : null;
    const blackElo = playerColor === PlayerColor.BLACK ? playerElo : null;

    const game = new Game(
      randomUUID(),
      whitePlayerId,
      blackPlayerId,
      GameType.AI,
      whiteElo,
      blackElo,
      aiLevel,
      dto.initialTimeMs || 600000,
      undefined, // clockInfo
    );

    game.start();
    return this.gameRepository.create(game);
  }

  /**
   * Find game by ID
   */
  async findGameById(gameId: string): Promise<Game> {
    const game = await this.gameRepository.findById(gameId);

    if (!game) {
      throw new NotFoundException(`Game with ID ${gameId} not found`);
    }

    return game;
  }
}
