import { Game } from '../entities/game.entity';
import { Piece } from '../value-objects/piece.vo';
import { Position } from '../value-objects/position.vo';
import { BoardState } from '../value-objects/board-state.vo';
import { PlayerColor, Winner, EndReason } from '../../../shared/constants/game.constants';
export interface PostMoveOutcome {
    winner: Winner;
    reason: EndReason;
    noMoves?: boolean;
}
export interface DrawClaimAvailability {
    threefoldRepetition: boolean;
    thirtyMoveRule: boolean;
}
export interface PostMoveEvaluationResult {
    outcome: PostMoveOutcome | null;
    drawClaimAvailable: DrawClaimAvailability;
}
export declare class GameRulesService {
    private captureFindingService;
    constructor();
    private togglePlayer;
    private getPositionKey;
    private getMaterialCounts;
    private getEndgameTypeFromCounts;
    private getEndgameStrongerSide;
    private getThreeKingsStrongerSide;
    private applyMoveToBoard;
    private analyzeDrawRules;
    evaluatePostMove(game: Game): PostMoveEvaluationResult;
    isTimeoutDrawByInsufficientMaterial(board: BoardState, winnerColor: PlayerColor): boolean;
    shouldPromote(piece: Piece, position: Position): boolean;
    promotePiece(piece: Piece): Piece;
    isGameOver(game: Game): boolean;
    detectWinner(game: Game): Winner | null;
    hasLegalMoves(game: Game, player: PlayerColor): boolean;
    private hasSimpleMovesForPiece;
    isDrawByInsufficientMaterial(board: BoardState): boolean;
    endGame(game: Game, winner: Winner, reason: EndReason): void;
    countPieces(board: BoardState, player: PlayerColor): number;
}
