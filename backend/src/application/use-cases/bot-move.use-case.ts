import { Injectable, Inject, forwardRef } from '@nestjs/common';
import type { IGameRepository } from '../../domain/game/repositories/game.repository.interface';
import { PlayerColor, GameStatus } from '../../shared/constants/game.constants';
import { KallistoEngineService } from '../engines/kallisto-engine.service';
import { MakeMoveUseCase } from './make-move.use-case';

/**
 * BotMoveUseCase
 *
 * Triggered by GamesGateway after a human player's move in a PvE (AI) game.
 * Selects the correct engine based on bot level and submits the AI move
 * through MakeMoveUseCase so it goes through the same validation pipeline
 * as human moves.
 *
 * Engine routing:
 *   Levels 1–5  → Frontend minimax handles these in local/offline play.
 *                 On server-side AI games this use case uses Kallisto at a
 *                 shorter time budget to simulate the weaker play.
 *   Levels 6–7  → Kallisto at medium depth (1.5 s / 3 s) — Chui / Simba.
 *   Level  8    → Zombie (2400 ELO) — Kallisto 5 s.
 *   Level  9    → Dragon (2600 ELO) — Kallisto 12 s, near-perfect play.
 *
 * The AI player ID is the string 'AI' (set by CreateGameUseCase.createPvEGame).
 */
@Injectable()
export class BotMoveUseCase {
  constructor(
    @Inject('IGameRepository')
    private readonly gameRepository: IGameRepository,
    private readonly kallistoService: KallistoEngineService,
    @Inject(forwardRef(() => MakeMoveUseCase))
    private readonly makeMoveUseCase: MakeMoveUseCase,
  ) {}

  async execute(gameId: string): Promise<void> {
    // Load the game
    const game = await this.gameRepository.findById(gameId);
    if (!game) {
      console.warn(`[BotMove] Game ${gameId} not found`);
      return;
    }

    if (game.status !== GameStatus.ACTIVE) {
      console.log(`[BotMove] Game ${gameId} not active — skipping`);
      return;
    }

    // Determine which side the AI is playing
    const botColor = this.getBotColor(game);
    if (!botColor) {
      console.warn(`[BotMove] No AI player in game ${gameId}`);
      return;
    }

    // Only act if it is the bot's turn
    if (game.currentTurn !== botColor) {
      console.log(`[BotMove] Not bot's turn in game ${gameId}`);
      return;
    }

    const aiLevel = game.aiLevel ?? 6;
    const timeLimitMs = this.timeLimitForLevel(aiLevel);

    console.log(
      `[BotMove] Game ${gameId} — bot color=${botColor} level=${aiLevel} timeMs=${timeLimitMs}`,
    );

    // Build the move request from the current board
    const board = game.board;
    const pieces = board.getAllPieces().map((p) => ({
      type: p.type as unknown as 'MAN' | 'KING',
      color: p.color as unknown as 'WHITE' | 'BLACK',
      position: p.position.value,
    }));

    const moveRequest = {
      pieces,
      currentPlayer: botColor as unknown as 'WHITE' | 'BLACK',
      moveCount: game.getMoveCount(),
      timeLimitMs,
    };

    // Get move from Kallisto
    const engineMove = await this.kallistoService.getMove(moveRequest);

    if (!engineMove || engineMove.from < 1 || engineMove.to < 1) {
      console.warn(`[BotMove] Kallisto returned no valid move for game ${gameId}`);
      return;
    }

    console.log(
      `[BotMove] Submitting move: ${engineMove.from} → ${engineMove.to}`,
    );

    // Submit through MakeMoveUseCase (same pipeline as human moves).
    // Only from/to are needed — MakeMoveUseCase resolves captured squares via
    // MoveValidationService, the same way human moves are processed.
    try {
      await this.makeMoveUseCase.execute(
        gameId,
        'AI', // bot's player ID
        engineMove.from,
        engineMove.to,
      );
      console.log(`[BotMove] Move submitted successfully for game ${gameId}`);
    } catch (err) {
      console.error(`[BotMove] Failed to submit move for game ${gameId}:`, err);
    }
  }

  // ──────────────────────────────────────────────────────────────────────────

  private getBotColor(game: {
    whitePlayerId: string | null;
    blackPlayerId: string | null;
  }): PlayerColor | null {
    if (game.whitePlayerId === 'AI') return PlayerColor.WHITE;
    if (game.blackPlayerId === 'AI') return PlayerColor.BLACK;
    return null;
  }

  /**
   * Time budget by level.
   * Levels 1–5  → short budgets to simulate weaker play.
   * Levels 6–7  → Simba-tier (CAKE minimax in local play; Kallisto on server).
   * Level  8    → Zombie (2400 ELO) — 5 s deep Kallisto search.
   * Level  9    → Dragon (2600 ELO) — 12 s near-perfect Kallisto search.
   */
  private timeLimitForLevel(level: number): number {
    if (level <= 1) return 200;
    if (level === 2) return 300;
    if (level === 3) return 500;
    if (level === 4) return 700;
    if (level === 5) return 1000;
    if (level === 6) return 1500;
    if (level === 7) return 3000;
    if (level === 8) return 5000;  // Zombie
    return 12000;                  // Dragon (level 9+)
  }
}
