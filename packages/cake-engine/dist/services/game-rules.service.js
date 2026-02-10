import { Position } from "../value-objects/position.vo";
import { PlayerColor, Winner } from "../constants";
import { CaptureFindingService } from "./capture-finding.service";
/**
 * Game Rules Service
 * Handles game-level rules like promotion, game end detection, and draw conditions
 */
export class GameRulesService {
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
     * Check if a piece should be promoted
     */
    shouldPromote(piece, position) {
        if (piece.isKing()) {
            return false;
        }
        const { row } = position.toRowCol();
        // White pieces promote on row 0, Black pieces promote on row 7
        if (piece.color === PlayerColor.WHITE && row === 0) {
            return true;
        }
        if (piece.color === PlayerColor.BLACK && row === 7) {
            return true;
        }
        return false;
    }
    /**
     * Promote a piece to king
     */
    promotePiece(piece) {
        if (piece.isKing()) {
            return piece;
        }
        return piece.promote();
    }
    /**
     * Check if the game is over
     */
    isGameOver(board, currentTurn) {
        // Check if current player has no pieces
        const currentPlayerPieces = board.getPiecesByColor(currentTurn);
        if (currentPlayerPieces.length === 0) {
            return true;
        }
        // Check if current player has no legal moves
        if (!this.hasLegalMoves(board, currentTurn)) {
            return true;
        }
        return false;
    }
    /**
     * Detect the winner
     */
    detectWinner(board, currentTurn) {
        const whitePieces = board.getPiecesByColor(PlayerColor.WHITE);
        const blackPieces = board.getPiecesByColor(PlayerColor.BLACK);
        // No pieces left
        if (whitePieces.length === 0) {
            return Winner.BLACK;
        }
        if (blackPieces.length === 0) {
            return Winner.WHITE;
        }
        // No legal moves (stalemate - opponent wins)
        const whiteHasMoves = this.hasLegalMoves(board, PlayerColor.WHITE);
        const blackHasMoves = this.hasLegalMoves(board, PlayerColor.BLACK);
        if (!whiteHasMoves && currentTurn === PlayerColor.WHITE) {
            return Winner.BLACK;
        }
        if (!blackHasMoves && currentTurn === PlayerColor.BLACK) {
            return Winner.WHITE;
        }
        return null;
    }
    /**
     * Check if a player has any legal moves
     */
    hasLegalMoves(board, player) {
        // Check for captures first (mandatory)
        const captures = this.captureFindingService.findAllCaptures(board, player);
        if (captures.length > 0) {
            return true;
        }
        // Check for simple moves
        const pieces = board.getPiecesByColor(player);
        for (const piece of pieces) {
            if (this.hasSimpleMovesForPiece(board, piece)) {
                return true;
            }
        }
        return false;
    }
    /**
     * Check if a piece has any simple (non-capture) moves
     */
    hasSimpleMovesForPiece(board, piece) {
        const { row, col } = piece.position.toRowCol();
        // Determine valid directions based on piece type
        const directions = piece.isKing()
            ? [
                { row: 1, col: 1 },
                { row: 1, col: -1 },
                { row: -1, col: 1 },
                { row: -1, col: -1 },
            ]
            : piece.color === PlayerColor.WHITE
                ? [
                    { row: 1, col: 1 },
                    { row: 1, col: -1 },
                ]
                : [
                    { row: -1, col: 1 },
                    { row: -1, col: -1 },
                ];
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
            if (board.isEmpty(targetPos)) {
                return true;
            }
        }
        return false;
    }
    /**
     * Check for draw by insufficient material
     * (e.g., king vs king)
     */
    isDrawByInsufficientMaterial(board) {
        const whitePieces = board.getPiecesByColor(PlayerColor.WHITE);
        const blackPieces = board.getPiecesByColor(PlayerColor.BLACK);
        // King vs King
        if (whitePieces.length === 1 &&
            blackPieces.length === 1 &&
            whitePieces[0].isKing() &&
            blackPieces[0].isKing()) {
            return true;
        }
        return false;
    }
    /**
     * Count pieces for a player
     */
    countPieces(board, player) {
        return board.countPieces(player);
    }
}
