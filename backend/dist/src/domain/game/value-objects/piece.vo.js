"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Piece = void 0;
const game_constants_1 = require("../../../shared/constants/game.constants");
class Piece {
    type;
    color;
    position;
    constructor(type, color, position) {
        this.type = type;
        this.color = color;
        this.position = position;
    }
    isKing() {
        return this.type === game_constants_1.PieceType.KING;
    }
    isMan() {
        return this.type === game_constants_1.PieceType.MAN;
    }
    promote() {
        if (this.isKing()) {
            throw new Error('Piece is already a king');
        }
        return new Piece(game_constants_1.PieceType.KING, this.color, this.position);
    }
    moveTo(newPosition) {
        return new Piece(this.type, this.color, newPosition);
    }
    shouldPromote() {
        if (this.isKing())
            return false;
        const { row } = this.position.toRowCol();
        if (this.color === game_constants_1.PlayerColor.WHITE && row === 0)
            return true;
        if (this.color === game_constants_1.PlayerColor.BLACK && row === 7)
            return true;
        return false;
    }
    equals(other) {
        return (this.type === other.type &&
            this.color === other.color &&
            this.position.equals(other.position));
    }
    toString() {
        const symbol = this.isKing() ? 'K' : 'M';
        const colorSymbol = this.color === game_constants_1.PlayerColor.WHITE ? 'W' : 'B';
        return `${colorSymbol}${symbol}@${this.position.value}`;
    }
}
exports.Piece = Piece;
//# sourceMappingURL=piece.vo.js.map