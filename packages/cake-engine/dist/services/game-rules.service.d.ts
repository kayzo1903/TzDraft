import { Piece } from "../value-objects/piece.vo.js";
import { Position } from "../value-objects/position.vo.js";
import { BoardState } from "../value-objects/board-state.vo.js";
import { PlayerColor, Winner } from "../constants.js";
/**
 * Game Rules Service
 * Handles game-level rules like promotion, game end detection, and draw conditions
 */
export declare class GameRulesService {
    private captureFindingService;
    constructor();
    /**
     * Check if a piece should be promoted
     */
    shouldPromote(piece: Piece, position: Position): boolean;
    /**
     * Promote a piece to king
     */
    promotePiece(piece: Piece): Piece;
    /**
     * Check if the game is over
     */
    isGameOver(board: BoardState, currentTurn: PlayerColor): boolean;
    /**
     * Detect the winner
     */
    detectWinner(board: BoardState, currentTurn: PlayerColor): Winner | null;
    /**
     * Check if a player has any legal moves
     */
    hasLegalMoves(board: BoardState, player: PlayerColor): boolean;
    /**
     * Check if a piece has any simple (non-capture) moves
     */
    private hasSimpleMovesForPiece;
    /**
     * Check for draw by insufficient material
     * (e.g., king vs king)
     */
    isDrawByInsufficientMaterial(board: BoardState): boolean;
    /** Art 8.3 — 30-move rule: 60 half-moves with kings only and no captures. */
    isDrawByThirtyMoveRule(reversibleMoveCount: number): boolean;
    /** Art 8.5 — Three-kings rule: stronger side (3+ K) fails to capture within 12 moves. */
    isDrawByThreeKingsRule(threeKingsMoveCount: number): boolean;
    /** Art 8.4 — K+Man vs K / 2K vs K: draw after 5 full moves (10 half-moves) with no win. */
    isDrawByArticle84Endgame(endgameMoveCount: number): boolean;
    /**
     * Count pieces for a player
     */
    countPieces(board: BoardState, player: PlayerColor): number;
}
//# sourceMappingURL=game-rules.service.d.ts.map