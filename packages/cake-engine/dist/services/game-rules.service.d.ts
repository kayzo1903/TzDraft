import { Game } from '../entities/game.entity';
import { Piece } from '../value-objects/piece.vo';
import { Position } from '../value-objects/position.vo';
import { BoardState } from '../value-objects/board-state.vo';
import { PlayerColor, Winner, EndReason } from '../constants';
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
    isGameOver(game: Game): boolean;
    /**
     * Detect the winner
     */
    detectWinner(game: Game): Winner | null;
    /**
     * Check if a player has any legal moves
     */
    hasLegalMoves(game: Game, player: PlayerColor): boolean;
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
     * End the game with a result
     */
    endGame(game: Game, winner: Winner, reason: EndReason): void;
    /**
     * Count pieces for a player
     */
    countPieces(board: BoardState, player: PlayerColor): number;
}
//# sourceMappingURL=game-rules.service.d.ts.map