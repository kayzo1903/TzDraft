import { BoardState } from "./value-objects/board-state.vo";
import { Game } from "./entities/game.entity";
import { Move } from "./entities/move.entity";
import { Position } from "./value-objects/position.vo";
import { PlayerColor, Winner, GameType, EndReason } from "./constants";
/**
 * Game Result
 * Represents the result of a game (win, loss, draw)
 */
export interface GameResult {
    winner: Winner;
    reason: EndReason;
}
/**
 * CAKE Engine Public API
 * Browser-safe game engine for Tanzania Drafti
 */
export declare const CakeEngine: {
    /**
     * Create initial board state
     */
    createInitialState(): BoardState;
    /**
     * Generate all legal moves for a player
     */
    generateLegalMoves(state: BoardState, player: PlayerColor, moveCount?: number): Move[];
    /**
     * Apply a move to the board state
     */
    applyMove(state: BoardState, move: Move): BoardState;
    /**
     * Evaluate game result (detect win/draw conditions)
     */
    evaluateGameResult(state: BoardState, currentPlayer: PlayerColor): GameResult | null;
    /**
     * Create a game instance
     */
    createGame(id: string, whitePlayerId: string, blackPlayerId: string | null, gameType?: GameType): Game;
    /**
     * Helper to create a position
     */
    createPosition(value: number): Position;
    /**
     * Helper to create a move
     */
    createMove(id: string, gameId: string, moveNumber: number, player: PlayerColor, from: Position, to: Position, capturedSquares?: Position[], isPromotion?: boolean): Move;
};
//# sourceMappingURL=engine.d.ts.map