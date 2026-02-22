import { CreateGameUseCase } from '../../../application/use-cases/create-game.use-case';
import { GetGameStateUseCase } from '../../../application/use-cases/get-game-state.use-case';
import { CreatePvPGameDto, CreatePvEGameDto } from '../dtos/create-game.dto';
export declare class GameController {
    private readonly createGameUseCase;
    private readonly getGameStateUseCase;
    constructor(createGameUseCase: CreateGameUseCase, getGameStateUseCase: GetGameStateUseCase);
    createPvPGame(user: any, dto: CreatePvPGameDto): Promise<{
        success: boolean;
        data: import("../../../domain/game/entities/game.entity").Game;
    }>;
    createPvEGame(user: any, dto: CreatePvEGameDto): Promise<{
        success: boolean;
        data: import("../../../domain/game/entities/game.entity").Game;
    }>;
    getGame(id: string): Promise<{
        success: boolean;
        data: {
            game: import("../../../domain/game/entities/game.entity").Game;
            moves: import("../../../domain/game/entities/move.entity").Move[];
            players: {
                white: import("@prisma/client").User | null;
                black: import("@prisma/client").User | null;
            };
        };
    }>;
    getGameState(id: string, skip?: number, take?: number): Promise<{
        success: boolean;
        data: {
            game: import("../../../domain/game/entities/game.entity").Game;
            moves: import("../../../domain/game/entities/move.entity").Move[];
            totalMoves: number;
            players: {
                white: import("@prisma/client").User | null;
                black: import("@prisma/client").User | null;
            };
        };
    }>;
}
