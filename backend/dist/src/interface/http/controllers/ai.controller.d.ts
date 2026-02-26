import { GetAiMoveUseCase } from '../../../application/use-cases/get-ai-move.use-case';
export declare class AiMoveRequestDto {
    boardStatePieces: {
        type: 'MAN' | 'KING';
        color: 'WHITE' | 'BLACK';
        position: number;
    }[];
    currentPlayer: 'WHITE' | 'BLACK';
    aiLevel: number;
    timeLimitMs?: number;
    mustContinueFrom?: number | null;
}
export declare class AiController {
    private readonly getAiMoveUseCase;
    constructor(getAiMoveUseCase: GetAiMoveUseCase);
    getMove(dto: AiMoveRequestDto): Promise<{
        success: boolean;
        data: {
            from: number;
            to: number;
            capturedSquares: number[];
            isPromotion: boolean;
        } | null;
    }>;
}
