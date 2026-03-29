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
/**
 * Backed by mkz_generate_moves.  Only moves with non-empty capture arrays
 * are capture moves.  The `path` field is left empty (WASM doesn't expose
 * intermediate jump squares) — callers that rely on `path` should migrate to
 * using the move's `from`/`to`/`capturedSquares` directly.
 */
export declare class CaptureFindingService {
    findAllCaptures(board: BoardState, player: PlayerColor): CapturePath[];
    findCapturesForPiece(board: BoardState, piece: Piece): CapturePath[];
    isValidCapture(board: BoardState, piece: Piece, to: Position, capturedSquares: Position[]): boolean;
    hasCapturesAvailable(board: BoardState, player: PlayerColor): boolean;
}
export declare class MoveGeneratorService {
    generateAllMoves(board: BoardState, player: PlayerColor, _moveCount?: number): Move[];
}
export declare class MoveValidationService {
    isValidMove(board: BoardState, player: PlayerColor, from: Position, to: Position): boolean;
}
export declare class GameRulesService {
    detectWinner(board: BoardState, currentPlayer: PlayerColor): import('./constants.js').Winner | null;
    isDrawByThirtyMoveRule(reversibleMoveCount: number): boolean;
    isDrawByThreeKingsRule(threeKingsMoveCount: number): boolean;
    isDrawByArticle84Endgame(endgameMoveCount: number): boolean;
    isDrawByInsufficientMaterial(board: BoardState): boolean;
}
//# sourceMappingURL=services.d.ts.map