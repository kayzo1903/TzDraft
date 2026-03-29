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
import {
  PlayerColor,
  Winner,
  GameType,
  GameStatus,
  EndReason,
} from './constants.js';
import {
  isEngineReady,
  wasmGenerateMoves,
  wasmApplyMove,
  wasmSearch,
  wasmGameResult,
  RawMove,
} from './wasm-bridge.js';

export interface GameResult {
  winner: Winner;
  reason: EndReason;
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Convert a raw WASM move into a Move entity. */
function rawToMove(raw: RawMove, board: BoardState, player: PlayerColor): Move {
  const from = new Position(raw.from);
  const to = new Position(raw.to);
  const capturedSquares = raw.captures.map((n) => new Position(n));
  const notation = Move.generateNotation(from, to, capturedSquares);
  return new Move(
    `${raw.from}-${raw.to}`,
    'local',
    0,
    player,
    from,
    to,
    capturedSquares,
    raw.promote,
    notation,
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

export const MkaguziEngine = {
  /** Return the initial board state. */
  createInitialState(): BoardState {
    return BoardState.createInitialBoard();
  },

  /**
   * Generate all legal moves for the given player via Mkaguzi WASM.
   *
   * @param state     Current board
   * @param player    Side to move
   * @param moveCount Move counter (unused in Mkaguzi; kept for API compatibility)
   */
  generateLegalMoves(state: BoardState, player: PlayerColor, _moveCount: number = 0): Move[] {
    if (!isEngineReady()) return []; // WASM still loading — caller will retry once ready
    const fen = state.toFen(player);
    const rawMoves = wasmGenerateMoves(fen);
    return rawMoves.map((raw) => rawToMove(raw, state, player));
  },

  /**
   * Apply a move and return the new board state.
   * Uses Mkaguzi WASM for correctness (handles promotion, removes captured pieces).
   */
  applyMove(state: BoardState, move: Move): BoardState {
    const fen = state.toFen(move.player);
    const newFen = wasmApplyMove(fen, move.from.value, move.to.value);
    if (!newFen) {
      // Fallback: apply purely in TypeScript (e.g. during WASM init)
      let board = state;
      for (const cap of move.capturedSquares) board = board.removePiece(cap);
      return board.movePiece(move.from, move.to);
    }
    return BoardState.fromFen(newFen);
  },

  /**
   * Evaluate the game result (win / draw / null for ongoing).
   * Uses Mkaguzi WASM for move-count check; draw counters are passed through.
   */
  evaluateGameResult(
    state: BoardState,
    currentPlayer: PlayerColor,
    reversibleMoveCount: number = 0,
    threeKingsMoveCount: number = 0,
    endgameMoveCount: number = 0,
  ): GameResult | null {
    const fen = state.toFen(currentPlayer);
    const result = wasmGameResult(fen, reversibleMoveCount, threeKingsMoveCount, endgameMoveCount);

    if (result.status === 'ongoing') return null;

    if (result.status === 'win') {
      const winner =
        result.winner === 'white' ? Winner.WHITE :
        result.winner === 'black' ? Winner.BLACK :
        Winner.DRAW;
      return { winner, reason: EndReason.STALEMATE };
    }

    // draw
    return { winner: Winner.DRAW, reason: EndReason.DRAW };
  },

  /** Create a new Game entity. */
  createGame(
    id: string,
    whitePlayerId: string,
    blackPlayerId: string | null,
    gameType: GameType = GameType.CASUAL,
  ): Game {
    return new Game(
      id,
      whitePlayerId,
      blackPlayerId,
      gameType,
      null,
      null,
      null,
      600000,
      undefined,
      new Date(),
      null,
      null,
      GameStatus.WAITING,
      null,
      null,
      PlayerColor.WHITE,
    );
  },

  createPosition(value: number): Position {
    return new Position(value);
  },

  createMove(
    id: string,
    gameId: string,
    moveNumber: number,
    player: PlayerColor,
    from: Position,
    to: Position,
    capturedSquares: Position[] = [],
    isPromotion: boolean = false,
  ): Move {
    const notation = Move.generateNotation(from, to, capturedSquares);
    return new Move(id, gameId, moveNumber, player, from, to, capturedSquares, isPromotion, notation);
  },
};
