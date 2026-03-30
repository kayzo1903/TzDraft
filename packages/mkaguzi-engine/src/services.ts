/**
 * services.ts
 *
 * WASM-backed implementations of the frontend service classes
 * (CaptureFindingService, MoveGeneratorService, MoveValidationService,
 * GameRulesService).
 */

import { BoardState } from './board-state.js';
import { Move } from './move.js';
import { Position } from './position.js';
import { Piece } from './piece.js';
import { PlayerColor } from './constants.js';
import { wasmGenerateMoves } from './wasm-bridge.js';
import { MkaguziEngine } from './engine.js';

// ─────────────────────────────────────────────────────────────────────────────
// CapturePath type shared by the frontend services.
// ─────────────────────────────────────────────────────────────────────────────

export interface CapturePath {
  piece: Piece;
  from: Position;
  path: Position[];
  capturedSquares: Position[];
  to: Position;
  isPromotion: boolean;
}

export interface Direction {
  row: number;
  col: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// CaptureFindingService
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Backed by mkz_generate_moves.  Only moves with non-empty capture arrays
 * are capture moves.  The `path` field is left empty (WASM doesn't expose
 * intermediate jump squares) — callers that rely on `path` should migrate to
 * using the move's `from`/`to`/`capturedSquares` directly.
 */
export class CaptureFindingService {
  findAllCaptures(board: BoardState, player: PlayerColor): CapturePath[] {
    const fen = board.toFen(player);
    const rawMoves = wasmGenerateMoves(fen);
    const captureMoves = rawMoves.filter((m) => m.captures.length > 0);

    return captureMoves.map((raw) => {
      const from = new Position(raw.from);
      const to = new Position(raw.to);
      const capturedSquares = raw.captures.map((n) => new Position(n));
      const piece = board.getPieceAt(from)!;
      return {
        piece,
        from,
        path: [],
        capturedSquares,
        to,
        isPromotion: raw.promote,
      };
    });
  }

  findCapturesForPiece(board: BoardState, piece: Piece): CapturePath[] {
    return this.findAllCaptures(board, piece.color).filter((cp) =>
      cp.from.equals(piece.position),
    );
  }

  isValidCapture(
    board: BoardState,
    piece: Piece,
    to: Position,
    capturedSquares: Position[],
  ): boolean {
    return this.findCapturesForPiece(board, piece).some(
      (cp) =>
        cp.to.equals(to) &&
        cp.capturedSquares.length === capturedSquares.length &&
        cp.capturedSquares.every((cs, i) => cs.equals(capturedSquares[i])),
    );
  }

  hasCapturesAvailable(board: BoardState, player: PlayerColor): boolean {
    return this.findAllCaptures(board, player).length > 0;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MoveGeneratorService
// ─────────────────────────────────────────────────────────────────────────────

export class MoveGeneratorService {
  generateAllMoves(board: BoardState, player: PlayerColor, _moveCount: number = 0): Move[] {
    return MkaguziEngine.generateLegalMoves(board, player, _moveCount);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MoveValidationService (thin wrapper — all moves from WASM are legal)
// ─────────────────────────────────────────────────────────────────────────────

export class MoveValidationService {
  isValidMove(
    board: BoardState,
    player: PlayerColor,
    from: Position,
    to: Position,
  ): boolean {
    const legal = MkaguziEngine.generateLegalMoves(board, player);
    return legal.some((m) => m.from.equals(from) && m.to.equals(to));
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GameRulesService (delegates to wasmGameResult via engine)
// ─────────────────────────────────────────────────────────────────────────────

export class GameRulesService {
  detectWinner(board: BoardState, currentPlayer: PlayerColor): import('./constants.js').Winner | null {
    const result = MkaguziEngine.evaluateGameResult(board, currentPlayer);
    return result?.winner ?? null;
  }

  isDrawByThirtyMoveRule(reversibleMoveCount: number): boolean {
    return reversibleMoveCount >= 60;
  }

  isDrawByThreeKingsRule(threeKingsMoveCount: number): boolean {
    return threeKingsMoveCount >= 12;
  }

  isDrawByArticle84Endgame(endgameMoveCount: number): boolean {
    return endgameMoveCount >= 5;
  }

  isDrawByInsufficientMaterial(board: BoardState): boolean {
    return false; // K vs K is no longer an automatic draw in v2.3 rules
  }
}
