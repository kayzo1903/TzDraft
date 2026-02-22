import { Position } from '../value-objects/position.vo';
import { PlayerColor } from '../../../shared/constants/game.constants';
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
    isCapture(): boolean;
    isMultiCapture(): boolean;
    static generateNotation(from: Position, to: Position, capturedSquares: Position[]): string;
    toString(): string;
}
