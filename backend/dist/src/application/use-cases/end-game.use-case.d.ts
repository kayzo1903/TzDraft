import type { IGameRepository } from '../../domain/game/repositories/game.repository.interface';
import { Winner } from '../../shared/constants/game.constants';
export declare class EndGameUseCase {
    private readonly gameRepository;
    constructor(gameRepository: IGameRepository);
    resign(gameId: string, playerId: string): Promise<{
        winner: Winner;
    }>;
    timeout(gameId: string, playerId: string): Promise<void>;
    drawByAgreement(gameId: string): Promise<void>;
    abort(gameId: string): Promise<void>;
}
