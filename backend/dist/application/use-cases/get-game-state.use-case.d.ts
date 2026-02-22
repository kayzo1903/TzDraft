import type { IGameRepository } from '../../domain/game/repositories/game.repository.interface';
import type { IMoveRepository } from '../../domain/game/repositories/move.repository.interface';
import { Game } from '../../domain/game/entities/game.entity';
import { Move } from '../../domain/game/entities/move.entity';
import { UserService } from '../../domain/user/user.service';
import { User } from '@prisma/client';
export declare class GetGameStateUseCase {
    private readonly gameRepository;
    private readonly moveRepository;
    private readonly userService;
    constructor(gameRepository: IGameRepository, moveRepository: IMoveRepository, userService: UserService);
    execute(gameId: string): Promise<{
        game: Game;
        moves: Move[];
        players: {
            white: User | null;
            black: User | null;
        };
    }>;
    executeWithPagination(gameId: string, skip: number, take: number): Promise<{
        game: Game;
        moves: Move[];
        totalMoves: number;
        players: {
            white: User | null;
            black: User | null;
        };
    }>;
    private getPlayers;
}
