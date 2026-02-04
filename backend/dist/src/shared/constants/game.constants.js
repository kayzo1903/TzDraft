"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_ELO = exports.RULE_VERSION = exports.DEFAULT_TIME_CONTROLS = exports.TimeControlType = exports.AI_DIFFICULTY_LEVELS = exports.PieceType = exports.PIECES_PER_PLAYER = exports.TOTAL_SQUARES = exports.BOARD_SIZE = exports.EndReason = exports.Winner = exports.PlayerColor = exports.GameType = exports.GameStatus = void 0;
var GameStatus;
(function (GameStatus) {
    GameStatus["WAITING"] = "WAITING";
    GameStatus["ACTIVE"] = "ACTIVE";
    GameStatus["FINISHED"] = "FINISHED";
    GameStatus["ABORTED"] = "ABORTED";
})(GameStatus || (exports.GameStatus = GameStatus = {}));
var GameType;
(function (GameType) {
    GameType["RANKED"] = "RANKED";
    GameType["CASUAL"] = "CASUAL";
    GameType["AI"] = "AI";
})(GameType || (exports.GameType = GameType = {}));
var PlayerColor;
(function (PlayerColor) {
    PlayerColor["WHITE"] = "WHITE";
    PlayerColor["BLACK"] = "BLACK";
})(PlayerColor || (exports.PlayerColor = PlayerColor = {}));
var Winner;
(function (Winner) {
    Winner["WHITE"] = "WHITE";
    Winner["BLACK"] = "BLACK";
    Winner["DRAW"] = "DRAW";
})(Winner || (exports.Winner = Winner = {}));
var EndReason;
(function (EndReason) {
    EndReason["CHECKMATE"] = "CHECKMATE";
    EndReason["RESIGN"] = "RESIGN";
    EndReason["TIME"] = "TIME";
    EndReason["DISCONNECT"] = "DISCONNECT";
    EndReason["DRAW"] = "DRAW";
})(EndReason || (exports.EndReason = EndReason = {}));
exports.BOARD_SIZE = 8;
exports.TOTAL_SQUARES = 32;
exports.PIECES_PER_PLAYER = 12;
var PieceType;
(function (PieceType) {
    PieceType["MAN"] = "MAN";
    PieceType["KING"] = "KING";
})(PieceType || (exports.PieceType = PieceType = {}));
exports.AI_DIFFICULTY_LEVELS = {
    BEGINNER: { rating: 350, depth: 1, randomness: 0.8 },
    EASY: { rating: 750, depth: 3, randomness: 0.6 },
    MEDIUM: { rating: 1000, depth: 5, randomness: 0.4 },
    NORMAL: { rating: 1200, depth: 7, randomness: 0.2 },
    STRONG: { rating: 1500, depth: 9, randomness: 0.1 },
    EXPERT: { rating: 2000, depth: 12, randomness: 0 },
    MASTER: { rating: 2500, depth: 16, randomness: 0 },
};
var TimeControlType;
(function (TimeControlType) {
    TimeControlType["STANDARD"] = "STANDARD";
    TimeControlType["INCREMENTAL"] = "INCREMENTAL";
    TimeControlType["DELAY"] = "DELAY";
})(TimeControlType || (exports.TimeControlType = TimeControlType = {}));
exports.DEFAULT_TIME_CONTROLS = {
    BLITZ: { initial: 300000, increment: 0 },
    RAPID: { initial: 600000, increment: 5000 },
    CLASSICAL: { initial: 1800000, increment: 0 },
};
exports.RULE_VERSION = 'TZ-8x8-v1';
exports.DEFAULT_ELO = 1200;
//# sourceMappingURL=game.constants.js.map