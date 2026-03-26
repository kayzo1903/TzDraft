import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { SidraAdapter } from '../../infrastructure/engine/sidra.adapter';
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
 *  1-9   → handled on the frontend (CAKE engine). Backend returns null.
 *  10-14 → SiDra engine (fast, Tanzania-correct)
 *  15-19 → Mkaguzi engine (TzDraft's own engine, deeper search + eval trace)
 */
@Injectable()
export class GetAiMoveUseCase {
  private readonly logger = new Logger(GetAiMoveUseCase.name);

  constructor(
    private readonly sidraAdapter: SidraAdapter,
    private readonly mkaguziAdapter: MkaguziAdapter,
  ) {}

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
        `Level ${aiLevel} (local CAKE) was unexpectedly routed to the backend. Returning null.`,
      );
      return null;
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

    // Levels 15-19 → Mkaguzi (own engine, deeper analysis)
    if (aiLevel >= 15) {
      this.logger.debug(`Routing to Mkaguzi Engine (Level ${aiLevel})`);
      try {
        const move = await this.mkaguziAdapter.getBestMove(request);
        return move ?? null;
      } catch (err) {
        this.logger.warn(
          `Mkaguzi adapter failed (level ${aiLevel}): ${(err as Error).message}. Falling back to SiDra.`,
        );
        // Fall through to SiDra as fallback
      }
    }

    // Levels 10-14 → SiDra (and Mkaguzi fallback)
    this.logger.debug(`Routing to SiDra Engine (Level ${aiLevel})`);
    try {
      const move = await this.sidraAdapter.getBestMove(request);
      return move ?? null;
    } catch (err) {
      this.logger.warn(
        `SiDra adapter failed (level ${aiLevel}): ${(err as Error).message}. Returning null.`,
      );
      return null;
    }
  }
}
