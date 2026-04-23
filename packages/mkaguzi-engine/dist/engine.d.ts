/**
 * engine.ts — MkaguziEngine public API
 *
 * All operations that require move-generation go through the Mkaguzi WASM
 * module; board-manipulation operations (applyMove) are also WASM-backed
 * for correctness (handles promotion, multi-capture, etc.).
 *
 * Callers that use applyMove directly on BoardState pieces (e.g. Game entity)
 * continue to work via the BoardState pure-TS implementation.
 */
import { BoardState } from './board-state.js';
import { Move } from './move.js';
import { Position } from './position.js';
import { Game } from './game.js';
import { PlayerColor, Winner, GameType, EndReason } from './constants.js';
export interface GameResult {
    winner: Winner;
    reason: EndReason;
}
export declare const MkaguziEngine: {
    /** Return the initial board state. */
    createInitialState(): BoardState;
    /**
     * Generate all legal moves for the given player via Mkaguzi WASM.
     *
     * @param state     Current board
     * @param player    Side to move
     * @param moveCount Move counter (unused in Mkaguzi; kept for API compatibility)
     */
    generateLegalMoves(state: BoardState, player: PlayerColor, _moveCount?: number): Move[];
    /**
     * Apply a move and return the new board state.
     * Uses Mkaguzi WASM for correctness (handles promotion, removes captured pieces).
     */
    applyMove(state: BoardState, move: Move): BoardState;
    /**
     * Evaluate the game result (win / draw / null for ongoing).
     * Uses Mkaguzi WASM for move-count check; draw counters are passed through.
     */
    evaluateGameResult(state: BoardState, currentPlayer: PlayerColor, reversibleMoveCount?: number, threeKingsMoveCount?: number, endgameMoveCount?: number): GameResult | null;
    /** Create a new Game entity. */
    createGame(id: string, whitePlayerId: string, blackPlayerId: string | null, gameType?: GameType): Game;
    createPosition(value: number): Position;
    createMove(id: string, gameId: string, moveNumber: number, player: PlayerColor, from: Position, to: Position, capturedSquares?: Position[], isPromotion?: boolean): Move;
};
//# sourceMappingURL=engine.d.ts.map