// engine-adapter.interface.ts
// Shared contract for all engine adapters (SiDra, future custom engines).

export interface EngineMove {
  from: number; // 1–32 square number
  to: number;
  capturedSquares: number[];
  isPromotion: boolean;
}

export interface EnginePiece {
  type: 'MAN' | 'KING';
  color: 'WHITE' | 'BLACK';
  position: number; // 1–32
}

export interface EngineThinkRequest {
  currentPlayer: 'WHITE' | 'BLACK';
  pieces: EnginePiece[];
  timeLimitMs: number;
  /** Optional AI level (1-20) so adapters can tune internal search depth. */
  aiLevel?: number;
  /** If set, the engine must restrict candidate moves to continuations from this square (multi-jump). */
  mustContinueFrom?: number | null;
}

export interface IEngineAdapter {
  /**
   * Name shown in logs and diagnostics.
   */
  readonly name: string;

  /**
   * Ask the engine for its best move in the given position.
   * Returns null if the engine returns no move (e.g., game over).
   */
  getBestMove(request: EngineThinkRequest): Promise<EngineMove | null>;

  /**
   * Clean up any persistent resources (processes, DLLs, etc.).
   */
  dispose(): void;
}
