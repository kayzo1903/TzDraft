import { Game } from '../../domain/game/entities/game.entity';
import { GamesGateway } from '../../infrastructure/messaging/games.gateway';
import type { IGameRepository } from '../../domain/game/repositories/game.repository.interface';
import type { IMoveRepository } from '../../domain/game/repositories/move.repository.interface';
import { Move } from '../../domain/game/entities/move.entity';
export declare class MakeMoveUseCase {
    private readonly gameRepository;
    private readonly moveRepository;
    private readonly gamesGateway;
    private readonly moveValidationService;
    private readonly gameRulesService;
    constructor(gameRepository: IGameRepository, moveRepository: IMoveRepository, gamesGateway: GamesGateway);
    execute(gameId: string, playerId: string, from: number, to: number, path?: number[]): Promise<{
        game: Game;
        move: Move;
    }>;
    private getPlayerColor;
}
