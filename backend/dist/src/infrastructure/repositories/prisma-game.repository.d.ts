import { PrismaService } from '../database/prisma/prisma.service';
import { IGameRepository } from '../../domain/game/repositories/game.repository.interface';
import { Game } from '../../domain/game/entities/game.entity';
import { GameStatus, GameType } from '../../shared/constants/game.constants';
export declare class PrismaGameRepository implements IGameRepository {
    private readonly prisma;
    constructor(prisma: PrismaService);
    create(game: Game): Promise<Game>;
    findById(id: string): Promise<Game | null>;
    update(game: Game): Promise<Game>;
    findActiveGamesByPlayer(playerId: string): Promise<Game[]>;
    findByStatus(status: GameStatus): Promise<Game[]>;
    findByType(gameType: GameType): Promise<Game[]>;
    delete(id: string): Promise<void>;
    findRecentGamesByPlayer(playerId: string, limit: number): Promise<Game[]>;
    countGamesByPlayer(playerId: string): Promise<number>;
    findByInviteCode(code: string): Promise<Game | null>;
    joinInvite(gameId: string, joinerId: string): Promise<Game>;
    expireStaleInvitesByPlayer(creatorId: string): Promise<void>;
    updateClock(gameId: string, whiteTimeMs: number, blackTimeMs: number, lastMoveAt: Date): Promise<void>;
    private toDomain;
}
