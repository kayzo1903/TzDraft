import { Piece } from './piece.js';
import { Position } from './position.js';
import { PlayerColor } from './constants.js';
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
    countPieces(color: PlayerColor): number;
    clone(): BoardState;
    /**
     * Serialize to the app's PDN FEN convention (WHITE at PDN 1-12, BLACK at PDN 21-32).
     * Side to move is provided as a parameter.
     */
    toFen(sideToMove: PlayerColor): string;
    /**
     * Create a BoardState by parsing the app's PDN FEN convention.
     * Color labels are preserved as-is (WHITE pieces listed under :W).
     */
    static fromFen(fen: string): BoardState;
    /**
     * Standard starting position in the app convention: WHITE at 1-12, BLACK at 21-32.
     */
    static createInitialBoard(): BoardState;
    toString(): string;
}
//# sourceMappingURL=board-state.d.ts.map