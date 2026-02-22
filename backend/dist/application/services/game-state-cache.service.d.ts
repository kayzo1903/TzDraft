import { Game } from '../../domain/game/entities/game.entity';
export declare class GameStateCacheService {
    private readonly logger;
    private readonly cache;
    private readonly TTL_MS;
    set(game: Game): void;
    get(gameId: string): Game | null;
    invalidate(gameId: string): void;
    get size(): number;
}
