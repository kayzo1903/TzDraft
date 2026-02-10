import { Move } from '../entities/move.entity';
import { Position } from '../value-objects/position.vo';
import { CaptureFindingService } from './capture-finding.service';
import { getValidDirections } from '../types/capture-path.type';
/**
 * Move Generator Service
 * Generates all possible legal moves for a player
 * Used by AI and for move hints
 */
export class MoveGeneratorService {
    constructor() {
        Object.defineProperty(this, "captureFindingService", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.captureFindingService = new CaptureFindingService();
    }
    /**
     * Generate all legal moves for a player
     */
    generateAllMoves(game, player) {
        const moves = [];
        // Check for captures first (mandatory)
        const captures = this.captureFindingService.findAllCaptures(game.board, player);
        if (captures.length > 0) {
            // Only capture moves are legal
            for (const capture of captures) {
                const moveNumber = game.getMoveCount() + 1;
                const notation = Move.generateNotation(capture.from, capture.to, capture.capturedSquares);
                const move = new Move(this.generateMoveId(), game.id, moveNumber, player, capture.from, capture.to, capture.capturedSquares, capture.isPromotion, notation);
                moves.push(move);
            }
            return moves;
        }
        // No captures available, generate simple moves
        const pieces = game.board.getPiecesByColor(player);
        for (const piece of pieces) {
            const pieceMoves = this.generateSimpleMovesForPiece(game, piece);
            moves.push(...pieceMoves);
        }
        return moves;
    }
    /**
     * Generate all moves for a specific piece
     */
    generateMovesForPiece(game, piece) {
        // Check if captures are available for this piece
        const captures = this.captureFindingService.findCapturesForPiece(game.board, piece);
        if (captures.length > 0) {
            return captures.map((capture) => {
                const moveNumber = game.getMoveCount() + 1;
                const notation = Move.generateNotation(capture.from, capture.to, capture.capturedSquares);
                return new Move(this.generateMoveId(), game.id, moveNumber, piece.color, capture.from, capture.to, capture.capturedSquares, capture.isPromotion, notation);
            });
        }
        // Generate simple moves
        return this.generateSimpleMovesForPiece(game, piece);
    }
    /**
     * Generate simple (non-capture) moves for a piece
     */
    generateSimpleMovesForPiece(game, piece) {
        const moves = [];
        const { row, col } = piece.position.toRowCol();
        const directions = getValidDirections(piece);
        for (const dir of directions) {
            const newRow = row + dir.row;
            const newCol = col + dir.col;
            // Check bounds
            if (newRow < 0 || newRow > 7 || newCol < 0 || newCol > 7) {
                continue;
            }
            // Check if it's a dark square
            if ((newRow + newCol) % 2 === 0) {
                continue;
            }
            const targetPos = Position.fromRowCol(newRow, newCol);
            // Check if square is empty
            if (game.board.isEmpty(targetPos)) {
                const moveNumber = game.getMoveCount() + 1;
                const notation = Move.generateNotation(piece.position, targetPos, []);
                const movedPiece = piece.moveTo(targetPos);
                const isPromotion = movedPiece.shouldPromote();
                const move = new Move(this.generateMoveId(), game.id, moveNumber, piece.color, piece.position, targetPos, [], isPromotion, notation);
                moves.push(move);
            }
        }
        return moves;
    }
    /**
     * Count total legal moves for a player
     */
    countLegalMoves(game, player) {
        return this.generateAllMoves(game, player).length;
    }
    /**
     * Check if a specific move is legal
     */
    isMoveLegal(game, player, from, to) {
        const allMoves = this.generateAllMoves(game, player);
        return allMoves.some((move) => move.from.equals(from) && move.to.equals(to));
    }
    /**
     * Generate a unique move ID
     */
    generateMoveId() {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            return crypto.randomUUID();
        }
        // Fallback for environments without crypto.randomUUID
        return `move-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
}
