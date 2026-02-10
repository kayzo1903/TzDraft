import { Move } from "../entities/move.entity";
import { Piece } from "../value-objects/piece.vo";
import { Position } from "../value-objects/position.vo";
import { BoardState } from "../value-objects/board-state.vo";
import { PlayerColor } from "../constants";
/**
 * Move Generator Service
 * Generates all possible legal moves for a player
 * Used by AI and for move hints
 */
export declare class MoveGeneratorService {
    private captureFindingService;
    constructor();
    /**
     * Generate all legal moves for a player
     */
    /**
     * Generate all legal moves for a player
     */
    generateAllMoves(board: BoardState, player: PlayerColor, moveCount?: number): Move[];
    /**
     * Generate all moves for a specific piece
     */
    generateMovesForPiece(board: BoardState, piece: Piece, moveCount?: number): Move[];
    /**
     * Generate simple (non-capture) moves for a piece
     */
    private generateSimpleMovesForPiece;
    /**
     * Count total legal moves for a player
     */
    countLegalMoves(board: BoardState, player: PlayerColor, moveCount?: number): number;
    /**
     * Check if a specific move is legal
     */
    isMoveLegal(board: BoardState, player: PlayerColor, from: Position, to: Position, moveCount?: number): boolean;
    /**
     * Generate a unique move ID
     */
    private generateMoveId;
}
//# sourceMappingURL=move-generator.service.d.ts.map