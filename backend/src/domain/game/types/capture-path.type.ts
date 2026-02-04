import { Piece } from '../value-objects/piece.vo';
import { Position } from '../value-objects/position.vo';

/**
 * Capture Path
 * Represents a complete capture sequence (single or multi-capture)
 */
export interface CapturePath {
  piece: Piece; // The piece making the capture
  from: Position; // Starting position
  path: Position[]; // Intermediate jump positions (for multi-capture)
  capturedSquares: Position[]; // Positions of captured pieces
  to: Position; // Final landing position
  isPromotion: boolean; // Whether this capture results in promotion
}

/**
 * Direction Vector
 * Represents a diagonal direction on the board
 */
export interface Direction {
  row: number; // -1 or 1
  col: number; // -1 or 1
}

/**
 * Predefined diagonal directions
 */
export const DIAGONAL_DIRECTIONS: Direction[] = [
  { row: 1, col: 1 }, // Forward-right
  { row: 1, col: -1 }, // Forward-left
  { row: -1, col: 1 }, // Backward-right
  { row: -1, col: -1 }, // Backward-left
];

/**
 * Get valid directions for a piece
 */
export function getValidDirections(piece: Piece): Direction[] {
  if (piece.isKing()) {
    // Kings can move in all 4 diagonal directions
    return DIAGONAL_DIRECTIONS;
  }

  // Men can only move forward
  const forwardRow = piece.color === 'WHITE' ? 1 : -1;
  return [
    { row: forwardRow, col: 1 },
    { row: forwardRow, col: -1 },
  ];
}
