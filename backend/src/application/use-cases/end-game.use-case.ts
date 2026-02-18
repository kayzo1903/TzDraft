import {
  Injectable,
  Inject,
  BadRequestException,
  forwardRef,
} from '@nestjs/common';
import type { IGameRepository } from '../../domain/game/repositories/game.repository.interface';
import type { IMoveRepository } from '../../domain/game/repositories/move.repository.interface';
import { Game } from '../../domain/game/entities/game.entity';
import {
  Winner,
  EndReason,
  GameStatus,
} from '../../shared/constants/game.constants';
import { RatingService } from '../../domain/game/services/rating.service';
import { GamesGateway } from '../../infrastructure/messaging/games.gateway';

/**
 * End Game Use Case
 * Handles game termination (resignation, timeout, etc.)
 */
@Injectable()
export class EndGameUseCase {
  constructor(
    @Inject('IGameRepository')
    private readonly gameRepository: IGameRepository,
    @Inject('IMoveRepository')
    private readonly moveRepository: IMoveRepository,
    private readonly ratingService: RatingService,
    @Inject(forwardRef(() => GamesGateway))
    private readonly gamesGateway: GamesGateway,
  ) {}

  /**
   * End game by resignation
   */
  async resign(gameId: string, playerId: string): Promise<void> {
    const game = await this.gameRepository.findById(gameId);
    if (!game) {
      throw new BadRequestException('Game not found');
    }
    if (game.whitePlayerId !== playerId && game.blackPlayerId !== playerId) {
      throw new BadRequestException('Player not in this game');
    }

    // Determine winner (opponent of resigning player)
    const winner =
      game.whitePlayerId === playerId ? Winner.BLACK : Winner.WHITE;

    game.endGame(winner, EndReason.RESIGN);
    await this.gameRepository.update(game);
    this.gamesGateway.emitGameOver(gameId, {
      winner,
      reason: EndReason.RESIGN,
      endedBy: playerId,
    });

    // Resignation affects rating only if at least one move was made.
    const moveCount = await this.moveRepository.countByGameId(gameId);
    if (moveCount > 0) {
      await this.handleRatingUpdate(game, winner);
    }
  }

  /**
   * End game by timeout
   */
  async timeout(gameId: string, playerId: string): Promise<void> {
    const game = await this.gameRepository.findById(gameId);
    if (!game) {
      throw new BadRequestException('Game not found');
    }
    if (game.whitePlayerId !== playerId && game.blackPlayerId !== playerId) {
      throw new BadRequestException('Player not in this game');
    }

    // Determine winner (opponent of timed-out player)
    const winner =
      game.whitePlayerId === playerId ? Winner.BLACK : Winner.WHITE;

    game.endGame(winner, EndReason.TIME);
    await this.gameRepository.update(game);
    this.gamesGateway.emitGameOver(gameId, {
      winner,
      reason: EndReason.TIME,
      endedBy: playerId,
    });
    await this.handleRatingUpdate(game, winner);
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
    this.gamesGateway.emitGameOver(gameId, {
      winner: Winner.DRAW,
      reason: EndReason.DRAW,
    });
    await this.handleRatingUpdate(game, Winner.DRAW);
  }

  /**
   * Abort game (before moves are made)
   */
  async abort(gameId: string, playerId: string): Promise<void> {
    const game = await this.gameRepository.findById(gameId);
    if (!game) {
      throw new BadRequestException('Game not found');
    }
    if (game.whitePlayerId !== playerId && game.blackPlayerId !== playerId) {
      throw new BadRequestException('Player not in this game');
    }

    const moveCount = await this.moveRepository.countByGameId(gameId);
    if (moveCount > 0) {
      throw new BadRequestException('Cannot abort game after moves are made');
    }

    game.abort();
    await this.gameRepository.update(game);
    this.gamesGateway.emitGameOver(gameId, {
      winner: null,
      reason: 'ABORTED',
      endedBy: playerId,
    });
  }

  /**
   * End game automatically when disconnected player does not return in time.
   * - If no moves were made: abandon as draw (no rating impact)
   * - Otherwise: disconnected player loses by disconnect
   */
  async disconnectForfeit(gameId: string, disconnectedPlayerId: string) {
    const game = await this.gameRepository.findById(gameId);
    if (!game) {
      throw new BadRequestException('Game not found');
    }
    if (
      game.whitePlayerId !== disconnectedPlayerId &&
      game.blackPlayerId !== disconnectedPlayerId
    ) {
      throw new BadRequestException('Player not in this game');
    }
    if (game.status !== GameStatus.ACTIVE && game.status !== GameStatus.WAITING) {
      return;
    }

    const moveCount = await this.moveRepository.countByGameId(gameId);
    if (moveCount === 0) {
      game.endGame(Winner.DRAW, EndReason.DISCONNECT);
      await this.gameRepository.update(game);
      this.gamesGateway.emitGameOver(gameId, {
        winner: Winner.DRAW,
        reason: EndReason.DISCONNECT,
        endedBy: disconnectedPlayerId,
        noMoves: true,
      });
      return;
    }

    const winner =
      game.whitePlayerId === disconnectedPlayerId ? Winner.BLACK : Winner.WHITE;
    game.endGame(winner, EndReason.DISCONNECT);
    await this.gameRepository.update(game);
    this.gamesGateway.emitGameOver(gameId, {
      winner,
      reason: EndReason.DISCONNECT,
      endedBy: disconnectedPlayerId,
      noMoves: false,
    });
    await this.handleRatingUpdate(game, winner);
  }

  private async handleRatingUpdate(game: Game, winner: Winner) {
    try {
      await this.ratingService.updateRatings(game, winner);
    } catch (error) {
      console.error('Failed to update ratings:', error);
      // Don't fail the game end if rating update fails
    }
  }
}
