"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Game = void 0;
const board_state_vo_1 = require("../value-objects/board-state.vo");
const move_entity_1 = require("./move.entity");
const position_vo_1 = require("../value-objects/position.vo");
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
    inviteCode;
    _status;
    _board;
    _moves;
    _currentTurn;
    _winner;
    _endReason;
    _startedAt;
    _endedAt;
    _reversibleMoveCount = 0;
    _threeKingsMoveCount = 0;
    _endgameMoveCount = 0;
    constructor(id, whitePlayerId, blackPlayerId, gameType, whiteElo = null, blackElo = null, aiLevel = null, initialTimeMs = 600000, clockInfo, createdAt = new Date(), startedAt = null, endedAt = null, status = game_constants_1.GameStatus.WAITING, winner = null, endReason = null, currentTurn = game_constants_1.PlayerColor.WHITE, inviteCode = null) {
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
        this.inviteCode = inviteCode;
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
        this.updateDrawCounters(move.player, move.capturedSquares.length > 0);
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
        this._endedAt = new Date();
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
    get reversibleMoveCount() {
        return this._reversibleMoveCount;
    }
    get threeKingsMoveCount() {
        return this._threeKingsMoveCount;
    }
    get endgameMoveCount() {
        return this._endgameMoveCount;
    }
    updateDrawCounters(movingPlayer, wasCapture) {
        const whitePieces = this._board.getPiecesByColor(game_constants_1.PlayerColor.WHITE);
        const blackPieces = this._board.getPiecesByColor(game_constants_1.PlayerColor.BLACK);
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
            const strongerSide = whiteIsStrong
                ? game_constants_1.PlayerColor.WHITE
                : game_constants_1.PlayerColor.BLACK;
            if (movingPlayer === strongerSide) {
                this._threeKingsMoveCount = wasCapture
                    ? 0
                    : this._threeKingsMoveCount + 1;
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
    replayMovesFromHistory(rawMoves) {
        rawMoves.forEach((raw, idx) => {
            const from = new position_vo_1.Position(raw.fromSquare);
            const to = new position_vo_1.Position(raw.toSquare);
            for (const sq of raw.capturedSquares ?? []) {
                this._board = this._board.removePiece(new position_vo_1.Position(sq));
            }
            this._board = this._board.movePiece(from, to);
            const movingPlayer = idx % 2 === 0 ? game_constants_1.PlayerColor.WHITE : game_constants_1.PlayerColor.BLACK;
            const wasCapture = (raw.capturedSquares ?? []).length > 0;
            this.updateDrawCounters(movingPlayer, wasCapture);
            const captured = (raw.capturedSquares ?? []).map((sq) => new position_vo_1.Position(sq));
            this._moves.push(new move_entity_1.Move(raw.id ?? `replay-${this.id}-${idx + 1}`, raw.gameId ?? this.id, raw.moveNumber ?? idx + 1, raw.player ?? movingPlayer, from, to, captured, Boolean(raw.isPromotion), raw.notation ?? move_entity_1.Move.generateNotation(from, to, captured), raw.createdAt ? new Date(raw.createdAt) : new Date()));
        });
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