import { Game } from '../entities/game.entity';
import { GameStatus, GameType } from '../../../shared/constants/game.constants';
export interface IGameRepository {
    create(game: Game): Promise<Game>;
    findById(id: string): Promise<Game | null>;
    update(game: Game): Promise<Game>;
    findActiveGamesByPlayer(playerId: string): Promise<Game[]>;
    findByStatus(status: GameStatus): Promise<Game[]>;
    findByType(gameType: GameType): Promise<Game[]>;
    delete(id: string): Promise<void>;
    findRecentGamesByPlayer(playerId: string, limit: number): Promise<Game[]>;
    countGamesByPlayer(playerId: string): Promise<number>;
}
