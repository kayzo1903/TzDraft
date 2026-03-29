export enum GameStatus {
  WAITING = 'WAITING',
  ACTIVE = 'ACTIVE',
  FINISHED = 'FINISHED',
  ABORTED = 'ABORTED',
}

export enum GameType {
  RANKED = 'RANKED',
  CASUAL = 'CASUAL',
  AI = 'AI',
}

export enum PlayerColor {
  WHITE = 'WHITE',
  BLACK = 'BLACK',
}

export enum Winner {
  WHITE = 'WHITE',
  BLACK = 'BLACK',
  DRAW = 'DRAW',
}

export enum EndReason {
  STALEMATE = 'STALEMATE',
  CHECKMATE = 'CHECKMATE',
  RESIGN = 'RESIGN',
  TIME = 'TIME',
  DISCONNECT = 'DISCONNECT',
  DRAW = 'DRAW',
}

export const BOARD_SIZE = 8;
export const TOTAL_SQUARES = 32;
export const PIECES_PER_PLAYER = 12;

export enum PieceType {
  MAN = 'MAN',
  KING = 'KING',
}

export const AI_DIFFICULTY_LEVELS = {
  BEGINNER: { rating: 350, depth: 1, randomness: 0.8 },
  EASY: { rating: 750, depth: 3, randomness: 0.6 },
  MEDIUM: { rating: 1000, depth: 5, randomness: 0.4 },
  NORMAL: { rating: 1200, depth: 7, randomness: 0.2 },
  STRONG: { rating: 1500, depth: 9, randomness: 0.1 },
  EXPERT: { rating: 2000, depth: 12, randomness: 0 },
  MASTER: { rating: 2500, depth: 16, randomness: 0 },
} as const;

export enum TimeControlType {
  STANDARD = 'STANDARD',
  INCREMENTAL = 'INCREMENTAL',
  DELAY = 'DELAY',
}

export const DEFAULT_TIME_CONTROLS = {
  BLITZ: { initial: 300000, increment: 0 },
  RAPID: { initial: 600000, increment: 5000 },
  CLASSICAL: { initial: 1800000, increment: 0 },
} as const;

export const RULE_VERSION = 'TZ-8x8-v1';
export const DEFAULT_ELO_RATING = 1200;
