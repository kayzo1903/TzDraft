import { PieceType, PlayerColor } from './constants.js';
export class Piece {
    constructor(type, color, position) {
        this.type = type;
        this.color = color;
        this.position = position;
    }
    isKing() {
        return this.type === PieceType.KING;
    }
    isMan() {
        return this.type === PieceType.MAN;
    }
    promote() {
        if (this.isKing())
            throw new Error('Piece is already a king');
        return new Piece(PieceType.KING, this.color, this.position);
    }
    moveTo(newPosition) {
        return new Piece(this.type, this.color, newPosition);
    }
    shouldPromote() {
        if (this.isKing())
            return false;
        const { row } = this.position.toRowCol();
        if (this.color === PlayerColor.WHITE && row === 7)
            return true;
        if (this.color === PlayerColor.BLACK && row === 0)
            return true;
        return false;
    }
    equals(other) {
        return (this.type === other.type &&
            this.color === other.color &&
            this.position.equals(other.position));
    }
    toString() {
        return `${this.color === PlayerColor.WHITE ? 'W' : 'B'}${this.isKing() ? 'K' : 'M'}@${this.position.value}`;
    }
}
//# sourceMappingURL=piece.js.map