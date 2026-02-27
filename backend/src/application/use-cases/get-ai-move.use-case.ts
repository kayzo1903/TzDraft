import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { KallistoAdapter } from '../../infrastructure/engine/kallisto.adapter';
import { SidraAdapter } from '../../infrastructure/engine/sidra.adapter';

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
 * Routes requests to the appropriate engine adapter based on difficulty level.
 *
 * Level routing:
 *  1-9  → handled on the frontend (CAKE engine via bot.ts). Backend should not
 *          receive these; if it does we return null gracefully.
 *  10-15 → SiDra engine (Tanzania-rule-correct, compiled CLI)
 *  16-20 → Kallisto engine (strongest benchmark engine)
 */
@Injectable()
export class GetAiMoveUseCase {
  private readonly logger = new Logger(GetAiMoveUseCase.name);

  constructor(
    private readonly sidraAdapter: SidraAdapter,
    private readonly kallistoAdapter: KallistoAdapter,
  ) {}

  async execute(dto: {
    boardStatePieces: BoardPiece[];
    currentPlayer: 'WHITE' | 'BLACK';
    aiLevel: number;
    timeLimitMs: number;
    mustContinueFrom?: number | null;
  }): Promise<SimplifiedMove | null> {
    const {
      boardStatePieces,
      currentPlayer,
      aiLevel,
      timeLimitMs,
      mustContinueFrom,
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

    const engineColor: EnginePlayerColor = currentPlayer;
    const enginePieces = boardStatePieces.map((p) => ({
      type: p.type,
      color: p.color,
      position: p.position,
    }));

    const request = {
      currentPlayer: engineColor,
      pieces: enginePieces,
      timeLimitMs,
      aiLevel,
      mustContinueFrom: mustContinueFrom ?? null,
    };

    // Hard: SiDra (Level 10-15)
    if (aiLevel < 16) {
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

    // Expert/Grandmaster: Kallisto (Level 16-20)
    this.logger.debug(`Routing to Kallisto Engine (Level ${aiLevel})`);
    try {
      const move = await this.kallistoAdapter.getBestMove(request);
      return move ?? null;
    } catch (err) {
      this.logger.warn(
        `Kallisto adapter failed (level ${aiLevel}): ${(err as Error).message}. Returning null.`,
      );
      return null;
    }
  }
}
