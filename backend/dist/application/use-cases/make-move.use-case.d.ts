import type { IGameRepository } from '../../domain/game/repositories/game.repository.interface';
import type { IMoveRepository } from '../../domain/game/repositories/move.repository.interface';
export declare class MakeMoveUseCase {
    private readonly gameRepository;
    private readonly moveRepository;
    private readonly moveValidationService;
    private readonly gameRulesService;
    constructor(gameRepository: IGameRepository, moveRepository: IMoveRepository);
    execute(gameId: string, playerId: string, from: number, to: number, path?: number[]): Promise<{
        game: any;
        move: any;
    }>;
    private getPlayerColor;
}
