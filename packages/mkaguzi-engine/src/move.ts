import { Position } from './position.js';
import { PlayerColor } from './constants.js';

export class Move {
  constructor(
    public readonly id: string,
    public readonly gameId: string,
    public readonly moveNumber: number,
    public readonly player: PlayerColor,
    public readonly from: Position,
    public readonly to: Position,
    public readonly capturedSquares: Position[],
    public readonly isPromotion: boolean,
    public readonly notation: string,
    public readonly createdAt: Date = new Date(),
  ) {}

  isCapture(): boolean {
    return this.capturedSquares.length > 0;
  }

  isMultiCapture(): boolean {
    return this.capturedSquares.length > 1;
  }

  static generateNotation(
    from: Position,
    to: Position,
    capturedSquares: Position[],
  ): string {
    if (capturedSquares.length > 0) {
      const path = [from, ...capturedSquares, to];
      return path.map((p) => p.value).join('x');
    }
    return `${from.value}-${to.value}`;
  }

  toString(): string {
    return `Move ${this.moveNumber}: ${this.notation} (${this.player})`;
  }
}
