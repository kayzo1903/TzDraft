import {
  Injectable,
  Inject,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import type { IGameRepository } from '../../domain/game/repositories/game.repository.interface';
import { Game } from '../../domain/game/entities/game.entity';
import { GameType, PlayerColor } from '../../shared/constants/game.constants';
import { randomUUID } from 'crypto';

import { GamesGateway } from '../../infrastructure/messaging/games.gateway';

/**
 * Create Game Use Case
 * Handles game creation for PvP and PvE modes
 */
@Injectable()
export class CreateGameUseCase {
  constructor(
    @Inject('IGameRepository')
    private readonly gameRepository: IGameRepository,
    @Inject(forwardRef(() => GamesGateway))
    private readonly gamesGateway: GamesGateway,
  ) {}

  /**
   * Create a new PvP game
   */
  async createPvPGame(
    whitePlayerId: string | null,
    blackPlayerId: string | null,
    whiteElo: number | null,
    blackElo: number | null,
    whiteGuestName?: string,
    blackGuestName?: string,
    gameType: GameType = GameType.RANKED,
  ): Promise<Game> {
    const game = new Game(
      randomUUID(),
      whitePlayerId,
      blackPlayerId,
      whiteGuestName || null,
      blackGuestName || null,
      gameType,
      whiteElo,
      blackElo,
      null,
      600000, // Default 10 mins
      {
        whiteTimeMs: 600000,
        blackTimeMs: 600000,
        lastMoveAt: new Date(),
      },
    );

    game.start();
    const createdGame = await this.gameRepository.create(game);

    if (whitePlayerId) {
      this.gamesGateway.scheduleGameTimeout(
        createdGame.id,
        600000,
        whitePlayerId,
      );
    }

    return createdGame;
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
      null, // Guest names not used for AI
      null,
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
