/**
 * services.ts
 *
 * WASM-backed implementations of the frontend service classes
 * (CaptureFindingService, MoveGeneratorService, MoveValidationService,
 * GameRulesService).
 */
import { Position } from './position.js';
import { PlayerColor } from './constants.js';
import { wasmGenerateMoves } from './wasm-bridge.js';
import { MkaguziEngine } from './engine.js';
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
    findAllCaptures(board, player) {
        const fen = board.toFen(player);
        const rawMoves = wasmGenerateMoves(fen);
        const captureMoves = rawMoves.filter((m) => m.captures.length > 0);
        return captureMoves.map((raw) => {
            const from = new Position(raw.from);
            const to = new Position(raw.to);
            const capturedSquares = raw.captures.map((n) => new Position(n));
            const piece = board.getPieceAt(from);
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
    findCapturesForPiece(board, piece) {
        return this.findAllCaptures(board, piece.color).filter((cp) => cp.from.equals(piece.position));
    }
    isValidCapture(board, piece, to, capturedSquares) {
        return this.findCapturesForPiece(board, piece).some((cp) => cp.to.equals(to) &&
            cp.capturedSquares.length === capturedSquares.length &&
            cp.capturedSquares.every((cs, i) => cs.equals(capturedSquares[i])));
    }
    hasCapturesAvailable(board, player) {
        return this.findAllCaptures(board, player).length > 0;
    }
}
// ─────────────────────────────────────────────────────────────────────────────
// MoveGeneratorService
// ─────────────────────────────────────────────────────────────────────────────
export class MoveGeneratorService {
    generateAllMoves(board, player, _moveCount = 0) {
        return MkaguziEngine.generateLegalMoves(board, player, _moveCount);
    }
}
// ─────────────────────────────────────────────────────────────────────────────
// MoveValidationService (thin wrapper — all moves from WASM are legal)
// ─────────────────────────────────────────────────────────────────────────────
export class MoveValidationService {
    isValidMove(board, player, from, to) {
        const legal = MkaguziEngine.generateLegalMoves(board, player);
        return legal.some((m) => m.from.equals(from) && m.to.equals(to));
    }
}
// ─────────────────────────────────────────────────────────────────────────────
// GameRulesService (delegates to wasmGameResult via engine)
// ─────────────────────────────────────────────────────────────────────────────
export class GameRulesService {
    detectWinner(board, currentPlayer) {
        const result = MkaguziEngine.evaluateGameResult(board, currentPlayer);
        return result?.winner ?? null;
    }
    isDrawByThirtyMoveRule(reversibleMoveCount) {
        return reversibleMoveCount >= 30;
    }
    isDrawByThreeKingsRule(threeKingsMoveCount) {
        return threeKingsMoveCount >= 16;
    }
    isDrawByArticle84Endgame(endgameMoveCount) {
        return endgameMoveCount >= 5;
    }
    isDrawByInsufficientMaterial(board) {
        return (board.getPiecesByColor(PlayerColor.WHITE).every((p) => p.isKing()) &&
            board.getPiecesByColor(PlayerColor.BLACK).every((p) => p.isKing()) &&
            board.getAllPieces().length === 2);
    }
}
//# sourceMappingURL=services.js.map