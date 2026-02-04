"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Position = void 0;
class Position {
    _value;
    constructor(value) {
        if (value < 1 || value > 32) {
            throw new Error(`Invalid position: ${value}. Must be between 1 and 32.`);
        }
        this._value = value;
    }
    get value() {
        return this._value;
    }
    toRowCol() {
        const row = Math.floor((this._value - 1) / 4);
        const col = ((this._value - 1) % 4) * 2 + (row % 2);
        return { row, col };
    }
    static fromRowCol(row, col) {
        if (row < 0 || row > 7 || col < 0 || col > 7) {
            throw new Error(`Invalid row/col: ${row},${col}`);
        }
        if ((row + col) % 2 === 0) {
            throw new Error(`Position ${row},${col} is not a dark square`);
        }
        const squareNumber = row * 4 + Math.floor(col / 2) + 1;
        return new Position(squareNumber);
    }
    equals(other) {
        return this._value === other._value;
    }
    toString() {
        return `Position(${this._value})`;
    }
}
exports.Position = Position;
//# sourceMappingURL=position.vo.js.map