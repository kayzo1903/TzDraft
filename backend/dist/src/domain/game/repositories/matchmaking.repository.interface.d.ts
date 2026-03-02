export interface MatchmakingEntry {
    id: string;
    userId: string;
    timeMs: number;
    socketId: string;
    joinedAt: Date;
    rating?: number | null;
    rd?: number | null;
    volatility?: number | null;
}
export interface IMatchmakingRepository {
    upsert(entry: Omit<MatchmakingEntry, 'id' | 'joinedAt'>): Promise<MatchmakingEntry>;
    findOldestMatch(timeMs: number, excludeUserId: string): Promise<MatchmakingEntry | null>;
    remove(userId: string): Promise<void>;
    removeStale(maxAgeMs: number): Promise<void>;
}
