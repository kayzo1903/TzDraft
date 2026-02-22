import { Move } from '../entities/move.entity.js';
import { BoardState } from '../value-objects/board-state.vo.js';
import { ValidationError } from './validation-error.type.js';

/**
 * Move Result
 * Result of move validation
 */
export interface MoveResult {
  isValid: boolean;
  move?: Move;
  error?: ValidationError;
  newBoardState?: BoardState;
}

/**
 * Simple Move Info
 * Information about a non-capture move
 */
export interface SimpleMoveInfo {
  from: number;
  to: number;
  isPromotion: boolean;
}

/**
 * Capture Move Info
 * Information about a capture move
 */
export interface CaptureMoveInfo {
  from: number;
  to: number;
  path: number[];
  capturedSquares: number[];
  isPromotion: boolean;
  isMultiCapture: boolean;
}
