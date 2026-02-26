import { KallistoAdapter } from '../../infrastructure/engine/kallisto.adapter';
import { SidraAdapter } from '../../infrastructure/engine/sidra.adapter';
type BoardPiece = {
    type: 'KING' | 'MAN';
    color: 'WHITE' | 'BLACK';
    position: number;
};
type SimplifiedMove = {
    from: number;
    to: number;
    capturedSquares: number[];
    isPromotion: boolean;
};
export declare class GetAiMoveUseCase {
    private readonly sidraAdapter;
    private readonly kallistoAdapter;
    private readonly logger;
    constructor(sidraAdapter: SidraAdapter, kallistoAdapter: KallistoAdapter);
    execute(dto: {
        boardStatePieces: BoardPiece[];
        currentPlayer: 'WHITE' | 'BLACK';
        aiLevel: number;
        timeLimitMs: number;
        mustContinueFrom?: number | null;
    }): Promise<SimplifiedMove | null>;
}
export {};
