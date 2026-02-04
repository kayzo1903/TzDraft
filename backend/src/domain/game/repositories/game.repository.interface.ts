import { Game } from '../entities/game.entity';
import {
  PlayerColor,
  GameStatus,
  GameType,
} from '../../../shared/constants/game.constants';

/**
 * Game Repository Interface
 * Defines contract for game persistence
 */
export interface IGameRepository {
  /**
   * Create a new game
   */
  create(game: Game): Promise<Game>;

  /**
   * Find game by ID
   */
  findById(id: string): Promise<Game | null>;

  /**
   * Update game state
   */
  update(game: Game): Promise<Game>;

  /**
   * Find active games for a player
   */
  findActiveGamesByPlayer(playerId: string): Promise<Game[]>;

  /**
   * Find games by status
   */
  findByStatus(status: GameStatus): Promise<Game[]>;

  /**
   * Find games by type
   */
  findByType(gameType: GameType): Promise<Game[]>;

  /**
   * Delete game
   */
  delete(id: string): Promise<void>;

  /**
   * Find recent games for a player
   */
  findRecentGamesByPlayer(playerId: string, limit: number): Promise<Game[]>;

  /**
   * Count games by player
   */
  countGamesByPlayer(playerId: string): Promise<number>;
}
