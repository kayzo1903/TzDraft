/**
 * Game Status Constants
 */
export var GameStatus;
(function (GameStatus) {
    GameStatus["WAITING"] = "WAITING";
    GameStatus["ACTIVE"] = "ACTIVE";
    GameStatus["FINISHED"] = "FINISHED";
    GameStatus["ABORTED"] = "ABORTED";
})(GameStatus || (GameStatus = {}));
/**
 * Game Type Constants
 */
export var GameType;
(function (GameType) {
    GameType["RANKED"] = "RANKED";
    GameType["CASUAL"] = "CASUAL";
    GameType["AI"] = "AI";
})(GameType || (GameType = {}));
/**
 * Player Color
 */
export var PlayerColor;
(function (PlayerColor) {
    PlayerColor["WHITE"] = "WHITE";
    PlayerColor["BLACK"] = "BLACK";
})(PlayerColor || (PlayerColor = {}));
/**
 * Winner
 */
export var Winner;
(function (Winner) {
    Winner["WHITE"] = "WHITE";
    Winner["BLACK"] = "BLACK";
    Winner["DRAW"] = "DRAW";
})(Winner || (Winner = {}));
/**
 * End Reason
 */
export var EndReason;
(function (EndReason) {
    EndReason["CHECKMATE"] = "CHECKMATE";
    EndReason["RESIGN"] = "RESIGN";
    EndReason["TIME"] = "TIME";
    EndReason["DISCONNECT"] = "DISCONNECT";
    EndReason["DRAW"] = "DRAW";
})(EndReason || (EndReason = {}));
/**
 * Board Constants
 */
export const BOARD_SIZE = 8;
export const TOTAL_SQUARES = 32; // Only dark squares are playable
export const PIECES_PER_PLAYER = 12;
/**
 * Piece Type
 */
export var PieceType;
(function (PieceType) {
    PieceType["MAN"] = "MAN";
    PieceType["KING"] = "KING";
})(PieceType || (PieceType = {}));
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
};
/**
 * Time Control Types
 */
export var TimeControlType;
(function (TimeControlType) {
    TimeControlType["STANDARD"] = "STANDARD";
    TimeControlType["INCREMENTAL"] = "INCREMENTAL";
    TimeControlType["DELAY"] = "DELAY";
})(TimeControlType || (TimeControlType = {}));
/**
 * Default Time Controls (in milliseconds)
 */
export const DEFAULT_TIME_CONTROLS = {
    BLITZ: { initial: 300000, increment: 0 }, // 5 minutes
    RAPID: { initial: 600000, increment: 5000 }, // 10 minutes + 5 seconds
    CLASSICAL: { initial: 1800000, increment: 0 }, // 30 minutes
};
/**
 * Rule Version
 */
export const RULE_VERSION = 'TZ-8x8-v1';
/**
 * Default ELO Rating
 */
export const DEFAULT_ELO_RATING = 1200;
