import { Position } from '../value-objects/position.vo';
import { PlayerColor } from '../constants';
/**
 * Move Entity
 * Represents a single move in the game
 */
export declare class Move {
    readonly id: string;
    readonly gameId: string;
    readonly moveNumber: number;
    readonly player: PlayerColor;
    readonly from: Position;
    readonly to: Position;
    readonly capturedSquares: Position[];
    readonly isPromotion: boolean;
    readonly notation: string;
    readonly createdAt: Date;
    constructor(id: string, gameId: string, moveNumber: number, player: PlayerColor, from: Position, to: Position, capturedSquares: Position[], isPromotion: boolean, notation: string, createdAt?: Date);
    /**
     * Check if this is a capture move
     */
    isCapture(): boolean;
    /**
     * Check if this is a multi-capture move
     */
    isMultiCapture(): boolean;
    /**
     * Generate notation for the move (e.g., "22x17x10" or "11-15")
     */
    static generateNotation(from: Position, to: Position, capturedSquares: Position[]): string;
    toString(): string;
}
//# sourceMappingURL=move.entity.d.ts.map