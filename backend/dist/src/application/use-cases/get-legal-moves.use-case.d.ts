import type { IGameRepository } from '../../domain/game/repositories/game.repository.interface';
import { Move } from '../../domain/game/entities/move.entity';
export declare class GetLegalMovesUseCase {
    private readonly gameRepository;
    private readonly moveGeneratorService;
    constructor(gameRepository: IGameRepository);
    execute(gameId: string): Promise<Move[]>;
    executeForPiece(gameId: string, position: number): Promise<Move[]>;
}
