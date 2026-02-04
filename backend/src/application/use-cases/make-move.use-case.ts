import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import type { IGameRepository } from '../../domain/game/repositories/game.repository.interface';
import type { IMoveRepository } from '../../domain/game/repositories/move.repository.interface';
import { MoveValidationService } from '../../domain/game/services/move-validation.service';
import { GameRulesService } from '../../domain/game/services/game-rules.service';
import { Position } from '../../domain/game/value-objects/position.vo';
import { Move } from '../../domain/game/entities/move.entity';
import { PlayerColor, EndReason } from '../../shared/constants/game.constants';
import { ValidationError } from '../../domain/game/types/validation-error.type';

/**
 * Make Move Use Case
 * Handles move validation and execution
 */
@Injectable()
export class MakeMoveUseCase {
  private readonly moveValidationService: MoveValidationService;
  private readonly gameRulesService: GameRulesService;

  constructor(
    @Inject('IGameRepository')
    private readonly gameRepository: IGameRepository,
    @Inject('IMoveRepository')
    private readonly moveRepository: IMoveRepository,
  ) {
    this.moveValidationService = new MoveValidationService();
    this.gameRulesService = new GameRulesService();
  }

  /**
   * Execute a move
   */
  async execute(
    gameId: string,
    playerId: string,
    from: number,
    to: number,
    path?: number[],
  ): Promise<{
    game: any;
    move: any;
  }> {
    // 1. Load game
    const game = await this.gameRepository.findById(gameId);
    if (!game) {
      throw new BadRequestException('Game not found');
    }

    // 2. Determine player color
    const playerColor = this.getPlayerColor(game, playerId);

    // 3. Get actual move count from database
    const existingMoves = await this.moveRepository.findByGameId(gameId);
    const moveNumber = existingMoves.length + 1;

    // 4. Validate and execute move
    const fromPos = new Position(from);
    const toPos = new Position(to);
    const pathPos = path?.map((p) => new Position(p));

    const moveResult = this.moveValidationService.validateMove(
      game,
      playerColor,
      fromPos,
      toPos,
      pathPos,
    );

    if (!moveResult.isValid || !moveResult.move || !moveResult.newBoardState) {
      throw new BadRequestException(
        moveResult.error?.message || 'Invalid move',
      );
    }

    // Override move number with correct value from database
    const correctedMove = new (moveResult.move.constructor as any)(
      moveResult.move.id,
      moveResult.move.gameId,
      moveNumber, // Use correct move number
      moveResult.move.player,
      moveResult.move.from,
      moveResult.move.to,
      moveResult.move.capturedSquares,
      moveResult.move.isPromotion,
      moveResult.move.notation,
      moveResult.move.createdAt,
    );

    // 5. Apply move to game
    game.applyMove(correctedMove);

    // 5. Check for game end
    // TODO: Re-enable after implementing board state persistence
    // The board state is not being persisted/reconstructed, so game-over detection
    // incorrectly thinks there are no pieces on the board
    /*
    if (this.gameRulesService.isGameOver(game)) {
      const winner = this.gameRulesService.detectWinner(game);
      if (winner) {
        game.endGame(winner, EndReason.CHECKMATE);
      }
    }
    */

    // 6. Save game and move
    await this.gameRepository.update(game);
    await this.moveRepository.create(correctedMove);

    return {
      game,
      move: correctedMove,
    };
  }

  /**
   * Get player color from game
   */
  private getPlayerColor(game: any, playerId: string): PlayerColor {
    if (game.whitePlayerId === playerId) {
      return PlayerColor.WHITE;
    }
    if (game.blackPlayerId === playerId) {
      return PlayerColor.BLACK;
    }
    throw new BadRequestException('Player not in this game');
  }
}
