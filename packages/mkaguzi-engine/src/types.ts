// Shared lightweight frontend-facing types.

export type { CapturePath, Direction } from './services.js';

export interface MoveResult {
  success: boolean;
  move?: import('./move.js').Move;
  error?: string;
}

export interface ValidationError {
  code: string;
  message: string;
}
