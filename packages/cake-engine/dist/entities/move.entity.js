/**
 * Move Entity
 * Represents a single move in the game
 */
export class Move {
    constructor(id, gameId, moveNumber, player, from, to, capturedSquares, isPromotion, notation, createdAt = new Date()) {
        Object.defineProperty(this, "id", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: id
        });
        Object.defineProperty(this, "gameId", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: gameId
        });
        Object.defineProperty(this, "moveNumber", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: moveNumber
        });
        Object.defineProperty(this, "player", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: player
        });
        Object.defineProperty(this, "from", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: from
        });
        Object.defineProperty(this, "to", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: to
        });
        Object.defineProperty(this, "capturedSquares", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: capturedSquares
        });
        Object.defineProperty(this, "isPromotion", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: isPromotion
        });
        Object.defineProperty(this, "notation", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: notation
        });
        Object.defineProperty(this, "createdAt", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: createdAt
        });
    }
    /**
     * Check if this is a capture move
     */
    isCapture() {
        return this.capturedSquares.length > 0;
    }
    /**
     * Check if this is a multi-capture move
     */
    isMultiCapture() {
        return this.capturedSquares.length > 1;
    }
    /**
     * Generate notation for the move (e.g., "22x17x10" or "11-15")
     */
    static generateNotation(from, to, capturedSquares) {
        if (capturedSquares.length > 0) {
            // Capture notation: from x captured1 x captured2 x ... x to
            const path = [from, ...capturedSquares, to];
            return path.map((p) => p.value).join('x');
        }
        else {
            // Simple move notation: from-to
            return `${from.value}-${to.value}`;
        }
    }
    toString() {
        return `Move ${this.moveNumber}: ${this.notation} (${this.player})`;
    }
}
