"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Move = void 0;
class Move {
    id;
    gameId;
    moveNumber;
    player;
    from;
    to;
    capturedSquares;
    isPromotion;
    notation;
    createdAt;
    constructor(id, gameId, moveNumber, player, from, to, capturedSquares, isPromotion, notation, createdAt = new Date()) {
        this.id = id;
        this.gameId = gameId;
        this.moveNumber = moveNumber;
        this.player = player;
        this.from = from;
        this.to = to;
        this.capturedSquares = capturedSquares;
        this.isPromotion = isPromotion;
        this.notation = notation;
        this.createdAt = createdAt;
    }
    isCapture() {
        return this.capturedSquares.length > 0;
    }
    isMultiCapture() {
        return this.capturedSquares.length > 1;
    }
    static generateNotation(from, to, capturedSquares) {
        if (capturedSquares.length > 0) {
            const path = [from, ...capturedSquares, to];
            return path.map((p) => p.value).join('x');
        }
        else {
            return `${from.value}-${to.value}`;
        }
    }
    toString() {
        return `Move ${this.moveNumber}: ${this.notation} (${this.player})`;
    }
}
exports.Move = Move;
//# sourceMappingURL=move.entity.js.map