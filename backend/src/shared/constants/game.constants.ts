/**
 * Game Status Constants
 */
export enum GameStatus {
  WAITING = 'WAITING',
  ACTIVE = 'ACTIVE',
  FINISHED = 'FINISHED',
  ABORTED = 'ABORTED',
}

/**
 * Game Type Constants
 */
export enum GameType {
  RANKED = 'RANKED',
  CASUAL = 'CASUAL',
  AI = 'AI',
  TOURNAMENT = 'TOURNAMENT',
  LEAGUE = 'LEAGUE',
}

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
  NO_MOVES = 'NO_MOVES', // Current player has no legal moves → loses in draughts
  STALEMATE = 'STALEMATE', // Legacy alias kept for existing DB rows (same as NO_MOVES)
  CHECKMATE = 'CHECKMATE', // Legacy alias kept for existing DB rows
  RESIGN = 'RESIGN',
  TIME = 'TIME',
  DISCONNECT = 'DISCONNECT',
  DRAW = 'DRAW', // Generic draw (legacy / fallback)
  DRAW_REPETITION = 'DRAW_REPETITION', // Art. 8.2 — same position appeared 3 times
  DRAW_30_MOVE = 'DRAW_30_MOVE', // Art. 8.3 — 30 moves kings-only, no capture
  DRAW_THREE_KINGS = 'DRAW_THREE_KINGS', // Art. 8.5 — stronger side (3+ kings) failed to win in 12 moves
  DRAW_ENDGAME = 'DRAW_ENDGAME', // Art. 8.4 — K+Man vs K / 2K vs K, no win in 5 full moves
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

/**
 * AI Difficulty Levels (ELO-based)
 */
export const AI_DIFFICULTY_LEVELS = {
  BEGINNER: { rating: 350, depth: 1, randomness: 0.8 },
  EASY: { rating: 750, depth: 3, randomness: 0.6 },
  MEDIUM: { rating: 1000, depth: 5, randomness: 0.4 },
  NORMAL: { rating: 1200, depth: 7, randomness: 0.2 },
  STRONG: { rating: 1500, depth: 9, randomness: 0.1 },
  EXPERT: { rating: 2000, depth: 12, randomness: 0 },
  MASTER: { rating: 2500, depth: 16, randomness: 0 },
} as const;

/**
 * Time Control Types
 */
export enum TimeControlType {
  STANDARD = 'STANDARD',
  INCREMENTAL = 'INCREMENTAL',
  DELAY = 'DELAY',
}

/**
 * Default Time Controls (in milliseconds)
 */
export const DEFAULT_TIME_CONTROLS = {
  BLITZ: { initial: 300000, increment: 0 }, // 5 minutes
  RAPID: { initial: 600000, increment: 5000 }, // 10 minutes + 5 seconds
  CLASSICAL: { initial: 1800000, increment: 0 }, // 30 minutes
} as const;

/**
 * Rule Version
 */
export const RULE_VERSION = 'TZ-8x8-v1';

/**
 * Default ELO Rating
 */
export const DEFAULT_ELO = 1200;
