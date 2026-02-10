import { Game } from '../entities/game.entity';
import { Move } from '../entities/move.entity';
import { Piece } from '../value-objects/piece.vo';
import { Position } from '../value-objects/position.vo';
import { PlayerColor } from '../constants';
/**
 * Move Generator Service
 * Generates all possible legal moves for a player
 * Used by AI and for move hints
 */
export declare class MoveGeneratorService {
    private captureFindingService;
    constructor();
    /**
     * Generate all legal moves for a player
     */
    generateAllMoves(game: Game, player: PlayerColor): Move[];
    /**
     * Generate all moves for a specific piece
     */
    generateMovesForPiece(game: Game, piece: Piece): Move[];
    /**
     * Generate simple (non-capture) moves for a piece
     */
    private generateSimpleMovesForPiece;
    /**
     * Count total legal moves for a player
     */
    countLegalMoves(game: Game, player: PlayerColor): number;
    /**
     * Check if a specific move is legal
     */
    isMoveLegal(game: Game, player: PlayerColor, from: Position, to: Position): boolean;
    /**
     * Generate a unique move ID
     */
    private generateMoveId;
}
//# sourceMappingURL=move-generator.service.d.ts.map