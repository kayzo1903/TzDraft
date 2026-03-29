import { PieceType, PlayerColor } from './constants.js';
import { Position } from './position.js';

export class Piece {
  constructor(
    public readonly type: PieceType,
    public readonly color: PlayerColor,
    public readonly position: Position,
  ) {}

  isKing(): boolean {
    return this.type === PieceType.KING;
  }

  isMan(): boolean {
    return this.type === PieceType.MAN;
  }

  promote(): Piece {
    if (this.isKing()) throw new Error('Piece is already a king');
    return new Piece(PieceType.KING, this.color, this.position);
  }

  moveTo(newPosition: Position): Piece {
    return new Piece(this.type, this.color, newPosition);
  }

  shouldPromote(): boolean {
    if (this.isKing()) return false;
    const { row } = this.position.toRowCol();
    if (this.color === PlayerColor.WHITE && row === 7) return true;
    if (this.color === PlayerColor.BLACK && row === 0) return true;
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
    return `${this.color === PlayerColor.WHITE ? 'W' : 'B'}${this.isKing() ? 'K' : 'M'}@${this.position.value}`;
  }
}
