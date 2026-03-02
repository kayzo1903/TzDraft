import { PrismaService } from '../database/prisma/prisma.service';
import { IMatchmakingRepository, MatchmakingEntry } from '../../domain/game/repositories/matchmaking.repository.interface';
export declare class PrismaMatchmakingRepository implements IMatchmakingRepository {
    private readonly prisma;
    constructor(prisma: PrismaService);
    upsert(entry: Omit<MatchmakingEntry, 'id' | 'joinedAt'>): Promise<MatchmakingEntry>;
    findOldestMatch(timeMs: number, excludeUserId: string): Promise<MatchmakingEntry | null>;
    remove(userId: string): Promise<void>;
    removeStale(maxAgeMs: number): Promise<void>;
    private toDomain;
}
