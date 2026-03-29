import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { MkaguziAdapter } from '../../infrastructure/engine/mkaguzi.adapter';

type EnginePlayerColor = 'WHITE' | 'BLACK';

type BoardPiece = {
  type: 'KING' | 'MAN';
  color: 'WHITE' | 'BLACK';
  position: number;
};
type SimplifiedMove = {
  from: number;
  to: number;
  capturedSquares: number[];
  isPromotion: boolean;
};

/**
 * Get AI Move Use Case
 * Routes requests to engine adapters based on difficulty level.
 *
 * Level routing:
 *  1-9   → handled on the frontend (Mkaguzi WASM). Backend returns null.
 *  10-19 → Mkaguzi engine (IPC, server-side)
 */
@Injectable()
export class GetAiMoveUseCase {
  private readonly logger = new Logger(GetAiMoveUseCase.name);

  constructor(private readonly mkaguziAdapter: MkaguziAdapter) {}

  async execute(dto: {
    boardStatePieces: BoardPiece[];
    currentPlayer: 'WHITE' | 'BLACK';
    aiLevel: number;
    timeLimitMs: number;
    mustContinueFrom?: number | null;
    history?: string[];
  }): Promise<SimplifiedMove | null> {
    const {
      boardStatePieces,
      currentPlayer,
      aiLevel,
      timeLimitMs,
      mustContinueFrom,
      history,
    } = dto;

    if (!Array.isArray(boardStatePieces)) {
      throw new BadRequestException('Invalid board state format');
    }

    // Levels 1-9 are handled locally on the frontend.
    if (aiLevel < 10) {
      this.logger.warn(
        `Level ${aiLevel} (local WASM) was unexpectedly routed to the backend. Returning null.`,
      );
      return null;
    }

    const request = {
      currentPlayer: currentPlayer as EnginePlayerColor,
      pieces: boardStatePieces.map((p) => ({
        type: p.type,
        color: p.color,
        position: p.position,
      })),
      timeLimitMs,
      aiLevel,
      mustContinueFrom: mustContinueFrom ?? null,
      history: history ?? [],
    };

    this.logger.debug(`Routing to Mkaguzi Engine (Level ${aiLevel})`);
    try {
      const move = await this.mkaguziAdapter.getBestMove(request);
      return move ?? null;
    } catch (err) {
      this.logger.warn(
        `Mkaguzi adapter failed (level ${aiLevel}): ${(err as Error).message}. Returning null.`,
      );
      return null;
    }
  }
}
