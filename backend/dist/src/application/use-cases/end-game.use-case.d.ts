import type { IGameRepository } from '../../domain/game/repositories/game.repository.interface';
export declare class EndGameUseCase {
    private readonly gameRepository;
    constructor(gameRepository: IGameRepository);
    resign(gameId: string, playerId: string): Promise<void>;
    timeout(gameId: string, playerId: string): Promise<void>;
    drawByAgreement(gameId: string): Promise<void>;
    abort(gameId: string): Promise<void>;
}
