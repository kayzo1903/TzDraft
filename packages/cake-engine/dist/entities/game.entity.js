import { BoardState } from '../value-objects/board-state.vo';
import { GameStatus, PlayerColor, RULE_VERSION, } from '../constants';
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
        this._currentTurn =
            this._currentTurn === PlayerColor.WHITE ? PlayerColor.BLACK : PlayerColor.WHITE;
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
