import { Piece } from './piece.vo';
import { Position } from './position.vo';
import { PlayerColor } from '../constants';
/**
 * BoardState Value Object
 * Represents the complete state of the game board
 */
export declare class BoardState {
    private readonly pieces;
    constructor(pieces?: Piece[]);
    /**
     * Get piece at position
     */
    getPieceAt(position: Position): Piece | null;
    /**
     * Get all pieces of a specific color
     */
    getPiecesByColor(color: PlayerColor): Piece[];
    /**
     * Get all pieces on the board
     */
    getAllPieces(): Piece[];
    /**
     * Check if position is occupied
     */
    isOccupied(position: Position): boolean;
    /**
     * Check if position is empty
     */
    isEmpty(position: Position): boolean;
    /**
     * Place piece on board
     */
    placePiece(piece: Piece): BoardState;
    /**
     * Remove piece from board
     */
    removePiece(position: Position): BoardState;
    /**
     * Move piece from one position to another
     */
    movePiece(from: Position, to: Position): BoardState;
    /**
     * Create initial board state for Tanzania Drafti
     */
    static createInitialBoard(): BoardState;
    /**
     * Count pieces by color
     */
    countPieces(color: PlayerColor): number;
    /**
     * Clone the board state
     */
    clone(): BoardState;
    toString(): string;
}
//# sourceMappingURL=board-state.vo.d.ts.map