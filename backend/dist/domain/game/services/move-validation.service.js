"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MoveValidationService = void 0;
const move_entity_1 = require("../entities/move.entity");
const game_constants_1 = require("../../../shared/constants/game.constants");
const capture_finding_service_1 = require("./capture-finding.service");
const validation_error_type_1 = require("../types/validation-error.type");
const capture_path_type_1 = require("../types/capture-path.type");
class MoveValidationService {
    captureFindingService;
    constructor() {
        this.captureFindingService = new capture_finding_service_1.CaptureFindingService();
    }
    validateMove(game, player, from, to, path) {
        try {
            this.validateGameState(game);
            this.validateTurn(game, player);
            const piece = this.validatePieceOwnership(game.board, from, player);
            const availableCaptures = this.captureFindingService.findAllCaptures(game.board, player);
            if (availableCaptures.length > 0) {
                return this.validateCaptureMove(game, piece, from, to, path || [], availableCaptures);
            }
            return this.validateSimpleMove(game, piece, from, to);
        }
        catch (error) {
            if (error instanceof validation_error_type_1.ValidationError) {
                return {
                    isValid: false,
                    error,
                };
            }
            throw error;
        }
    }
    validateGameState(game) {
        if (game.status !== game_constants_1.GameStatus.ACTIVE) {
            throw validation_error_type_1.ValidationError.gameNotActive();
        }
    }
    validateTurn(game, player) {
        if (game.currentTurn !== player) {
            throw validation_error_type_1.ValidationError.wrongTurn(player);
        }
    }
    validatePieceOwnership(board, from, player) {
        const piece = board.getPieceAt(from);
        if (!piece) {
            throw validation_error_type_1.ValidationError.noPiece(from.value);
        }
        if (piece.color !== player) {
            throw validation_error_type_1.ValidationError.wrongPieceColor(from.value);
        }
        return piece;
    }
    validateCaptureMove(game, piece, from, to, path, availableCaptures) {
        const matchingCapture = availableCaptures.find((capture) => capture.from.equals(from) && capture.to.equals(to));
        if (!matchingCapture) {
            throw validation_error_type_1.ValidationError.captureRequired();
        }
        const moveNumber = game.getMoveCount() + 1;
        const notation = move_entity_1.Move.generateNotation(from, to, matchingCapture.capturedSquares);
        const move = new move_entity_1.Move(crypto.randomUUID(), game.id, moveNumber, piece.color, from, to, matchingCapture.capturedSquares, matchingCapture.isPromotion, notation);
        let newBoard = game.board;
        for (const capturedPos of matchingCapture.capturedSquares) {
            newBoard = newBoard.removePiece(capturedPos);
        }
        newBoard = newBoard.movePiece(from, to);
        return {
            isValid: true,
            move,
            newBoardState: newBoard,
        };
    }
    validateSimpleMove(game, piece, from, to) {
        if (game.board.isOccupied(to)) {
            throw new validation_error_type_1.ValidationError(validation_error_type_1.ValidationErrorCode.DESTINATION_OCCUPIED, `Destination square ${to.value} is occupied`);
        }
        if (!this.isValidSimpleMove(piece, from, to)) {
            throw validation_error_type_1.ValidationError.invalidMove(`Piece cannot move from ${from.value} to ${to.value}`);
        }
        const moveNumber = game.getMoveCount() + 1;
        const notation = move_entity_1.Move.generateNotation(from, to, []);
        const movedPiece = piece.moveTo(to);
        const isPromotion = movedPiece.shouldPromote();
        const move = new move_entity_1.Move(crypto.randomUUID(), game.id, moveNumber, piece.color, from, to, [], isPromotion, notation);
        const newBoard = game.board.movePiece(from, to);
        return {
            isValid: true,
            move,
            newBoardState: newBoard,
        };
    }
    isValidSimpleMove(piece, from, to) {
        const fromCoords = from.toRowCol();
        const toCoords = to.toRowCol();
        const rowDiff = toCoords.row - fromCoords.row;
        const colDiff = Math.abs(toCoords.col - fromCoords.col);
        if (Math.abs(rowDiff) !== 1 || colDiff !== 1) {
            return false;
        }
        const validDirections = (0, capture_path_type_1.getValidDirections)(piece);
        const moveDirection = {
            row: rowDiff,
            col: toCoords.col - fromCoords.col,
        };
        return validDirections.some((dir) => dir.row === moveDirection.row && dir.col === moveDirection.col);
    }
}
exports.MoveValidationService = MoveValidationService;
//# sourceMappingURL=move-validation.service.js.map