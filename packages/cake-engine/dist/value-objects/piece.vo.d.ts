import { PieceType, PlayerColor } from '../constants';
import { Position } from './position.vo';
/**
 * Piece Value Object
 * Represents a single piece on the board
 */
export declare class Piece {
    readonly type: PieceType;
    readonly color: PlayerColor;
    readonly position: Position;
    constructor(type: PieceType, color: PlayerColor, position: Position);
    /**
     * Check if piece is a king
     */
    isKing(): boolean;
    /**
     * Check if piece is a man
     */
    isMan(): boolean;
    /**
     * Promote piece to king
     */
    promote(): Piece;
    /**
     * Move piece to new position
     */
    moveTo(newPosition: Position): Piece;
    /**
     * Check if piece should be promoted (reached opponent's back row)
     */
    shouldPromote(): boolean;
    equals(other: Piece): boolean;
    toString(): string;
}
//# sourceMappingURL=piece.vo.d.ts.map