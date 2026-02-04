import { Game } from '../entities/game.entity';
import { Move } from '../entities/move.entity';
import { Piece } from '../value-objects/piece.vo';
import { Position } from '../value-objects/position.vo';
import { PlayerColor } from '../../../shared/constants/game.constants';
export declare class MoveGeneratorService {
    private captureFindingService;
    constructor();
    generateAllMoves(game: Game, player: PlayerColor): Move[];
    generateMovesForPiece(game: Game, piece: Piece): Move[];
    private generateSimpleMovesForPiece;
    countLegalMoves(game: Game, player: PlayerColor): number;
    isMoveLegal(game: Game, player: PlayerColor, from: Position, to: Position): boolean;
}
