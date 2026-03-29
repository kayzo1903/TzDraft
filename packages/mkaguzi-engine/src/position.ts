import { PlayerColor } from './constants.js';

export class Position {
  private readonly _value: number;

  constructor(value: number) {
    if (value < 1 || value > 32) {
      throw new Error(`Invalid position: ${value}. Must be between 1 and 32.`);
    }
    this._value = value;
  }

  get value(): number {
    return this._value;
  }

  toRowCol(): { row: number; col: number } {
    const row = Math.floor((this._value - 1) / 4);
    const col = ((this._value - 1) % 4) * 2 + ((row + 1) % 2);
    return { row, col };
  }

  static fromRowCol(row: number, col: number): Position {
    if (row < 0 || row > 7 || col < 0 || col > 7) {
      throw new Error(`Invalid row/col: ${row},${col}`);
    }
    if ((row + col) % 2 === 0) {
      throw new Error(`Position ${row},${col} is not a dark square`);
    }
    const squareNumber = row * 4 + Math.floor(col / 2) + 1;
    return new Position(squareNumber);
  }

  equals(other: Position): boolean {
    return this._value === other._value;
  }

  toString(): string {
    return `Position(${this._value})`;
  }
}

// Re-export for callers that use PlayerColor alongside Position
export { PlayerColor };
