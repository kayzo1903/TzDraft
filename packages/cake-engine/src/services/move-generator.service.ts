import { Move } from "../entities/move.entity";
import { Piece } from "../value-objects/piece.vo";
import { Position } from "../value-objects/position.vo";
import { BoardState } from "../value-objects/board-state.vo";
import { PlayerColor } from "../constants";
import { CaptureFindingService } from "./capture-finding.service";
import { getValidDirections } from "../types/capture-path.type";

/**
 * Move Generator Service
 * Generates all possible legal moves for a player
 * Used by AI and for move hints
 */
export class MoveGeneratorService {
  private captureFindingService: CaptureFindingService;

  constructor() {
    this.captureFindingService = new CaptureFindingService();
  }

  /**
   * Generate all legal moves for a player
   */
  /**
   * Generate all legal moves for a player
   */
  generateAllMoves(
    board: BoardState,
    player: PlayerColor,
    moveCount: number = 0,
  ): Move[] {
    const moves: Move[] = [];

    // Check for captures first (mandatory)
    const captures = this.captureFindingService.findAllCaptures(board, player);

    if (captures.length > 0) {
      for (const capture of captures) {
        const currentMoveNumber = moveCount + 1;
        const notation = Move.generateNotation(
          capture.from,
          capture.to,
          capture.capturedSquares,
        );

        const move = new Move(
          this.generateMoveId(),
          "temp-game-id", // Engine generates moves without game context initially
          currentMoveNumber,
          player,
          capture.from,
          capture.to,
          capture.capturedSquares,
          capture.isPromotion,
          notation,
        );

        moves.push(move);
      }

      return moves;
    }

    // No captures available, generate simple moves
    const pieces = board.getPiecesByColor(player);

    for (const piece of pieces) {
      const pieceMoves = this.generateSimpleMovesForPiece(
        board,
        piece,
        moveCount,
      );
      moves.push(...pieceMoves);
    }

    return moves;
  }

  /**
   * Generate all moves for a specific piece
   */
  generateMovesForPiece(
    board: BoardState,
    piece: Piece,
    moveCount: number = 0,
  ): Move[] {
    const allCaptures = this.captureFindingService.findAllCaptures(
      board,
      piece.color,
    );
    const capturesForPiece = allCaptures.filter((capture) =>
      capture.from.equals(piece.position),
    );

    if (allCaptures.length > 0) {
      if (capturesForPiece.length === 0) {
        return [];
      }
      return capturesForPiece.map((capture) => {
        const currentMoveNumber = moveCount + 1;
        const notation = Move.generateNotation(
          capture.from,
          capture.to,
          capture.capturedSquares,
        );

        return new Move(
          this.generateMoveId(),
          "temp-game-id",
          currentMoveNumber,
          piece.color,
          capture.from,
          capture.to,
          capture.capturedSquares,
          capture.isPromotion,
          notation,
        );
      });
    }

    // Generate simple moves when no captures anywhere
    return this.generateSimpleMovesForPiece(board, piece, moveCount);
  }

  /**
   * Generate simple (non-capture) moves for a piece
   */
  private generateSimpleMovesForPiece(
    board: BoardState,
    piece: Piece,
    moveCount: number,
  ): Move[] {
    const moves: Move[] = [];
    const { row, col } = piece.position.toRowCol();
    const directions = getValidDirections(piece);

    for (const dir of directions) {
      if (piece.isKing()) {
        let newRow = row + dir.row;
        let newCol = col + dir.col;

        while (newRow >= 0 && newRow <= 7 && newCol >= 0 && newCol <= 7) {
          const targetPos = Position.fromRowCol(newRow, newCol);

          if (!board.isEmpty(targetPos)) {
            break;
          }

          const currentMoveNumber = moveCount + 1;
          const notation = Move.generateNotation(piece.position, targetPos, []);

          const move = new Move(
            this.generateMoveId(),
            "temp-game-id",
            currentMoveNumber,
            piece.color,
            piece.position,
            targetPos,
            [],
            false,
            notation,
          );

          moves.push(move);

          newRow += dir.row;
          newCol += dir.col;
        }
      } else {
        const newRow = row + dir.row;
        const newCol = col + dir.col;

        // Check bounds
        if (newRow < 0 || newRow > 7 || newCol < 0 || newCol > 7) {
          continue;
        }

        // Check if it's a dark square
        if ((newRow + newCol) % 2 === 0) {
          continue;
        }

        const targetPos = Position.fromRowCol(newRow, newCol);

        // Check if square is empty
        if (board.isEmpty(targetPos)) {
          const currentMoveNumber = moveCount + 1;
          const notation = Move.generateNotation(piece.position, targetPos, []);

          const movedPiece = piece.moveTo(targetPos);
          const isPromotion = movedPiece.shouldPromote();

          const move = new Move(
            this.generateMoveId(),
            "temp-game-id",
            currentMoveNumber,
            piece.color,
            piece.position,
            targetPos,
            [],
            isPromotion,
            notation,
          );

          moves.push(move);
        }
      }
    }

    return moves;
  }

  /**
   * Count total legal moves for a player
   */
  countLegalMoves(
    board: BoardState,
    player: PlayerColor,
    moveCount: number = 0,
  ): number {
    return this.generateAllMoves(board, player, moveCount).length;
  }

  /**
   * Check if a specific move is legal
   */
  isMoveLegal(
    board: BoardState,
    player: PlayerColor,
    from: Position,
    to: Position,
    moveCount: number = 0,
  ): boolean {
    const allMoves = this.generateAllMoves(board, player, moveCount);

    return allMoves.some(
      (move) => move.from.equals(from) && move.to.equals(to),
    );
  }

  /**
   * Generate a unique move ID
   */
  private generateMoveId(): string {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    // Fallback for environments without crypto.randomUUID
    return `move-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
