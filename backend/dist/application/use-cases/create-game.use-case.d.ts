import type { IGameRepository } from '../../domain/game/repositories/game.repository.interface';
import { Game } from '../../domain/game/entities/game.entity';
import { GameType, PlayerColor } from '../../shared/constants/game.constants';
import { GamesGateway } from '../../infrastructure/messaging/games.gateway';
export declare class CreateGameUseCase {
    private readonly gameRepository;
    private readonly gamesGateway;
    constructor(gameRepository: IGameRepository, gamesGateway: GamesGateway);
    createPvPGame(whitePlayerId: string | null, blackPlayerId: string | null, whiteElo: number | null, blackElo: number | null, whiteGuestName?: string, blackGuestName?: string, gameType?: GameType, initialTimeMs?: number): Promise<Game>;
    createFriendlyGame(whitePlayerId: string | null, blackPlayerId: string | null, whiteElo: number | null, blackElo: number | null, whiteGuestName?: string, blackGuestName?: string, gameType?: GameType, initialTimeMs?: number): Promise<Game>;
    createPvEGame(playerId: string, playerColor: PlayerColor, playerElo: number, aiLevel: number, dto?: {
        initialTimeMs?: number;
    }): Promise<Game>;
    findGameById(gameId: string): Promise<Game>;
}
