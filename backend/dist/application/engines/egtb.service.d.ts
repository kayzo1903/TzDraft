import type { SidraMoveResponse } from './sidra-types';
interface PieceInfo {
    type: 'MAN' | 'KING';
    color: 'WHITE' | 'BLACK';
    position: number;
}
export declare class EgtbService {
    private readonly MAX_PIECES;
    private readonly MAX_CACHE;
    private readonly cache;
    private readonly dbPath;
    constructor();
    getBestMove(pieces: PieceInfo[], sideToMove: 'WHITE' | 'BLACK', moveCount: number): Promise<SidraMoveResponse | null>;
    private lookupWdl;
    private resolvePosition;
    private loadTable;
    private computePositionIndex;
    private combinatorialRank;
    private buildBoard;
    private applyMove;
}
export {};
