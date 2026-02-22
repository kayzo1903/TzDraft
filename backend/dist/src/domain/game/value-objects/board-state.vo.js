"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BoardState = void 0;
const piece_vo_1 = require("./piece.vo");
const position_vo_1 = require("./position.vo");
const game_constants_1 = require("../../../shared/constants/game.constants");
class BoardState {
    pieces;
    constructor(pieces = []) {
        this.pieces = new Map();
        pieces.forEach((piece) => {
            this.pieces.set(piece.position.value, piece);
        });
    }
    getPieceAt(position) {
        return this.pieces.get(position.value) || null;
    }
    getPiecesByColor(color) {
        return Array.from(this.pieces.values()).filter((p) => p.color === color);
    }
    getAllPieces() {
        return Array.from(this.pieces.values());
    }
    isOccupied(position) {
        return this.pieces.has(position.value);
    }
    isEmpty(position) {
        return !this.isOccupied(position);
    }
    placePiece(piece) {
        const newPieces = Array.from(this.pieces.values());
        newPieces.push(piece);
        return new BoardState(newPieces);
    }
    removePiece(position) {
        const newPieces = Array.from(this.pieces.values()).filter((p) => !p.position.equals(position));
        return new BoardState(newPieces);
    }
    movePiece(from, to) {
        const piece = this.getPieceAt(from);
        if (!piece) {
            throw new Error(`No piece at position ${from.value}`);
        }
        let newBoard = this.removePiece(from);
        const movedPiece = piece.moveTo(to);
        if (movedPiece.shouldPromote()) {
            newBoard = newBoard.placePiece(movedPiece.promote());
        }
        else {
            newBoard = newBoard.placePiece(movedPiece);
        }
        return newBoard;
    }
    static createInitialBoard() {
        const pieces = [];
        for (let i = 1; i <= game_constants_1.PIECES_PER_PLAYER; i++) {
            pieces.push(new piece_vo_1.Piece('MAN', game_constants_1.PlayerColor.WHITE, new position_vo_1.Position(i)));
        }
        for (let i = 21; i <= 32; i++) {
            pieces.push(new piece_vo_1.Piece('MAN', game_constants_1.PlayerColor.BLACK, new position_vo_1.Position(i)));
        }
        return new BoardState(pieces);
    }
    countPieces(color) {
        return this.getPiecesByColor(color).length;
    }
    clone() {
        return new BoardState(this.getAllPieces());
    }
    toString() {
        const board = Array(8)
            .fill(null)
            .map(() => Array(8).fill('.'));
        this.getAllPieces().forEach((piece) => {
            const { row, col } = piece.position.toRowCol();
            const symbol = piece.isKing() ? 'K' : 'M';
            const colorSymbol = piece.color === game_constants_1.PlayerColor.WHITE ? 'W' : 'B';
            board[row][col] = `${colorSymbol}${symbol}`;
        });
        return board.map((row) => row.join(' ')).join('\n');
    }
}
exports.BoardState = BoardState;
//# sourceMappingURL=board-state.vo.js.map