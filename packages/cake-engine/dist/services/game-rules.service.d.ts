import { Piece } from "../value-objects/piece.vo";
import { Position } from "../value-objects/position.vo";
import { BoardState } from "../value-objects/board-state.vo";
import { PlayerColor, Winner } from "../constants";
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
    /**
     * Count pieces for a player
     */
    countPieces(board: BoardState, player: PlayerColor): number;
}
//# sourceMappingURL=game-rules.service.d.ts.map