import { BoardState } from "./value-objects/board-state.vo";
import { Game } from "./entities/game.entity";
import { Move } from "./entities/move.entity";
import { Position } from "./value-objects/position.vo";
import {
  PlayerColor,
  Winner,
  GameType,
  GameStatus,
  EndReason,
} from "./constants";
import { MoveGeneratorService } from "./services/move-generator.service";
import { GameRulesService } from "./services/game-rules.service";

/**
 * Game Result
 * Represents the result of a game (win, loss, draw)
 */
export interface GameResult {
  winner: Winner;
  reason: EndReason;
}

/**
 * CAKE Engine Public API
 * Browser-safe game engine for Tanzania Drafti
 */
export const CakeEngine = {
  /**
   * Create initial board state
   */
  createInitialState(): BoardState {
    return BoardState.createInitialBoard();
  },

  /**
   * Generate all legal moves for a player
   */
  generateLegalMoves(
    state: BoardState,
    player: PlayerColor,
    moveCount: number = 0,
  ): Move[] {
    const moveGen = new MoveGeneratorService();
    return moveGen.generateAllMoves(state, player, moveCount);
  },

  /**
   * Apply a move to the board state
   */
  applyMove(state: BoardState, move: Move): BoardState {
    // Remove captured pieces
    let newBoard = state;
    for (const capturedPos of move.capturedSquares) {
      newBoard = newBoard.removePiece(capturedPos);
    }

    // Move the piece
    newBoard = newBoard.movePiece(move.from, move.to);

    return newBoard;
  },

  /**
   * Evaluate game result (detect win/draw conditions)
   */
  evaluateGameResult(
    state: BoardState,
    currentPlayer: PlayerColor,
  ): GameResult | null {
    const rulesService = new GameRulesService();

    // Check for winner
    const winner = rulesService.detectWinner(state, currentPlayer);
    if (winner) {
      let reason = EndReason.RESIGN; // Default
      if (winner === Winner.WHITE && currentPlayer === PlayerColor.BLACK) {
        reason = EndReason.CHECKMATE; // Black has no moves
      } else if (
        winner === Winner.BLACK &&
        currentPlayer === PlayerColor.WHITE
      ) {
        reason = EndReason.CHECKMATE; // White has no moves
      }
      return { winner, reason };
    }

    // Check for draw by insufficient material
    if (rulesService.isDrawByInsufficientMaterial(state)) {
      return { winner: Winner.DRAW, reason: EndReason.DRAW };
    }

    // Game is still ongoing
    return null;
  },

  /**
   * Create a game instance
   */
  createGame(
    id: string,
    whitePlayerId: string,
    blackPlayerId: string | null,
    gameType: GameType = GameType.CASUAL,
  ): Game {
    return new Game(
      id,
      whitePlayerId,
      blackPlayerId,
      gameType,
      null,
      null,
      null,
      600000,
      undefined,
      new Date(),
      null,
      null,
      GameStatus.WAITING,
      null,
      null,
      PlayerColor.WHITE,
    );
  },

  /**
   * Helper to create a position
   */
  createPosition(value: number): Position {
    return new Position(value);
  },

  /**
   * Helper to create a move
   */
  createMove(
    id: string,
    gameId: string,
    moveNumber: number,
    player: PlayerColor,
    from: Position,
    to: Position,
    capturedSquares: Position[] = [],
    isPromotion: boolean = false,
  ): Move {
    const notation = Move.generateNotation(from, to, capturedSquares);
    return new Move(
      id,
      gameId,
      moveNumber,
      player,
      from,
      to,
      capturedSquares,
      isPromotion,
      notation,
    );
  },
};
