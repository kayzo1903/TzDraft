import { PieceType, PlayerColor } from '../../../shared/constants/game.constants';
import { Position } from './position.vo';
export declare class Piece {
    readonly type: PieceType;
    readonly color: PlayerColor;
    readonly position: Position;
    constructor(type: PieceType, color: PlayerColor, position: Position);
    isKing(): boolean;
    isMan(): boolean;
    promote(): Piece;
    moveTo(newPosition: Position): Piece;
    shouldPromote(): boolean;
    equals(other: Piece): boolean;
    toString(): string;
}
