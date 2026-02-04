import { MakeMoveUseCase } from '../../../application/use-cases/make-move.use-case';
import { GetLegalMovesUseCase } from '../../../application/use-cases/get-legal-moves.use-case';
import { EndGameUseCase } from '../../../application/use-cases/end-game.use-case';
import { MakeMoveDto } from '../dtos/make-move.dto';
export declare class MoveController {
    private readonly makeMoveUseCase;
    private readonly getLegalMovesUseCase;
    private readonly endGameUseCase;
    constructor(makeMoveUseCase: MakeMoveUseCase, getLegalMovesUseCase: GetLegalMovesUseCase, endGameUseCase: EndGameUseCase);
    makeMove(gameId: string, playerId: string, dto: MakeMoveDto): Promise<{
        success: boolean;
        data: {
            game: import("../../../domain/game/entities/game.entity").Game;
            move: import("../../../domain/game/entities/move.entity").Move;
        };
    }>;
    getLegalMoves(gameId: string): Promise<{
        success: boolean;
        data: import("../../../domain/game/entities/move.entity").Move[];
    }>;
    getLegalMovesForPiece(gameId: string, position: number): Promise<{
        success: boolean;
        data: import("../../../domain/game/entities/move.entity").Move[];
    }>;
    resign(gameId: string, playerId: string): Promise<{
        success: boolean;
        message: string;
    }>;
    draw(gameId: string): Promise<{
        success: boolean;
        message: string;
    }>;
    abort(gameId: string): Promise<{
        success: boolean;
        message: string;
    }>;
}
