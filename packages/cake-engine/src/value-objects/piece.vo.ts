import {
  PieceType,
  PlayerColor,
} from '../constants';
import { Position } from './position.vo';

/**
 * Piece Value Object
 * Represents a single piece on the board
 */
export class Piece {
  constructor(
    public readonly type: PieceType,
    public readonly color: PlayerColor,
    public readonly position: Position,
  ) {}

  /**
   * Check if piece is a king
   */
  isKing(): boolean {
    return this.type === PieceType.KING;
  }

  /**
   * Check if piece is a man
   */
  isMan(): boolean {
    return this.type === PieceType.MAN;
  }

  /**
   * Promote piece to king
   */
  promote(): Piece {
    if (this.isKing()) {
      throw new Error('Piece is already a king');
    }
    return new Piece(PieceType.KING, this.color, this.position);
  }

  /**
   * Move piece to new position
   */
  moveTo(newPosition: Position): Piece {
    return new Piece(this.type, this.color, newPosition);
  }

  /**
   * Check if piece should be promoted (reached opponent's back row)
   */
  shouldPromote(): boolean {
    if (this.isKing()) return false;

    const { row } = this.position.toRowCol();

    // White pieces promote on row 0, Black pieces promote on row 7
    if (this.color === PlayerColor.WHITE && row === 0) return true;
    if (this.color === PlayerColor.BLACK && row === 7) return true;

    return false;
  }

  equals(other: Piece): boolean {
    return (
      this.type === other.type &&
      this.color === other.color &&
      this.position.equals(other.position)
    );
  }

  toString(): string {
    const symbol = this.isKing() ? 'K' : 'M';
    const colorSymbol = this.color === PlayerColor.WHITE ? 'W' : 'B';
    return `${colorSymbol}${symbol}@${this.position.value}`;
  }
}
