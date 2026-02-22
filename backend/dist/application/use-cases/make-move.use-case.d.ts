import { Game } from '../../domain/game/entities/game.entity';
import { GamesGateway } from '../../infrastructure/messaging/games.gateway';
import type { IGameRepository } from '../../domain/game/repositories/game.repository.interface';
import { Move } from '../../domain/game/entities/move.entity';
import { PrismaService } from '../../infrastructure/database/prisma/prisma.service';
import { RatingService } from '../../domain/game/services/rating.service';
import { GameStateCacheService } from '../services/game-state-cache.service';
export declare class MakeMoveUseCase {
    private readonly gameRepository;
    private readonly gamesGateway;
    private readonly prisma;
    private readonly ratingService;
    private readonly gameStateCache;
    private readonly moveValidationService;
    private readonly gameRulesService;
    private readonly persistQueue;
    constructor(gameRepository: IGameRepository, gamesGateway: GamesGateway, prisma: PrismaService, ratingService: RatingService, gameStateCache: GameStateCacheService);
    execute(gameId: string, playerId: string, from: number, to: number, path?: number[]): Promise<{
        game: Game;
        move: Move;
    }>;
    private persistMoveAsync;
    private getPlayerColor;
}
