import { PieceType, PlayerColor, } from '../constants';
/**
 * Piece Value Object
 * Represents a single piece on the board
 */
export class Piece {
    constructor(type, color, position) {
        Object.defineProperty(this, "type", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: type
        });
        Object.defineProperty(this, "color", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: color
        });
        Object.defineProperty(this, "position", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: position
        });
    }
    /**
     * Check if piece is a king
     */
    isKing() {
        return this.type === PieceType.KING;
    }
    /**
     * Check if piece is a man
     */
    isMan() {
        return this.type === PieceType.MAN;
    }
    /**
     * Promote piece to king
     */
    promote() {
        if (this.isKing()) {
            throw new Error('Piece is already a king');
        }
        return new Piece(PieceType.KING, this.color, this.position);
    }
    /**
     * Move piece to new position
     */
    moveTo(newPosition) {
        return new Piece(this.type, this.color, newPosition);
    }
    /**
     * Check if piece should be promoted (reached opponent's back row)
     */
    shouldPromote() {
        if (this.isKing())
            return false;
        const { row } = this.position.toRowCol();
        // White pieces promote on row 0, Black pieces promote on row 7
        if (this.color === PlayerColor.WHITE && row === 0)
            return true;
        if (this.color === PlayerColor.BLACK && row === 7)
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
        const colorSymbol = this.color === PlayerColor.WHITE ? 'W' : 'B';
        return `${colorSymbol}${symbol}@${this.position.value}`;
    }
}
