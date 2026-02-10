import { BoardState } from '../value-objects/board-state.vo';
import { Piece } from '../value-objects/piece.vo';
import { Position } from '../value-objects/position.vo';
import { PlayerColor } from '../constants';
import { CapturePath } from '../types/capture-path.type';
/**
 * Capture Finding Service
 * Finds all possible captures for a player, including multi-capture sequences
 */
export declare class CaptureFindingService {
    /**
     * Find all possible captures for the current player
     */
    findAllCaptures(board: BoardState, player: PlayerColor): CapturePath[];
    /**
     * Find all captures for a specific piece
     */
    findCapturesForPiece(board: BoardState, piece: Piece): CapturePath[];
    /**
     * Recursively find capture sequences in a direction
     * Handles multi-capture by exploring all possible paths
     */
    private findCaptureInDirection;
    /**
     * Check if a specific capture is valid
     */
    isValidCapture(board: BoardState, piece: Piece, to: Position, capturedSquares: Position[]): boolean;
    /**
     * Check if any captures are available for the player
     */
    hasCapturesAvailable(board: BoardState, player: PlayerColor): boolean;
}
//# sourceMappingURL=capture-finding.service.d.ts.map