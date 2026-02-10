/**
 * Game Status Constants
 */
export declare enum GameStatus {
    WAITING = "WAITING",
    ACTIVE = "ACTIVE",
    FINISHED = "FINISHED",
    ABORTED = "ABORTED"
}
/**
 * Game Type Constants
 */
export declare enum GameType {
    RANKED = "RANKED",
    CASUAL = "CASUAL",
    AI = "AI"
}
/**
 * Player Color
 */
export declare enum PlayerColor {
    WHITE = "WHITE",
    BLACK = "BLACK"
}
/**
 * Winner
 */
export declare enum Winner {
    WHITE = "WHITE",
    BLACK = "BLACK",
    DRAW = "DRAW"
}
/**
 * End Reason
 */
export declare enum EndReason {
    CHECKMATE = "CHECKMATE",
    RESIGN = "RESIGN",
    TIME = "TIME",
    DISCONNECT = "DISCONNECT",
    DRAW = "DRAW"
}
/**
 * Board Constants
 */
export declare const BOARD_SIZE = 8;
export declare const TOTAL_SQUARES = 32;
export declare const PIECES_PER_PLAYER = 12;
/**
 * Piece Type
 */
export declare enum PieceType {
    MAN = "MAN",
    KING = "KING"
}
/**
 * AI Difficulty Levels (ELO-based)
 */
export declare const AI_DIFFICULTY_LEVELS: {
    readonly BEGINNER: {
        readonly rating: 350;
        readonly depth: 1;
        readonly randomness: 0.8;
    };
    readonly EASY: {
        readonly rating: 750;
        readonly depth: 3;
        readonly randomness: 0.6;
    };
    readonly MEDIUM: {
        readonly rating: 1000;
        readonly depth: 5;
        readonly randomness: 0.4;
    };
    readonly NORMAL: {
        readonly rating: 1200;
        readonly depth: 7;
        readonly randomness: 0.2;
    };
    readonly STRONG: {
        readonly rating: 1500;
        readonly depth: 9;
        readonly randomness: 0.1;
    };
    readonly EXPERT: {
        readonly rating: 2000;
        readonly depth: 12;
        readonly randomness: 0;
    };
    readonly MASTER: {
        readonly rating: 2500;
        readonly depth: 16;
        readonly randomness: 0;
    };
};
/**
 * Time Control Types
 */
export declare enum TimeControlType {
    STANDARD = "STANDARD",
    INCREMENTAL = "INCREMENTAL",
    DELAY = "DELAY"
}
/**
 * Default Time Controls (in milliseconds)
 */
export declare const DEFAULT_TIME_CONTROLS: {
    readonly BLITZ: {
        readonly initial: 300000;
        readonly increment: 0;
    };
    readonly RAPID: {
        readonly initial: 600000;
        readonly increment: 5000;
    };
    readonly CLASSICAL: {
        readonly initial: 1800000;
        readonly increment: 0;
    };
};
/**
 * Rule Version
 */
export declare const RULE_VERSION = "TZ-8x8-v1";
/**
 * Default ELO Rating
 */
export declare const DEFAULT_ELO_RATING = 1200;
//# sourceMappingURL=constants.d.ts.map