import { Move } from '../entities/move.entity';
import { BoardState } from '../value-objects/board-state.vo';
import { ValidationError } from './validation-error.type';
export interface MoveResult {
    isValid: boolean;
    move?: Move;
    error?: ValidationError;
    newBoardState?: BoardState;
}
export interface SimpleMoveInfo {
    from: number;
    to: number;
    isPromotion: boolean;
}
export interface CaptureMoveInfo {
    from: number;
    to: number;
    path: number[];
    capturedSquares: number[];
    isPromotion: boolean;
    isMultiCapture: boolean;
}
