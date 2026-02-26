export interface EngineMove {
    from: number;
    to: number;
    capturedSquares: number[];
    isPromotion: boolean;
}
export interface EnginePiece {
    type: 'MAN' | 'KING';
    color: 'WHITE' | 'BLACK';
    position: number;
}
export interface EngineThinkRequest {
    currentPlayer: 'WHITE' | 'BLACK';
    pieces: EnginePiece[];
    timeLimitMs: number;
    aiLevel?: number;
    mustContinueFrom?: number | null;
}
export interface IEngineAdapter {
    readonly name: string;
    getBestMove(request: EngineThinkRequest): Promise<EngineMove | null>;
    dispose(): void;
}
