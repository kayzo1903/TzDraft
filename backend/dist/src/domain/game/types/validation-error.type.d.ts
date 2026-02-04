export declare enum ValidationErrorCode {
    GAME_NOT_ACTIVE = "GAME_NOT_ACTIVE",
    GAME_ALREADY_FINISHED = "GAME_ALREADY_FINISHED",
    WRONG_TURN = "WRONG_TURN",
    NO_PIECE = "NO_PIECE",
    WRONG_PIECE_COLOR = "WRONG_PIECE_COLOR",
    INVALID_MOVE = "INVALID_MOVE",
    INVALID_DIRECTION = "INVALID_DIRECTION",
    PATH_BLOCKED = "PATH_BLOCKED",
    DESTINATION_OCCUPIED = "DESTINATION_OCCUPIED",
    CAPTURE_REQUIRED = "CAPTURE_REQUIRED",
    INVALID_CAPTURE = "INVALID_CAPTURE",
    NO_PIECE_TO_CAPTURE = "NO_PIECE_TO_CAPTURE",
    CANNOT_CAPTURE_OWN_PIECE = "CANNOT_CAPTURE_OWN_PIECE",
    INCOMPLETE_CAPTURE_SEQUENCE = "INCOMPLETE_CAPTURE_SEQUENCE"
}
export declare class ValidationError extends Error {
    readonly code: ValidationErrorCode;
    readonly details?: Record<string, any> | undefined;
    constructor(code: ValidationErrorCode, message: string, details?: Record<string, any> | undefined);
    static gameNotActive(): ValidationError;
    static wrongTurn(expectedPlayer: string): ValidationError;
    static noPiece(position: number): ValidationError;
    static wrongPieceColor(position: number): ValidationError;
    static captureRequired(): ValidationError;
    static invalidMove(reason: string): ValidationError;
}
