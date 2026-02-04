import { BoardState } from '../value-objects/board-state.vo';
import { Piece } from '../value-objects/piece.vo';
import { Position } from '../value-objects/position.vo';
import { PlayerColor } from '../../../shared/constants/game.constants';
import { CapturePath } from '../types/capture-path.type';
export declare class CaptureFindingService {
    findAllCaptures(board: BoardState, player: PlayerColor): CapturePath[];
    findCapturesForPiece(board: BoardState, piece: Piece): CapturePath[];
    private findCaptureInDirection;
    isValidCapture(board: BoardState, piece: Piece, to: Position, capturedSquares: Position[]): boolean;
    hasCapturesAvailable(board: BoardState, player: PlayerColor): boolean;
}
