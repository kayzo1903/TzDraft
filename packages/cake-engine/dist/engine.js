import { BoardState } from "./value-objects/board-state.vo.js";
import { Game } from "./entities/game.entity.js";
import { Move } from "./entities/move.entity.js";
import { Position } from "./value-objects/position.vo.js";
import { PlayerColor, Winner, GameType, GameStatus, EndReason, } from "./constants.js";
import { MoveGeneratorService } from "./services/move-generator.service.js";
import { GameRulesService } from "./services/game-rules.service.js";
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
    evaluateGameResult(state, currentPlayer, reversibleMoveCount = 0, threeKingsMoveCount = 0, endgameMoveCount = 0) {
        const rulesService = new GameRulesService();
        // Win: current player has no pieces or no legal moves
        const winner = rulesService.detectWinner(state, currentPlayer);
        if (winner) {
            const reason = winner !== Winner.DRAW ? EndReason.STALEMATE : EndReason.DRAW;
            return { winner, reason };
        }
        // Art 8.1 — K vs K (insufficient material)
        if (rulesService.isDrawByInsufficientMaterial(state)) {
            return { winner: Winner.DRAW, reason: EndReason.DRAW };
        }
        // Art 8.3 — 30-move rule
        if (rulesService.isDrawByThirtyMoveRule(reversibleMoveCount)) {
            return { winner: Winner.DRAW, reason: EndReason.DRAW };
        }
        // Art 8.5 — three-kings rule
        if (rulesService.isDrawByThreeKingsRule(threeKingsMoveCount)) {
            return { winner: Winner.DRAW, reason: EndReason.DRAW };
        }
        // Art 8.4 — K+Man vs K / 2K vs K endgame
        if (rulesService.isDrawByArticle84Endgame(endgameMoveCount)) {
            return { winner: Winner.DRAW, reason: EndReason.DRAW };
        }
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
