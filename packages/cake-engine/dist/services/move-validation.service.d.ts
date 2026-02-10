import { BoardState } from "../value-objects/board-state.vo";
import { Position } from "../value-objects/position.vo";
import { PlayerColor, GameStatus } from "../constants";
import { MoveResult } from "../types/move-result.type";
/**
 * Move Validation Service
 * Validates moves according to Tanzania Drafti rules
 */
export declare class MoveValidationService {
    private captureFindingService;
    constructor();
    /**
     * Validate a move request
     */
    validateMove(board: BoardState, currentTurn: PlayerColor, status: GameStatus, moveCount: number, player: PlayerColor, from: Position, to: Position, path?: Position[]): MoveResult;
    /**
     * STEP 1: Validate game state
     */
    private validateGameState;
    /**
     * STEP 2: Validate turn
     */
    private validateTurn;
    /**
     * STEP 3: Validate piece ownership
     */
    private validatePieceOwnership;
    /**
     * Validate a capture move
     */
    private validateCaptureMove;
    /**
     * Validate a simple (non-capture) move
     */
    private validateSimpleMove;
    /**
     * Check if a simple move is valid (one diagonal square)
     */
    private isValidSimpleMove;
    /**
     * Generate a unique move ID
     */
    private generateMoveId;
}
//# sourceMappingURL=move-validation.service.d.ts.map