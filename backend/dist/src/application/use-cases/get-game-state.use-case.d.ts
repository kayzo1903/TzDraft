import type { IGameRepository } from '../../domain/game/repositories/game.repository.interface';
import type { IMoveRepository } from '../../domain/game/repositories/move.repository.interface';
import { Game } from '../../domain/game/entities/game.entity';
import { Move } from '../../domain/game/entities/move.entity';
export declare class GetGameStateUseCase {
    private readonly gameRepository;
    private readonly moveRepository;
    constructor(gameRepository: IGameRepository, moveRepository: IMoveRepository);
    execute(gameId: string): Promise<{
        game: Game;
        moves: Move[];
    }>;
    executeWithPagination(gameId: string, skip: number, take: number): Promise<{
        game: Game;
        moves: Move[];
        totalMoves: number;
    }>;
}
