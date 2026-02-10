import { Game } from '../entities/game.entity';
import { Move } from '../entities/move.entity';
import { BoardState } from '../value-objects/board-state.vo';
import { Piece } from '../value-objects/piece.vo';
import { Position } from '../value-objects/position.vo';
import {
  PlayerColor,
  GameStatus,
} from '../constants';
import { CaptureFindingService } from './capture-finding.service';
import {
  ValidationError,
  ValidationErrorCode,
} from '../types/validation-error.type';
import { MoveResult } from '../types/move-result.type';
import { getValidDirections } from '../types/capture-path.type';

/**
 * Move Validation Service
 * Validates moves according to Tanzania Drafti rules
 */
export class MoveValidationService {
  private captureFindingService: CaptureFindingService;

  constructor() {
    this.captureFindingService = new CaptureFindingService();
  }

  /**
   * Validate a move request
   */
  validateMove(
    game: Game,
    player: PlayerColor,
    from: Position,
    to: Position,
    path?: Position[],
  ): MoveResult {
    try {
      // STEP 1: Game state validation
      this.validateGameState(game);

      // STEP 2: Turn validation
      this.validateTurn(game, player);

      // STEP 3: Piece ownership validation
      const piece = this.validatePieceOwnership(game.board, from, player);

      // STEP 4: Detect available captures
      const availableCaptures = this.captureFindingService.findAllCaptures(
        game.board,
        player,
      );

      // STEP 5: Enforce mandatory capture
      if (availableCaptures.length > 0) {
        return this.validateCaptureMove(
          game,
          piece,
          from,
          to,
          path || [],
          availableCaptures,
        );
      }

      // STEP 6: Validate simple move
      return this.validateSimpleMove(game, piece, from, to);
    } catch (error) {
      if (error instanceof ValidationError) {
        return {
          isValid: false,
          error,
        };
      }
      throw error;
    }
  }

  /**
   * STEP 1: Validate game state
   */
  private validateGameState(game: Game): void {
    if (game.status !== GameStatus.ACTIVE) {
      throw ValidationError.gameNotActive();
    }
  }

  /**
   * STEP 2: Validate turn
   */
  private validateTurn(game: Game, player: PlayerColor): void {
    if (game.currentTurn !== player) {
      throw ValidationError.wrongTurn(player);
    }
  }

  /**
   * STEP 3: Validate piece ownership
   */
  private validatePieceOwnership(
    board: BoardState,
    from: Position,
    player: PlayerColor,
  ): Piece {
    const piece = board.getPieceAt(from);

    if (!piece) {
      throw ValidationError.noPiece(from.value);
    }

    if (piece.color !== player) {
      throw ValidationError.wrongPieceColor(from.value);
    }

    return piece;
  }

  /**
   * Validate a capture move
   */
  private validateCaptureMove(
    game: Game,
    piece: Piece,
    from: Position,
    to: Position,
    path: Position[],
    availableCaptures: any[],
  ): MoveResult {
    // Find if this capture is in the available captures
    const matchingCapture = availableCaptures.find(
      (capture) => capture.from.equals(from) && capture.to.equals(to),
    );

    if (!matchingCapture) {
      throw ValidationError.captureRequired();
    }

    // Create the move
    const moveNumber = game.getMoveCount() + 1;
    const notation = Move.generateNotation(
      from,
      to,
      matchingCapture.capturedSquares,
    );

    const move = new Move(
      this.generateMoveId(),
      game.id,
      moveNumber,
      piece.color,
      from,
      to,
      matchingCapture.capturedSquares,
      matchingCapture.isPromotion,
      notation,
    );

    // Apply the move to get new board state
    let newBoard = game.board;

    // Remove captured pieces
    for (const capturedPos of matchingCapture.capturedSquares) {
      newBoard = newBoard.removePiece(capturedPos);
    }

    // Move the piece
    newBoard = newBoard.movePiece(from, to);

    return {
      isValid: true,
      move,
      newBoardState: newBoard,
    };
  }

  /**
   * Validate a simple (non-capture) move
   */
  private validateSimpleMove(
    game: Game,
    piece: Piece,
    from: Position,
    to: Position,
  ): MoveResult {
    // Check if destination is empty
    if (game.board.isOccupied(to)) {
      throw new ValidationError(
        ValidationErrorCode.DESTINATION_OCCUPIED,
        `Destination square ${to.value} is occupied`,
      );
    }

    // Check if move is valid for this piece type
    if (!this.isValidSimpleMove(piece, from, to)) {
      throw ValidationError.invalidMove(
        `Piece cannot move from ${from.value} to ${to.value}`,
      );
    }

    // Create the move
    const moveNumber = game.getMoveCount() + 1;
    const notation = Move.generateNotation(from, to, []);

    const movedPiece = piece.moveTo(to);
    const isPromotion = movedPiece.shouldPromote();

    const move = new Move(
      this.generateMoveId(),
      game.id,
      moveNumber,
      piece.color,
      from,
      to,
      [],
      isPromotion,
      notation,
    );

    // Apply the move
    const newBoard = game.board.movePiece(from, to);

    return {
      isValid: true,
      move,
      newBoardState: newBoard,
    };
  }

  /**
   * Check if a simple move is valid (one diagonal square)
   */
  private isValidSimpleMove(
    piece: Piece,
    from: Position,
    to: Position,
  ): boolean {
    const fromCoords = from.toRowCol();
    const toCoords = to.toRowCol();

    const rowDiff = toCoords.row - fromCoords.row;
    const colDiff = Math.abs(toCoords.col - fromCoords.col);

    // Must move exactly one square diagonally
    if (Math.abs(rowDiff) !== 1 || colDiff !== 1) {
      return false;
    }

    // Check direction is valid for piece type
    const validDirections = getValidDirections(piece);
    return validDirections.some((dir) => dir.row === rowDiff && dir.col === Math.sign(toCoords.col - fromCoords.col));
  }

  /**
   * Generate a unique move ID
   */
  private generateMoveId(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    // Fallback for environments without crypto.randomUUID
    return `move-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
