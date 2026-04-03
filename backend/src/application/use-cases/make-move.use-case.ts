import {
  Injectable,
  Inject,
  BadRequestException,
  forwardRef,
} from '@nestjs/common';
import { Game } from '../../domain/game/entities/game.entity';
import { GamesGateway } from '../../infrastructure/messaging/games.gateway';
import type { IGameRepository } from '../../domain/game/repositories/game.repository.interface';
import type { IMoveRepository } from '../../domain/game/repositories/move.repository.interface';
import { MoveValidationService } from '../../domain/game/services/move-validation.service';
import { GameRulesService } from '../../domain/game/services/game-rules.service';
import { Position } from '../../domain/game/value-objects/position.vo';
import { Move } from '../../domain/game/entities/move.entity';
import {
  PlayerColor,
  EndReason,
  Winner,
} from '../../shared/constants/game.constants';
import { ValidationError } from '../../domain/game/types/validation-error.type';
import { RatingService } from './rating.service';
import { ReportTournamentResultUseCase } from './tournament/report-tournament-result.use-case';

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
    @Inject(forwardRef(() => GamesGateway))
    private readonly gamesGateway: GamesGateway,
    private readonly ratingService: RatingService,
    @Inject(forwardRef(() => ReportTournamentResultUseCase))
    private readonly reportTournamentResult: ReportTournamentResultUseCase,
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
    game: Game;
    move: Move;
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

    // 6. Check for win (current player after the move has no pieces or no legal moves)
    if (!game.isGameOver()) {
      if (this.gameRulesService.isGameOver(game)) {
        const winner = this.gameRulesService.detectWinner(game);
        if (winner) {
          game.endGame(winner, EndReason.NO_MOVES);
        }
      }
    }

    // 7. Check for draw conditions (in priority order).
    // Note: K vs K is NOT a draw in TZD — kings can capture kings.
    // Draws only arise from the 30-move rule, three-kings rule, Art. 8.4 endgame rule,
    // or threefold repetition (enforced by the engine / client).
    if (!game.isGameOver()) {
      if (
        this.gameRulesService.isDrawByThirtyMoveRule(game.reversibleMoveCount)
      ) {
        game.endGame(Winner.DRAW, EndReason.DRAW_30_MOVE);
      } else if (
        this.gameRulesService.isDrawByThreeKingsRule(game.threeKingsMoveCount)
      ) {
        game.endGame(Winner.DRAW, EndReason.DRAW_THREE_KINGS);
      } else if (
        this.gameRulesService.isDrawByArticle84Endgame(game.endgameMoveCount)
      ) {
        game.endGame(Winner.DRAW, EndReason.DRAW_ENDGAME);
      }
    }

    // 8. Clock deduction — server is source of truth (chess.com technique)
    const now = new Date();
    let clockUpdate: {
      whiteTimeMs: number;
      blackTimeMs: number;
      lastMoveAt: Date;
    } | null = null;

    if (game.clockInfo && !game.isPvE()) {
      const elapsed =
        now.getTime() - new Date(game.clockInfo.lastMoveAt).getTime();
      let newWhite = game.clockInfo.whiteTimeMs;
      let newBlack = game.clockInfo.blackTimeMs;

      if (playerColor === PlayerColor.WHITE) {
        newWhite = Math.max(0, newWhite - elapsed);
      } else {
        newBlack = Math.max(0, newBlack - elapsed);
      }

      // Timeout: the player who just moved ran out of time
      if (!game.isGameOver()) {
        if (newWhite <= 0) {
          game.endGame(Winner.BLACK, EndReason.TIME);
        } else if (newBlack <= 0) {
          game.endGame(Winner.WHITE, EndReason.TIME);
        }
      }

      clockUpdate = {
        whiteTimeMs: newWhite,
        blackTimeMs: newBlack,
        lastMoveAt: now,
      };
      await this.gameRepository.updateClock(gameId, newWhite, newBlack, now);
    }

    // 9. Save game and move
    await this.gameRepository.update(game);
    await this.moveRepository.create(correctedMove);

    // 10. Emit game state update — send only the delta, not the full entity
    this.gamesGateway.emitGameStateUpdate(gameId, {
      lastMove: correctedMove,
      clockInfo: clockUpdate ?? game.clockInfo ?? null,
      winner: game.winner,
      currentTurn: game.currentTurn,
      status: game.status,
    });

    // 11. Update ratings and emit gameOver for any server-detected game end
    // (stalemate, draw rules, timeout) so both players see the result card
    // even when the moving player's optimistic-update path would skip it.
    if (game.isGameOver() && game.winner !== null) {
      // Await both updates before emitting gameOver so the client's
      // subsequent fetchGameState receives already-committed ELO values.
      await Promise.all([
        this.ratingService
          .updateRatings(
            game.whitePlayerId,
            game.blackPlayerId,
            game.winner,
            game.gameType,
          )
          .catch((err: unknown) => {
            const message = err instanceof Error ? err.message : String(err);
            console.error(
              `[MakeMove] Rating update failed for game ${gameId}: ${message}`,
            );
          }),
        this.reportTournamentResult
          .execute(gameId, game.winner, game.whitePlayerId, game.blackPlayerId)
          .catch(() => {
            /* non-fatal: tournament progression is best-effort */
          }),
      ]);

      const reasonStr =
        game.endReason === EndReason.TIME
          ? 'timeout'
          : game.endReason === EndReason.NO_MOVES ||
              game.endReason === EndReason.STALEMATE
            ? 'no-moves'
            : game.endReason === EndReason.DRAW_REPETITION
              ? 'draw-repetition'
              : game.endReason === EndReason.DRAW_30_MOVE
                ? 'draw-30-move'
                : game.endReason === EndReason.DRAW_THREE_KINGS
                  ? 'draw-three-kings'
                  : game.endReason === EndReason.DRAW_ENDGAME
                    ? 'draw-endgame'
                    : 'draw';
      this.gamesGateway.emitGameOver(gameId, {
        gameId,
        winner: game.winner.toString(),
        reason: reasonStr,
      });
    }

    return {
      game,
      move: correctedMove,
    };
  }

  /**
   * Get player color from game
   */
  private getPlayerColor(game: Game, playerId: string): PlayerColor {
    if (game.whitePlayerId === playerId) {
      return PlayerColor.WHITE;
    }
    if (game.blackPlayerId === playerId) {
      return PlayerColor.BLACK;
    }
    throw new BadRequestException('Player not in this game');
  }
}
