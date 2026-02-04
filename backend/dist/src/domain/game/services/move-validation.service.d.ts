import { Game } from '../entities/game.entity';
import { Position } from '../value-objects/position.vo';
import { PlayerColor } from '../../../shared/constants/game.constants';
import { MoveResult } from '../types/move-result.type';
export declare class MoveValidationService {
    private captureFindingService;
    constructor();
    validateMove(game: Game, player: PlayerColor, from: Position, to: Position, path?: Position[]): MoveResult;
    private validateGameState;
    private validateTurn;
    private validatePieceOwnership;
    private validateCaptureMove;
    private validateSimpleMove;
    private isValidSimpleMove;
}
