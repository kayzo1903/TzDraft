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
 * Routes all levels 1-19 to the Mkaguzi engine.
 * Levels 1-9 previously ran client-side (CAKE); the backend now handles them all.
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

    const enginePieces = boardStatePieces.map((p) => ({
      type: p.type,
      color: p.color,
      position: p.position,
    }));

    const request = {
      currentPlayer: currentPlayer as EnginePlayerColor,
      pieces: enginePieces,
      timeLimitMs,
      aiLevel,
      mustContinueFrom: mustContinueFrom ?? null,
      history: history ?? [],
    };

    // Levels 10-19 → Mkaguzi
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
