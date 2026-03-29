import { BoardState } from './board-state.js';
import { GameStatus, PlayerColor, RULE_VERSION, } from './constants.js';
export class Game {
    constructor(id, whitePlayerId, blackPlayerId, gameType, whiteElo = null, blackElo = null, aiLevel = null, initialTimeMs = 600000, clockInfo, createdAt = new Date(), startedAt = null, endedAt = null, status = GameStatus.WAITING, winner = null, endReason = null, currentTurn = PlayerColor.WHITE) {
        this.id = id;
        this.whitePlayerId = whitePlayerId;
        this.blackPlayerId = blackPlayerId;
        this.gameType = gameType;
        this.whiteElo = whiteElo;
        this.blackElo = blackElo;
        this.aiLevel = aiLevel;
        this.initialTimeMs = initialTimeMs;
        this.clockInfo = clockInfo;
        this.createdAt = createdAt;
        this._reversibleMoveCount = 0;
        this._threeKingsMoveCount = 0;
        this._endgameMoveCount = 0;
        this._status = status;
        this._board = BoardState.createInitialBoard();
        this._moves = [];
        this._currentTurn = currentTurn;
        this._winner = winner;
        this._endReason = endReason;
        this._startedAt = startedAt;
        this._endedAt = endedAt;
    }
    get status() { return this._status; }
    get board() { return this._board; }
    get moves() { return [...this._moves]; }
    get currentTurn() { return this._currentTurn; }
    get winner() { return this._winner; }
    get endReason() { return this._endReason; }
    get startedAt() { return this._startedAt; }
    get endedAt() { return this._endedAt; }
    get ruleVersion() { return RULE_VERSION; }
    get reversibleMoveCount() { return this._reversibleMoveCount; }
    get threeKingsMoveCount() { return this._threeKingsMoveCount; }
    get endgameMoveCount() { return this._endgameMoveCount; }
    getMoveCount() { return this._moves.length; }
    isGameOver() { return this._status === GameStatus.FINISHED; }
    start() {
        if (this._status !== GameStatus.WAITING)
            throw new Error('Game has already started');
        this._status = GameStatus.ACTIVE;
        this._startedAt = new Date();
    }
    applyMove(move) {
        if (this._status !== GameStatus.ACTIVE)
            throw new Error('Game is not active');
        if (move.player !== this._currentTurn)
            throw new Error(`It is not ${move.player}'s turn`);
        let newBoard = this._board;
        for (const capturedPos of move.capturedSquares) {
            newBoard = newBoard.removePiece(capturedPos);
        }
        newBoard = newBoard.movePiece(move.from, move.to);
        this._moves.push(move);
        this._board = newBoard;
        this.updateDrawCounters(move.player, move.capturedSquares.length > 0);
        this._currentTurn =
            this._currentTurn === PlayerColor.WHITE ? PlayerColor.BLACK : PlayerColor.WHITE;
    }
    updateDrawCounters(movingPlayer, wasCapture) {
        const whitePieces = this._board.getPiecesByColor(PlayerColor.WHITE);
        const blackPieces = this._board.getPiecesByColor(PlayerColor.BLACK);
        const allPieces = [...whitePieces, ...blackPieces];
        const isKingsOnly = allPieces.length > 0 && allPieces.every((p) => p.isKing());
        if (!isKingsOnly || wasCapture) {
            this._reversibleMoveCount = 0;
        }
        else {
            this._reversibleMoveCount++;
        }
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
    endGame(winner, reason) {
        if (this._status === GameStatus.FINISHED)
            throw new Error('Game has already finished');
        this._status = GameStatus.FINISHED;
        this._winner = winner;
        this._endReason = reason;
        this._endedAt = new Date();
    }
    canAcceptMove() {
        return this._status === GameStatus.ACTIVE && !this.isGameOver();
    }
    toString() {
        return `Game ${this.id} (${this.gameType}): ${this._status}`;
    }
}
//# sourceMappingURL=game.js.map