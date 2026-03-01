import { BoardState } from '../value-objects/board-state.vo.js';
import { GameStatus, PlayerColor, RULE_VERSION, } from '../constants.js';
/**
 * Game Entity (Aggregate Root)
 * Represents a complete game of Tanzania Drafti
 */
export class Game {
    constructor(id, whitePlayerId, blackPlayerId, gameType, whiteElo = null, blackElo = null, aiLevel = null, initialTimeMs = 600000, // Default 10 mins
    clockInfo, createdAt = new Date(), startedAt = null, endedAt = null, status = GameStatus.WAITING, winner = null, endReason = null, currentTurn = PlayerColor.WHITE) {
        Object.defineProperty(this, "id", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: id
        });
        Object.defineProperty(this, "whitePlayerId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: whitePlayerId
        });
        Object.defineProperty(this, "blackPlayerId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: blackPlayerId
        });
        Object.defineProperty(this, "gameType", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: gameType
        });
        Object.defineProperty(this, "whiteElo", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: whiteElo
        });
        Object.defineProperty(this, "blackElo", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: blackElo
        });
        Object.defineProperty(this, "aiLevel", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: aiLevel
        });
        Object.defineProperty(this, "initialTimeMs", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: initialTimeMs
        });
        Object.defineProperty(this, "clockInfo", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: clockInfo
        });
        Object.defineProperty(this, "createdAt", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: createdAt
        });
        Object.defineProperty(this, "_status", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "_board", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "_moves", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "_currentTurn", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "_winner", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "_endReason", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "_startedAt", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "_endedAt", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        // Draw-rule counters
        Object.defineProperty(this, "_reversibleMoveCount", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 0
        });
        Object.defineProperty(this, "_threeKingsMoveCount", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 0
        });
        Object.defineProperty(this, "_endgameMoveCount", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 0
        });
        this._status = status;
        this._board = BoardState.createInitialBoard();
        this._moves = [];
        this._currentTurn = currentTurn;
        this._winner = winner;
        this._endReason = endReason;
        this._startedAt = startedAt;
        this._endedAt = endedAt;
    }
    // Getters
    get status() {
        return this._status;
    }
    get board() {
        return this._board;
    }
    get moves() {
        return [...this._moves];
    }
    get currentTurn() {
        return this._currentTurn;
    }
    get winner() {
        return this._winner;
    }
    get endReason() {
        return this._endReason;
    }
    get startedAt() {
        return this._startedAt;
    }
    get endedAt() {
        return this._endedAt;
    }
    get ruleVersion() {
        return RULE_VERSION;
    }
    /**
     * Start the game
     */
    start() {
        if (this._status !== GameStatus.WAITING) {
            throw new Error('Game has already started');
        }
        this._status = GameStatus.ACTIVE;
        this._startedAt = new Date();
    }
    get reversibleMoveCount() { return this._reversibleMoveCount; }
    get threeKingsMoveCount() { return this._threeKingsMoveCount; }
    get endgameMoveCount() { return this._endgameMoveCount; }
    /**
     * Get move count
     */
    getMoveCount() {
        return this._moves.length;
    }
    /**
     * Check if game is over
     */
    isGameOver() {
        return this._status === GameStatus.FINISHED;
    }
    /**
     * Apply a move to the game
     */
    applyMove(move) {
        if (this._status !== GameStatus.ACTIVE) {
            throw new Error('Game is not active');
        }
        if (move.player !== this._currentTurn) {
            throw new Error(`It is not ${move.player}'s turn`);
        }
        // Remove captured pieces
        let newBoard = this._board;
        for (const capturedPos of move.capturedSquares) {
            newBoard = newBoard.removePiece(capturedPos);
        }
        // Move the piece
        newBoard = newBoard.movePiece(move.from, move.to);
        // Update game state
        this._moves.push(move);
        this._board = newBoard;
        this.updateDrawCounters(move.player, move.capturedSquares.length > 0);
        this._currentTurn =
            this._currentTurn === PlayerColor.WHITE ? PlayerColor.BLACK : PlayerColor.WHITE;
    }
    /** Update draw-rule counters after the board has been updated for this half-move. */
    updateDrawCounters(movingPlayer, wasCapture) {
        const whitePieces = this._board.getPiecesByColor(PlayerColor.WHITE);
        const blackPieces = this._board.getPiecesByColor(PlayerColor.BLACK);
        const allPieces = [...whitePieces, ...blackPieces];
        const isKingsOnly = allPieces.length > 0 && allPieces.every((p) => p.isKing());
        // Art 8.3 — 30-move rule
        if (!isKingsOnly || wasCapture) {
            this._reversibleMoveCount = 0;
        }
        else {
            this._reversibleMoveCount++;
        }
        // Art 8.5 — three-kings rule
        const wKings = whitePieces.filter((p) => p.isKing()).length;
        const bKings = blackPieces.filter((p) => p.isKing()).length;
        const whiteIsStrong = wKings >= 3 && blackPieces.length === 1 && bKings === 1;
        const blackIsStrong = bKings >= 3 && whitePieces.length === 1 && wKings === 1;
        if (!whiteIsStrong && !blackIsStrong) {
            this._threeKingsMoveCount = 0;
        }
        else {
            const strongerSide = whiteIsStrong ? PlayerColor.WHITE : PlayerColor.BLACK;
            if (movingPlayer === strongerSide) {
                this._threeKingsMoveCount = wasCapture ? 0 : this._threeKingsMoveCount + 1;
            }
        }
        // Art 8.4 — endgame material draws (K vs K, K+Man vs K, 2K vs K)
        const wMen = whitePieces.length - wKings;
        const bMen = blackPieces.length - bKings;
        const isEndgame84 = (wKings === 1 && wMen === 0 && bKings === 1 && bMen === 0) ||
            (wKings === 1 && wMen === 1 && bKings === 1 && bMen === 0) ||
            (wKings === 1 && wMen === 0 && bKings === 1 && bMen === 1) ||
            (wKings === 2 && wMen === 0 && bKings === 1 && bMen === 0) ||
            (wKings === 1 && wMen === 0 && bKings === 2 && bMen === 0);
        if (!isEndgame84) {
            this._endgameMoveCount = 0;
        }
        else {
            this._endgameMoveCount++;
        }
    }
    /**
     * End the game
     */
    endGame(winner, reason) {
        if (this._status === GameStatus.FINISHED) {
            throw new Error('Game has already finished');
        }
        this._status = GameStatus.FINISHED;
        this._winner = winner;
        this._endReason = reason;
        this._endedAt = new Date();
    }
    /**
     * Check if game can accept moves
     */
    canAcceptMove() {
        return this._status === GameStatus.ACTIVE && !this.isGameOver();
    }
    toString() {
        return `Game ${this.id} (${this.gameType}): ${this._status}`;
    }
}
