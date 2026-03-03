import type { IMatchmakingRepository } from '../../domain/game/repositories/matchmaking.repository.interface';
import type { IGameRepository } from '../../domain/game/repositories/game.repository.interface';
export type JoinQueueResult = {
    status: 'waiting';
} | {
    status: 'matched';
    gameId: string;
    opponentUserId: string;
};
export declare class JoinQueueUseCase {
    private readonly matchmakingRepo;
    private readonly gameRepo;
    constructor(matchmakingRepo: IMatchmakingRepository, gameRepo: IGameRepository);
    execute(userId: string, timeMs: number, socketId: string, userRating?: number | null): Promise<JoinQueueResult>;
    cancelQueue(userId: string): Promise<void>;
}
