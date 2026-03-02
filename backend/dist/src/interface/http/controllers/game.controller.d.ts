import { CreateGameUseCase } from '../../../application/use-cases/create-game.use-case';
import { GetGameStateUseCase } from '../../../application/use-cases/get-game-state.use-case';
import { EndGameUseCase } from '../../../application/use-cases/end-game.use-case';
import { CreatePvPGameDto, CreatePvEGameDto, CreateInviteGameDto } from '../dtos/create-game.dto';
import { GamesGateway } from '../../../infrastructure/messaging/games.gateway';
export declare class GameController {
    private readonly createGameUseCase;
    private readonly getGameStateUseCase;
    private readonly endGameUseCase;
    private readonly gamesGateway;
    constructor(createGameUseCase: CreateGameUseCase, getGameStateUseCase: GetGameStateUseCase, endGameUseCase: EndGameUseCase, gamesGateway: GamesGateway);
    createPvPGame(user: any, dto: CreatePvPGameDto): Promise<{
        success: boolean;
        data: import("../../../domain/game/entities/game.entity").Game;
    }>;
    createPvEGame(user: any, dto: CreatePvEGameDto): Promise<{
        success: boolean;
        data: import("../../../domain/game/entities/game.entity").Game;
    }>;
    createInviteGame(user: any, dto: CreateInviteGameDto): Promise<{
        success: boolean;
        data: {
            gameId: string;
            inviteCode: string;
        };
    }>;
    joinInviteGame(user: any, code: string): Promise<{
        success: boolean;
        data: {
            gameId: string;
        };
    }>;
    startGame(user: any, id: string): Promise<{
        success: boolean;
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
    resignGame(user: any, id: string): Promise<{
        success: boolean;
    }>;
    drawGame(user: any, id: string): Promise<{
        success: boolean;
    }>;
    abortGame(user: any, id: string): Promise<{
        success: boolean;
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
