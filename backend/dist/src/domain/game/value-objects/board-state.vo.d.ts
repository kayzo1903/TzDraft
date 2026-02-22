import { Piece } from './piece.vo';
import { Position } from './position.vo';
import { PlayerColor } from '../../../shared/constants/game.constants';
export declare class BoardState {
    private readonly pieces;
    constructor(pieces?: Piece[]);
    getPieceAt(position: Position): Piece | null;
    getPiecesByColor(color: PlayerColor): Piece[];
    getAllPieces(): Piece[];
    isOccupied(position: Position): boolean;
    isEmpty(position: Position): boolean;
    placePiece(piece: Piece): BoardState;
    removePiece(position: Position): BoardState;
    movePiece(from: Position, to: Position): BoardState;
    static createInitialBoard(): BoardState;
    countPieces(color: PlayerColor): number;
    clone(): BoardState;
    toString(): string;
}
