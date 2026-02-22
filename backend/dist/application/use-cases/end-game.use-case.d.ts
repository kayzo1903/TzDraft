import type { IGameRepository } from '../../domain/game/repositories/game.repository.interface';
import type { IMoveRepository } from '../../domain/game/repositories/move.repository.interface';
import { RatingService } from '../../domain/game/services/rating.service';
import { GamesGateway } from '../../infrastructure/messaging/games.gateway';
export declare class EndGameUseCase {
    private readonly gameRepository;
    private readonly moveRepository;
    private readonly ratingService;
    private readonly gamesGateway;
    private readonly gameRulesService;
    private readonly logger;
    constructor(gameRepository: IGameRepository, moveRepository: IMoveRepository, ratingService: RatingService, gamesGateway: GamesGateway);
    resign(gameId: string, playerId: string): Promise<void>;
    timeout(gameId: string, playerId: string): Promise<void>;
    drawByAgreement(gameId: string): Promise<void>;
    abort(gameId: string, playerId: string): Promise<void>;
    disconnectForfeit(gameId: string, disconnectedPlayerId: string): Promise<void>;
    private handleRatingUpdate;
}
