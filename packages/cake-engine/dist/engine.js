import { BoardState } from "./value-objects/board-state.vo";
import { Game } from "./entities/game.entity";
import { Move } from "./entities/move.entity";
import { Position } from "./value-objects/position.vo";
import { PlayerColor, Winner, GameType, GameStatus, EndReason, } from "./constants";
import { MoveGeneratorService } from "./services/move-generator.service";
import { GameRulesService } from "./services/game-rules.service";
/**
 * CAKE Engine Public API
 * Browser-safe game engine for Tanzania Drafti
 */
export const CakeEngine = {
    /**
     * Create initial board state
     */
    createInitialState() {
        return BoardState.createInitialBoard();
    },
    /**
     * Generate all legal moves for a player
     */
    generateLegalMoves(state, player, moveCount = 0) {
        const moveGen = new MoveGeneratorService();
        return moveGen.generateAllMoves(state, player, moveCount);
    },
    /**
     * Apply a move to the board state
     */
    applyMove(state, move) {
        // Remove captured pieces
        let newBoard = state;
        for (const capturedPos of move.capturedSquares) {
            newBoard = newBoard.removePiece(capturedPos);
        }
        // Move the piece
        newBoard = newBoard.movePiece(move.from, move.to);
        return newBoard;
    },
    /**
     * Evaluate game result (detect win/draw conditions)
     */
    evaluateGameResult(state, currentPlayer) {
        const rulesService = new GameRulesService();
        // Check for winner
        const winner = rulesService.detectWinner(state, currentPlayer);
        if (winner) {
            let reason = EndReason.RESIGN; // Default
            if (winner === Winner.WHITE && currentPlayer === PlayerColor.BLACK) {
                reason = EndReason.CHECKMATE; // Black has no moves
            }
            else if (winner === Winner.BLACK &&
                currentPlayer === PlayerColor.WHITE) {
                reason = EndReason.CHECKMATE; // White has no moves
            }
            return { winner, reason };
        }
        // Check for draw by insufficient material
        if (rulesService.isDrawByInsufficientMaterial(state)) {
            return { winner: Winner.DRAW, reason: EndReason.DRAW };
        }
        // Game is still ongoing
        return null;
    },
    /**
     * Create a game instance
     */
    createGame(id, whitePlayerId, blackPlayerId, gameType = GameType.CASUAL) {
        return new Game(id, whitePlayerId, blackPlayerId, gameType, null, null, null, 600000, undefined, new Date(), null, null, GameStatus.WAITING, null, null, PlayerColor.WHITE);
    },
    /**
     * Helper to create a position
     */
    createPosition(value) {
        return new Position(value);
    },
    /**
     * Helper to create a move
     */
    createMove(id, gameId, moveNumber, player, from, to, capturedSquares = [], isPromotion = false) {
        const notation = Move.generateNotation(from, to, capturedSquares);
        return new Move(id, gameId, moveNumber, player, from, to, capturedSquares, isPromotion, notation);
    },
};
