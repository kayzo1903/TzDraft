import type { IGameRepository } from '../../domain/game/repositories/game.repository.interface';
import { Game } from '../../domain/game/entities/game.entity';
import { PlayerColor } from '../../shared/constants/game.constants';
export declare class CreateGameUseCase {
    private readonly gameRepository;
    constructor(gameRepository: IGameRepository);
    createPvPGame(whitePlayerId: string, blackPlayerId: string, whiteElo: number, blackElo: number): Promise<Game>;
    createPvEGame(playerId: string, playerColor: PlayerColor, playerElo: number, aiLevel: number): Promise<Game>;
    findGameById(gameId: string): Promise<Game>;
}
