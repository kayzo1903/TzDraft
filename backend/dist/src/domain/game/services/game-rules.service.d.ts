import { Game } from '../entities/game.entity';
import { Piece } from '../value-objects/piece.vo';
import { Position } from '../value-objects/position.vo';
import { BoardState } from '../value-objects/board-state.vo';
import { PlayerColor, Winner, EndReason } from '../../../shared/constants/game.constants';
export declare class GameRulesService {
    private captureFindingService;
    constructor();
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
