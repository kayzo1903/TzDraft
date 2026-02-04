import { Game } from '../entities/game.entity';
import { Move } from '../entities/move.entity';
import { Piece } from '../value-objects/piece.vo';
import { Position } from '../value-objects/position.vo';
import { BoardState } from '../value-objects/board-state.vo';
import { PlayerColor } from '../../../shared/constants/game.constants';
import { CaptureFindingService } from './capture-finding.service';
import { getValidDirections } from '../types/capture-path.type';

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
  generateAllMoves(game: Game, player: PlayerColor): Move[] {
    const moves: Move[] = [];

    // Check for captures first (mandatory)
    const captures = this.captureFindingService.findAllCaptures(
      game.board,
      player,
    );

    if (captures.length > 0) {
      // Only capture moves are legal
      for (const capture of captures) {
        const moveNumber = game.getMoveCount() + 1;
        const notation = Move.generateNotation(
          capture.from,
          capture.to,
          capture.capturedSquares,
        );

        const move = new Move(
          crypto.randomUUID(),
          game.id,
          moveNumber,
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
    const pieces = game.board.getPiecesByColor(player);

    for (const piece of pieces) {
      const pieceMoves = this.generateSimpleMovesForPiece(game, piece);
      moves.push(...pieceMoves);
    }

    return moves;
  }

  /**
   * Generate all moves for a specific piece
   */
  generateMovesForPiece(game: Game, piece: Piece): Move[] {
    // Check if captures are available for this piece
    const captures = this.captureFindingService.findCapturesForPiece(
      game.board,
      piece,
    );

    if (captures.length > 0) {
      return captures.map((capture) => {
        const moveNumber = game.getMoveCount() + 1;
        const notation = Move.generateNotation(
          capture.from,
          capture.to,
          capture.capturedSquares,
        );

        return new Move(
          crypto.randomUUID(),
          game.id,
          moveNumber,
          piece.color,
          capture.from,
          capture.to,
          capture.capturedSquares,
          capture.isPromotion,
          notation,
        );
      });
    }

    // Generate simple moves
    return this.generateSimpleMovesForPiece(game, piece);
  }

  /**
   * Generate simple (non-capture) moves for a piece
   */
  private generateSimpleMovesForPiece(game: Game, piece: Piece): Move[] {
    const moves: Move[] = [];
    const { row, col } = piece.position.toRowCol();
    const directions = getValidDirections(piece);

    for (const dir of directions) {
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
      if (game.board.isEmpty(targetPos)) {
        const moveNumber = game.getMoveCount() + 1;
        const notation = Move.generateNotation(piece.position, targetPos, []);

        const movedPiece = piece.moveTo(targetPos);
        const isPromotion = movedPiece.shouldPromote();

        const move = new Move(
          crypto.randomUUID(),
          game.id,
          moveNumber,
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

    return moves;
  }

  /**
   * Count total legal moves for a player
   */
  countLegalMoves(game: Game, player: PlayerColor): number {
    return this.generateAllMoves(game, player).length;
  }

  /**
   * Check if a specific move is legal
   */
  isMoveLegal(
    game: Game,
    player: PlayerColor,
    from: Position,
    to: Position,
  ): boolean {
    const allMoves = this.generateAllMoves(game, player);

    return allMoves.some(
      (move) => move.from.equals(from) && move.to.equals(to),
    );
  }
}
