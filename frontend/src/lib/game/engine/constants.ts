/**
 * Player Color
 */
export enum PlayerColor {
  WHITE = 'WHITE',
  BLACK = 'BLACK',
}

/**
 * Winner
 */
export enum Winner {
  WHITE = 'WHITE',
  BLACK = 'BLACK',
  DRAW = 'DRAW',
}

/**
 * End Reason
 */
export enum EndReason {
  CHECKMATE = 'CHECKMATE',
  RESIGN = 'RESIGN',
  TIME = 'TIME',
  DISCONNECT = 'DISCONNECT',
  DRAW = 'DRAW',
}

/**
 * Board Constants
 */
export const BOARD_SIZE = 8;
export const TOTAL_SQUARES = 32; // Only dark squares are playable
export const PIECES_PER_PLAYER = 12;

/**
 * Piece Type
 */
export enum PieceType {
  MAN = 'MAN',
  KING = 'KING',
}

export const RULE_VERSION = 'TZ-8x8-v1';
