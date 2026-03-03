import type { IMatchmakingRepository } from '../../domain/game/repositories/matchmaking.repository.interface';
import { PrismaService } from '../../infrastructure/database/prisma/prisma.service';
export type JoinQueueResult = {
    status: 'waiting';
} | {
    status: 'matched';
    gameId: string;
    opponentUserId: string;
};
export declare class JoinQueueUseCase {
    private readonly matchmakingRepo;
    private readonly prisma;
    constructor(matchmakingRepo: IMatchmakingRepository, prisma: PrismaService);
    execute(userId: string, timeMs: number, socketId: string, userRating?: number | null): Promise<JoinQueueResult>;
    cancelQueue(userId: string): Promise<void>;
}
