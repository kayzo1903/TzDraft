import { Move } from "../entities/move.entity.js";
import { Position } from "../value-objects/position.vo.js";
import { GameStatus } from "../constants.js";
import { CaptureFindingService } from "./capture-finding.service.js";
import { ValidationError, ValidationErrorCode, } from "../types/validation-error.type.js";
import { getValidDirections } from "../types/capture-path.type.js";
/**
 * Move Validation Service
 * Validates moves according to Tanzania Drafti rules
 */
export class MoveValidationService {
    constructor() {
        Object.defineProperty(this, "captureFindingService", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.captureFindingService = new CaptureFindingService();
    }
    /**
     * Validate a move request
     */
    validateMove(board, currentTurn, status, moveCount, player, from, to, path) {
        try {
            // STEP 1: Game state validation
            this.validateGameState(status);
            // STEP 2: Turn validation
            this.validateTurn(currentTurn, player);
            // STEP 3: Piece ownership validation
            const piece = this.validatePieceOwnership(board, from, player);
            // STEP 4: Detect available captures
            const availableCaptures = this.captureFindingService.findAllCaptures(board, player);
            // STEP 5: Enforce mandatory capture (always when any capture exists)
            if (availableCaptures.length > 0) {
                return this.validateCaptureMove(board, moveCount, piece, from, to, path || [], availableCaptures);
            }
            // STEP 6: Validate simple move
            return this.validateSimpleMove(board, moveCount, piece, from, to);
        }
        catch (error) {
            if (error instanceof ValidationError) {
                return {
                    isValid: false,
                    error,
                };
            }
            throw error;
        }
    }
    /**
     * STEP 1: Validate game state
     */
    validateGameState(status) {
        if (status !== GameStatus.ACTIVE) {
            throw ValidationError.gameNotActive();
        }
    }
    /**
     * STEP 2: Validate turn
     */
    validateTurn(currentTurn, player) {
        if (currentTurn !== player) {
            throw ValidationError.wrongTurn(player);
        }
    }
    /**
     * STEP 3: Validate piece ownership
     */
    validatePieceOwnership(board, from, player) {
        const piece = board.getPieceAt(from);
        if (!piece) {
            throw ValidationError.noPiece(from.value);
        }
        if (piece.color !== player) {
            throw ValidationError.wrongPieceColor(from.value);
        }
        return piece;
    }
    /**
     * Validate a capture move
     */
    validateCaptureMove(board, moveCount, piece, from, to, path, availableCaptures) {
        // Find if this capture is in the available captures
        const matchingCapture = availableCaptures.find((capture) => {
            const matchesPath = path.length === 0 ||
                (capture.path.length === path.length &&
                    capture.path.every((pos, idx) => pos.equals(path[idx])));
            return (capture.from.equals(from) &&
                capture.to.equals(to) &&
                matchesPath);
        });
        if (!matchingCapture) {
            throw ValidationError.captureRequired();
        }
        // Create the move
        const currentMoveNumber = moveCount + 1;
        const notation = Move.generateNotation(from, to, matchingCapture.capturedSquares);
        const move = new Move(this.generateMoveId(), "temp-game-id", currentMoveNumber, piece.color, from, to, matchingCapture.capturedSquares, matchingCapture.isPromotion, notation);
        // Apply the move to get new board state
        let newBoard = board;
        // Remove captured pieces
        for (const capturedPos of matchingCapture.capturedSquares) {
            newBoard = newBoard.removePiece(capturedPos);
        }
        // Move the piece
        newBoard = newBoard.movePiece(from, to);
        return {
            isValid: true,
            move,
            newBoardState: newBoard,
        };
    }
    /**
     * Validate a simple (non-capture) move
     */
    validateSimpleMove(board, moveCount, piece, from, to) {
        // Check if destination is empty
        if (board.isOccupied(to)) {
            throw new ValidationError(ValidationErrorCode.DESTINATION_OCCUPIED, `Destination square ${to.value} is occupied`);
        }
        // Check if move is valid for this piece type
        if (!this.isValidSimpleMove(piece, board, from, to)) {
            throw ValidationError.invalidMove(`Piece cannot move from ${from.value} to ${to.value}`);
        }
        // Create the move
        const currentMoveNumber = moveCount + 1;
        const notation = Move.generateNotation(from, to, []);
        const movedPiece = piece.moveTo(to);
        const isPromotion = movedPiece.shouldPromote();
        const move = new Move(this.generateMoveId(), "temp-game-id", currentMoveNumber, piece.color, from, to, [], isPromotion, notation);
        // Apply the move
        const newBoard = board.movePiece(from, to);
        return {
            isValid: true,
            move,
            newBoardState: newBoard,
        };
    }
    /**
     * Check if a simple move is valid (one diagonal square)
     */
    isValidSimpleMove(piece, board, from, to) {
        const fromCoords = from.toRowCol();
        const toCoords = to.toRowCol();
        const rowDiff = toCoords.row - fromCoords.row;
        const colDiffSigned = toCoords.col - fromCoords.col;
        const colDiffAbs = Math.abs(colDiffSigned);
        const rowDiffAbs = Math.abs(rowDiff);
        // Must be diagonal
        if (rowDiffAbs !== colDiffAbs || rowDiffAbs === 0) {
            return false;
        }
        // Kings are flying: any diagonal distance, path must be clear.
        if (piece.isKing()) {
            return this.isDiagonalPathClear(board, from, to);
        }
        // Men: exactly one forward diagonal square.
        if (rowDiffAbs !== 1 || colDiffAbs !== 1) {
            return false;
        }
        const validDirections = getValidDirections(piece);
        return validDirections.some((dir) => dir.row === rowDiff && dir.col === Math.sign(colDiffSigned));
    }
    /**
     * Check that every intermediate square between from and to is empty.
     */
    isDiagonalPathClear(board, from, to) {
        const fromCoords = from.toRowCol();
        const toCoords = to.toRowCol();
        const rowStep = Math.sign(toCoords.row - fromCoords.row);
        const colStep = Math.sign(toCoords.col - fromCoords.col);
        let row = fromCoords.row + rowStep;
        let col = fromCoords.col + colStep;
        while (row !== toCoords.row && col !== toCoords.col) {
            const pos = Position.fromRowCol(row, col);
            if (!board.isEmpty(pos)) {
                return false;
            }
            row += rowStep;
            col += colStep;
        }
        return true;
    }
    /**
     * Generate a unique move ID
     */
    generateMoveId() {
        if (typeof crypto !== "undefined" && crypto.randomUUID) {
            return crypto.randomUUID();
        }
        // Fallback for environments without crypto.randomUUID
        return `move-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
}
