import { Game } from '../entities/game.entity';
import {
  GameStatus,
  GameType,
} from '../../../shared/constants/game.constants';

export interface GameHistoryFilters {
  result?: 'WIN' | 'LOSS' | 'DRAW';
  gameType?: GameType;
}

export interface PlayerStats {
  total: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
  byType: {
    AI: { total: number; wins: number; losses: number; draws: number };
    RANKED: { total: number; wins: number; losses: number; draws: number };
    CASUAL: { total: number; wins: number; losses: number; draws: number };
  };
}

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

  /**
   * Find game by invite code
   */
  findByInviteCode(code: string): Promise<Game | null>;

  /**
   * Join an invite game: fill whichever player slot is empty.
   * Game status stays WAITING until the host explicitly calls startGame().
   */
  joinInvite(gameId: string, joinerId: string): Promise<Game>;

  /**
   * Transition a WAITING game (both slots filled) to ACTIVE.
   * Called by the host after both players have joined.
   */
  startGame(gameId: string): Promise<Game>;

  /**
   * Persist updated clock times after a move is made.
   */
  updateClock(
    gameId: string,
    whiteTimeMs: number,
    blackTimeMs: number,
    lastMoveAt: Date,
  ): Promise<void>;

  /**
   * Expire (ABORT) all open WAITING invite games created by this player
   * that have no second player yet. Called before creating a new invite game
   * so stale codes don't pile up.
   */
  expireStaleInvitesByPlayer(creatorId: string): Promise<void>;

  /**
   * Paginated list of FINISHED games for a player, newest first.
   */
  findCompletedGamesByPlayer(
    playerId: string,
    skip: number,
    take: number,
    filters?: GameHistoryFilters,
  ): Promise<{ games: Game[]; total: number }>;

  /**
   * Aggregate win/loss/draw stats for a player across all finished games.
   */
  getPlayerStats(playerId: string): Promise<PlayerStats>;
}
