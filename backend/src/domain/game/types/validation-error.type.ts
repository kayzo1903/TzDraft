/**
 * Validation Error Codes
 * Represents all possible move validation failures
 */
export enum ValidationErrorCode {
  // Game state errors
  GAME_NOT_ACTIVE = 'GAME_NOT_ACTIVE',
  GAME_ALREADY_FINISHED = 'GAME_ALREADY_FINISHED',

  // Turn errors
  WRONG_TURN = 'WRONG_TURN',

  // Piece errors
  NO_PIECE = 'NO_PIECE',
  WRONG_PIECE_COLOR = 'WRONG_PIECE_COLOR',

  // Move errors
  INVALID_MOVE = 'INVALID_MOVE',
  INVALID_DIRECTION = 'INVALID_DIRECTION',
  PATH_BLOCKED = 'PATH_BLOCKED',
  DESTINATION_OCCUPIED = 'DESTINATION_OCCUPIED',

  // Capture errors
  CAPTURE_REQUIRED = 'CAPTURE_REQUIRED',
  INVALID_CAPTURE = 'INVALID_CAPTURE',
  NO_PIECE_TO_CAPTURE = 'NO_PIECE_TO_CAPTURE',
  CANNOT_CAPTURE_OWN_PIECE = 'CANNOT_CAPTURE_OWN_PIECE',
  INCOMPLETE_CAPTURE_SEQUENCE = 'INCOMPLETE_CAPTURE_SEQUENCE',
}

/**
 * Validation Error
 * Thrown when a move validation fails
 */
export class ValidationError extends Error {
  constructor(
    public readonly code: ValidationErrorCode,
    message: string,
    public readonly details?: Record<string, any>,
  ) {
    super(message);
    this.name = 'ValidationError';
  }

  static gameNotActive(): ValidationError {
    return new ValidationError(
      ValidationErrorCode.GAME_NOT_ACTIVE,
      'Game is not active',
    );
  }

  static wrongTurn(expectedPlayer: string): ValidationError {
    return new ValidationError(
      ValidationErrorCode.WRONG_TURN,
      `Not ${expectedPlayer}'s turn`,
      { expectedPlayer },
    );
  }

  static noPiece(position: number): ValidationError {
    return new ValidationError(
      ValidationErrorCode.NO_PIECE,
      `No piece at position ${position}`,
      { position },
    );
  }

  static wrongPieceColor(position: number): ValidationError {
    return new ValidationError(
      ValidationErrorCode.WRONG_PIECE_COLOR,
      `Piece at position ${position} does not belong to current player`,
      { position },
    );
  }

  static captureRequired(): ValidationError {
    return new ValidationError(
      ValidationErrorCode.CAPTURE_REQUIRED,
      'Capture is mandatory when available',
    );
  }

  static invalidMove(reason: string): ValidationError {
    return new ValidationError(
      ValidationErrorCode.INVALID_MOVE,
      `Invalid move: ${reason}`,
      { reason },
    );
  }
}
