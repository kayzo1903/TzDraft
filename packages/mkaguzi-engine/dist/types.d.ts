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
//# sourceMappingURL=types.d.ts.map