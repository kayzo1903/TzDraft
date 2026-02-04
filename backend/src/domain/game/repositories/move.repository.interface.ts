import { Move } from '../entities/move.entity';

/**
 * Move Repository Interface
 * Defines contract for move persistence
 */
export interface IMoveRepository {
  /**
   * Create a new move
   */
  create(move: Move): Promise<Move>;

  /**
   * Find move by ID
   */
  findById(id: string): Promise<Move | null>;

  /**
   * Find all moves for a game
   */
  findByGameId(gameId: string): Promise<Move[]>;

  /**
   * Find moves by game ID with pagination
   */
  findByGameIdPaginated(
    gameId: string,
    skip: number,
    take: number,
  ): Promise<Move[]>;

  /**
   * Count moves for a game
   */
  countByGameId(gameId: string): Promise<number>;

  /**
   * Get last move for a game
   */
  getLastMove(gameId: string): Promise<Move | null>;

  /**
   * Delete all moves for a game
   */
  deleteByGameId(gameId: string): Promise<void>;
}
