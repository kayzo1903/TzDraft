import { Piece } from '../value-objects/piece.vo';
import { Position } from '../value-objects/position.vo';
/**
 * Capture Path
 * Represents a complete capture sequence (single or multi-capture)
 */
export interface CapturePath {
    piece: Piece;
    from: Position;
    path: Position[];
    capturedSquares: Position[];
    to: Position;
    isPromotion: boolean;
}
/**
 * Direction Vector
 * Represents a diagonal direction on the board
 */
export interface Direction {
    row: number;
    col: number;
}
/**
 * Predefined diagonal directions
 */
export declare const DIAGONAL_DIRECTIONS: Direction[];
/**
 * Get valid directions for a piece
 */
export declare function getValidDirections(piece: Piece): Direction[];
//# sourceMappingURL=capture-path.type.d.ts.map