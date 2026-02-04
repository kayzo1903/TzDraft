"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValidationError = exports.ValidationErrorCode = void 0;
var ValidationErrorCode;
(function (ValidationErrorCode) {
    ValidationErrorCode["GAME_NOT_ACTIVE"] = "GAME_NOT_ACTIVE";
    ValidationErrorCode["GAME_ALREADY_FINISHED"] = "GAME_ALREADY_FINISHED";
    ValidationErrorCode["WRONG_TURN"] = "WRONG_TURN";
    ValidationErrorCode["NO_PIECE"] = "NO_PIECE";
    ValidationErrorCode["WRONG_PIECE_COLOR"] = "WRONG_PIECE_COLOR";
    ValidationErrorCode["INVALID_MOVE"] = "INVALID_MOVE";
    ValidationErrorCode["INVALID_DIRECTION"] = "INVALID_DIRECTION";
    ValidationErrorCode["PATH_BLOCKED"] = "PATH_BLOCKED";
    ValidationErrorCode["DESTINATION_OCCUPIED"] = "DESTINATION_OCCUPIED";
    ValidationErrorCode["CAPTURE_REQUIRED"] = "CAPTURE_REQUIRED";
    ValidationErrorCode["INVALID_CAPTURE"] = "INVALID_CAPTURE";
    ValidationErrorCode["NO_PIECE_TO_CAPTURE"] = "NO_PIECE_TO_CAPTURE";
    ValidationErrorCode["CANNOT_CAPTURE_OWN_PIECE"] = "CANNOT_CAPTURE_OWN_PIECE";
    ValidationErrorCode["INCOMPLETE_CAPTURE_SEQUENCE"] = "INCOMPLETE_CAPTURE_SEQUENCE";
})(ValidationErrorCode || (exports.ValidationErrorCode = ValidationErrorCode = {}));
class ValidationError extends Error {
    code;
    details;
    constructor(code, message, details) {
        super(message);
        this.code = code;
        this.details = details;
        this.name = 'ValidationError';
    }
    static gameNotActive() {
        return new ValidationError(ValidationErrorCode.GAME_NOT_ACTIVE, 'Game is not active');
    }
    static wrongTurn(expectedPlayer) {
        return new ValidationError(ValidationErrorCode.WRONG_TURN, `Not ${expectedPlayer}'s turn`, { expectedPlayer });
    }
    static noPiece(position) {
        return new ValidationError(ValidationErrorCode.NO_PIECE, `No piece at position ${position}`, { position });
    }
    static wrongPieceColor(position) {
        return new ValidationError(ValidationErrorCode.WRONG_PIECE_COLOR, `Piece at position ${position} does not belong to current player`, { position });
    }
    static captureRequired() {
        return new ValidationError(ValidationErrorCode.CAPTURE_REQUIRED, 'Capture is mandatory when available');
    }
    static invalidMove(reason) {
        return new ValidationError(ValidationErrorCode.INVALID_MOVE, `Invalid move: ${reason}`, { reason });
    }
}
exports.ValidationError = ValidationError;
//# sourceMappingURL=validation-error.type.js.map