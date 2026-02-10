"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Game = void 0;
const board_state_vo_1 = require("../value-objects/board-state.vo");
const game_constants_1 = require("../../../shared/constants/game.constants");
class Game {
    id;
    whitePlayerId;
    blackPlayerId;
    gameType;
    whiteElo;
    blackElo;
    aiLevel;
    initialTimeMs;
    clockInfo;
    createdAt;
    _status;
    _board;
    _moves;
    _currentTurn;
    _winner;
    _endReason;
    _startedAt;
    _endedAt;
    constructor(id, whitePlayerId, blackPlayerId, gameType, whiteElo = null, blackElo = null, aiLevel = null, initialTimeMs = 600000, clockInfo, createdAt = new Date(), startedAt = null, endedAt = null, status = game_constants_1.GameStatus.WAITING, winner = null, endReason = null, currentTurn = game_constants_1.PlayerColor.WHITE) {
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
        this._status = status;
        this._board = board_state_vo_1.BoardState.createInitialBoard();
        this._moves = [];
        this._currentTurn = currentTurn;
        this._winner = winner;
        this._endReason = endReason;
        this._startedAt = startedAt;
        this._endedAt = endedAt;
    }
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
        return game_constants_1.RULE_VERSION;
    }
    start() {
        if (this._status !== game_constants_1.GameStatus.WAITING) {
            throw new Error('Game has already started');
        }
        this._status = game_constants_1.GameStatus.ACTIVE;
        this._startedAt = new Date();
    }
    applyMove(move) {
        if (this._status !== game_constants_1.GameStatus.ACTIVE) {
            throw new Error('Game is not active');
        }
        if (move.player !== this._currentTurn) {
            throw new Error("Not this player's turn");
        }
        this._board = this._board.movePiece(move.from, move.to);
        move.capturedSquares.forEach((capturedPos) => {
            this._board = this._board.removePiece(capturedPos);
        });
        this._moves.push(move);
        this._currentTurn =
            this._currentTurn === game_constants_1.PlayerColor.WHITE
                ? game_constants_1.PlayerColor.BLACK
                : game_constants_1.PlayerColor.WHITE;
    }
    endGame(winner, reason) {
        if (this._status === game_constants_1.GameStatus.FINISHED) {
            throw new Error('Game is already finished');
        }
        this._status = game_constants_1.GameStatus.FINISHED;
        this._winner = winner;
        this._endReason = reason;
    }
    resign(player) {
        const winner = player === game_constants_1.PlayerColor.WHITE ? game_constants_1.Winner.BLACK : game_constants_1.Winner.WHITE;
        this.endGame(winner, game_constants_1.EndReason.RESIGN);
    }
    abort() {
        this._status = game_constants_1.GameStatus.ABORTED;
    }
    isGameOver() {
        return (this._status === game_constants_1.GameStatus.FINISHED ||
            this._status === game_constants_1.GameStatus.ABORTED);
    }
    isPlayerTurn(player) {
        return this._currentTurn === player && this._status === game_constants_1.GameStatus.ACTIVE;
    }
    getMoveCount() {
        return this._moves.length;
    }
    getLastMove() {
        return this._moves.length > 0 ? this._moves[this._moves.length - 1] : null;
    }
    get clock() {
        return {
            initialTimeMs: this.initialTimeMs,
        };
    }
    isPvE() {
        return this.gameType === game_constants_1.GameType.AI;
    }
    isPvP() {
        return (this.gameType === game_constants_1.GameType.RANKED || this.gameType === game_constants_1.GameType.CASUAL);
    }
    toString() {
        return `Game ${this.id}: ${this._status} - ${this._currentTurn} to move`;
    }
}
exports.Game = Game;
//# sourceMappingURL=game.entity.js.map