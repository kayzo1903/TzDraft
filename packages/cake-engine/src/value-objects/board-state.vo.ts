import { Piece } from './piece.vo';
import { Position } from './position.vo';
import {
  PlayerColor,
  TOTAL_SQUARES,
  PIECES_PER_PLAYER,
} from '../constants';

/**
 * BoardState Value Object
 * Represents the complete state of the game board
 */
export class BoardState {
  private readonly pieces: Map<number, Piece>;

  constructor(pieces: Piece[] = []) {
    this.pieces = new Map();
    pieces.forEach((piece) => {
      this.pieces.set(piece.position.value, piece);
    });
  }

  /**
   * Get piece at position
   */
  getPieceAt(position: Position): Piece | null {
    return this.pieces.get(position.value) || null;
  }

  /**
   * Get all pieces of a specific color
   */
  getPiecesByColor(color: PlayerColor): Piece[] {
    return Array.from(this.pieces.values()).filter((p) => p.color === color);
  }

  /**
   * Get all pieces on the board
   */
  getAllPieces(): Piece[] {
    return Array.from(this.pieces.values());
  }

  /**
   * Check if position is occupied
   */
  isOccupied(position: Position): boolean {
    return this.pieces.has(position.value);
  }

  /**
   * Check if position is empty
   */
  isEmpty(position: Position): boolean {
    return !this.isOccupied(position);
  }

  /**
   * Place piece on board
   */
  placePiece(piece: Piece): BoardState {
    const newPieces = Array.from(this.pieces.values());
    newPieces.push(piece);
    return new BoardState(newPieces);
  }

  /**
   * Remove piece from board
   */
  removePiece(position: Position): BoardState {
    const newPieces = Array.from(this.pieces.values()).filter(
      (p) => !p.position.equals(position),
    );
    return new BoardState(newPieces);
  }

  /**
   * Move piece from one position to another
   */
  movePiece(from: Position, to: Position): BoardState {
    const piece = this.getPieceAt(from);
    if (!piece) {
      throw new Error(`No piece at position ${from.value}`);
    }

    let newBoard = this.removePiece(from);
    const movedPiece = piece.moveTo(to);

    // Check for promotion
    if (movedPiece.shouldPromote()) {
      newBoard = newBoard.placePiece(movedPiece.promote());
    } else {
      newBoard = newBoard.placePiece(movedPiece);
    }

    return newBoard;
  }

  /**
   * Create initial board state for Tanzania Drafti
   */
  static createInitialBoard(): BoardState {
    const pieces: Piece[] = [];

    // White pieces (positions 1-12)
    for (let i = 1; i <= PIECES_PER_PLAYER; i++) {
      pieces.push(new Piece(PieceType.MAN, PlayerColor.WHITE, new Position(i)));
    }

    // Black pieces (positions 21-32)
    for (let i = 21; i <= 32; i++) {
      pieces.push(new Piece(PieceType.MAN, PlayerColor.BLACK, new Position(i)));
    }

    return new BoardState(pieces);
  }

  /**
   * Count pieces by color
   */
  countPieces(color: PlayerColor): number {
    return this.getPiecesByColor(color).length;
  }

  /**
   * Clone the board state
   */
  clone(): BoardState {
    return new BoardState(this.getAllPieces());
  }

  toString(): string {
    const board: string[][] = Array(8)
      .fill(null)
      .map(() => Array(8).fill('.'));

    this.getAllPieces().forEach((piece) => {
      const { row, col } = piece.position.toRowCol();
      const symbol = piece.isKing() ? 'K' : 'M';
      const colorSymbol = piece.color === PlayerColor.WHITE ? 'W' : 'B';
      board[row][col] = `${colorSymbol}${symbol}`;
    });

    return board.map((row) => row.join(' ')).join('\n');
  }
}

// Import at the end to avoid circular dependency
import { PieceType } from '../constants';
