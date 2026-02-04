import { Piece } from '../value-objects/piece.vo';
import { Position } from '../value-objects/position.vo';
export interface CapturePath {
    piece: Piece;
    from: Position;
    path: Position[];
    capturedSquares: Position[];
    to: Position;
    isPromotion: boolean;
}
export interface Direction {
    row: number;
    col: number;
}
export declare const DIAGONAL_DIRECTIONS: Direction[];
export declare function getValidDirections(piece: Piece): Direction[];
