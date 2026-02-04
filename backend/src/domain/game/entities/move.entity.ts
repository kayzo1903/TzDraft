import { Position } from '../value-objects/position.vo';
import { PlayerColor } from '../../../shared/constants/game.constants';

/**
 * Move Entity
 * Represents a single move in the game
 */
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

  /**
   * Check if this is a capture move
   */
  isCapture(): boolean {
    return this.capturedSquares.length > 0;
  }

  /**
   * Check if this is a multi-capture move
   */
  isMultiCapture(): boolean {
    return this.capturedSquares.length > 1;
  }

  /**
   * Generate notation for the move (e.g., "22x17x10" or "11-15")
   */
  static generateNotation(
    from: Position,
    to: Position,
    capturedSquares: Position[],
  ): string {
    if (capturedSquares.length > 0) {
      // Capture notation: from x captured1 x captured2 x ... x to
      const path = [from, ...capturedSquares, to];
      return path.map((p) => p.value).join('x');
    } else {
      // Simple move notation: from-to
      return `${from.value}-${to.value}`;
    }
  }

  toString(): string {
    return `Move ${this.moveNumber}: ${this.notation} (${this.player})`;
  }
}
