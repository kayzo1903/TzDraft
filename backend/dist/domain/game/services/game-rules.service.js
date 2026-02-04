"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameRulesService = void 0;
const position_vo_1 = require("../value-objects/position.vo");
const game_constants_1 = require("../../../shared/constants/game.constants");
const capture_finding_service_1 = require("./capture-finding.service");
class GameRulesService {
    captureFindingService;
    constructor() {
        this.captureFindingService = new capture_finding_service_1.CaptureFindingService();
    }
    shouldPromote(piece, position) {
        if (piece.isKing()) {
            return false;
        }
        const { row } = position.toRowCol();
        if (piece.color === game_constants_1.PlayerColor.WHITE && row === 0) {
            return true;
        }
        if (piece.color === game_constants_1.PlayerColor.BLACK && row === 7) {
            return true;
        }
        return false;
    }
    promotePiece(piece) {
        if (piece.isKing()) {
            return piece;
        }
        return piece.promote();
    }
    isGameOver(game) {
        if (game.isGameOver()) {
            return true;
        }
        const currentPlayerPieces = game.board.getPiecesByColor(game.currentTurn);
        if (currentPlayerPieces.length === 0) {
            return true;
        }
        if (!this.hasLegalMoves(game, game.currentTurn)) {
            return true;
        }
        return false;
    }
    detectWinner(game) {
        const whitePieces = game.board.getPiecesByColor(game_constants_1.PlayerColor.WHITE);
        const blackPieces = game.board.getPiecesByColor(game_constants_1.PlayerColor.BLACK);
        if (whitePieces.length === 0) {
            return game_constants_1.Winner.BLACK;
        }
        if (blackPieces.length === 0) {
            return game_constants_1.Winner.WHITE;
        }
        const whiteHasMoves = this.hasLegalMoves(game, game_constants_1.PlayerColor.WHITE);
        const blackHasMoves = this.hasLegalMoves(game, game_constants_1.PlayerColor.BLACK);
        if (!whiteHasMoves && game.currentTurn === game_constants_1.PlayerColor.WHITE) {
            return game_constants_1.Winner.BLACK;
        }
        if (!blackHasMoves && game.currentTurn === game_constants_1.PlayerColor.BLACK) {
            return game_constants_1.Winner.WHITE;
        }
        return null;
    }
    hasLegalMoves(game, player) {
        const captures = this.captureFindingService.findAllCaptures(game.board, player);
        if (captures.length > 0) {
            return true;
        }
        const pieces = game.board.getPiecesByColor(player);
        for (const piece of pieces) {
            if (this.hasSimpleMovesForPiece(game.board, piece)) {
                return true;
            }
        }
        return false;
    }
    hasSimpleMovesForPiece(board, piece) {
        const { row, col } = piece.position.toRowCol();
        const directions = piece.isKing()
            ? [
                { row: 1, col: 1 },
                { row: 1, col: -1 },
                { row: -1, col: 1 },
                { row: -1, col: -1 },
            ]
            : piece.color === game_constants_1.PlayerColor.WHITE
                ? [
                    { row: 1, col: 1 },
                    { row: 1, col: -1 },
                ]
                : [
                    { row: -1, col: 1 },
                    { row: -1, col: -1 },
                ];
        for (const dir of directions) {
            const newRow = row + dir.row;
            const newCol = col + dir.col;
            if (newRow < 0 || newRow > 7 || newCol < 0 || newCol > 7) {
                continue;
            }
            if ((newRow + newCol) % 2 === 0) {
                continue;
            }
            const targetPos = position_vo_1.Position.fromRowCol(newRow, newCol);
            if (board.isEmpty(targetPos)) {
                return true;
            }
        }
        return false;
    }
    isDrawByInsufficientMaterial(board) {
        const whitePieces = board.getPiecesByColor(game_constants_1.PlayerColor.WHITE);
        const blackPieces = board.getPiecesByColor(game_constants_1.PlayerColor.BLACK);
        if (whitePieces.length === 1 &&
            blackPieces.length === 1 &&
            whitePieces[0].isKing() &&
            blackPieces[0].isKing()) {
            return true;
        }
        return false;
    }
    endGame(game, winner, reason) {
        game.endGame(winner, reason);
    }
    countPieces(board, player) {
        return board.countPieces(player);
    }
}
exports.GameRulesService = GameRulesService;
//# sourceMappingURL=game-rules.service.js.map