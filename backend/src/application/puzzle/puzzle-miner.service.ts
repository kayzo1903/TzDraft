/**
 * puzzle-miner.service.ts
 *
 * Nightly cron job (3 AM) that scans recently finished games, replays each
 * position, and uses Mkaguzi's eval to detect tactical moments worth turning
 * into puzzles.
 *
 * A position is a puzzle candidate when the eval swing (before vs after the
 * actual move played) exceeds PUZZLE_EVAL_THRESHOLD centipawns, OR when the
 * move was a multi-capture (always tactically interesting).
 *
 * Candidates are saved with status=PENDING and reviewed in the admin dashboard
 * before being published to players.
 */

import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../infrastructure/database/prisma/prisma.service';
import { MkaguziAdapter } from '../../infrastructure/engine/mkaguzi.adapter';
import { replayGame, MoveRecord, PieceSnapshot } from './board-reconstructor';

/** Minimum centipawn swing to flag a position as a puzzle candidate. */
const PUZZLE_EVAL_THRESHOLD = 150;

/** Maximum candidates to extract per game (avoids flooding the queue). */
const MAX_CANDIDATES_PER_GAME = 3;

/** Minimum moves a game must have to be worth mining. */
const MIN_GAME_MOVES = 10;

/** Mkaguzi analysis timeout per position in ms. */
const ANALYSIS_TIMEOUT_MS = 4000;

@Injectable()
export class PuzzleMinerService {
  private readonly logger = new Logger(PuzzleMinerService.name);
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly mkaguzi: MkaguziAdapter,
  ) {}

  /** Run nightly at 3 AM — mines games from the last 1 day. */
  @Cron('0 3 * * *')
  async mineRecentGames(): Promise<void> {
    await this.triggerMining(1);
  }

  /**
   * Manually trigger mining for a custom number of days back.
   * Called from the admin endpoint. Returns a summary.
   */
  async triggerMining(
    days: number,
    force = false,
  ): Promise<{ games: number; candidates: number }> {
    if (this.running) {
      this.logger.warn(
        'Puzzle miner already running — skipping manual trigger',
      );
      return { games: 0, candidates: 0 };
    }
    this.running = true;
    this.logger.log(
      `Puzzle miner started (lookback: ${days} day(s), force: ${force})`,
    );

    try {
      if (force) {
        const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        const { count } = await this.prisma.game.updateMany({
          where: { minedForPuzzles: true, endedAt: { gte: since } },
          data: { minedForPuzzles: false },
        });
        this.logger.log(
          `Force mode: reset minedForPuzzles on ${count} game(s)`,
        );
      }
      return await this.runMining(days);
    } catch (err) {
      this.logger.error('Puzzle miner failed', err);
      return { games: 0, candidates: 0 };
    } finally {
      this.running = false;
      this.logger.log('Puzzle miner finished');
    }
  }

  // ── Core mining logic ──────────────────────────────────────────────────────

  private async runMining(
    days: number,
  ): Promise<{ games: number; candidates: number }> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Find finished games within the lookback window that haven't been mined yet.
    const games = await this.prisma.game.findMany({
      where: {
        status: 'FINISHED',
        minedForPuzzles: false,
        endedAt: { gte: since },
        winner: { not: null },
      },
      select: { id: true },
      take: 100, // process at most 100 games per cycle
    });

    if (games.length === 0) {
      this.logger.log('No unprocessed games found');
      return { games: 0, candidates: 0 };
    }

    this.logger.log(`Mining ${games.length} game(s)...`);
    let totalCandidates = 0;

    for (const { id: gameId } of games) {
      try {
        const count = await this.mineGame(gameId);
        totalCandidates += count;
      } catch (err) {
        this.logger.warn(`Failed to mine game ${gameId}: ${err}`);
      }

      // Mark mined regardless of success to avoid re-processing broken games.
      await this.prisma.game.update({
        where: { id: gameId },
        data: { minedForPuzzles: true },
      });
    }

    this.logger.log(
      `Mining complete — ${totalCandidates} candidate(s) saved from ${games.length} game(s)`,
    );
    return { games: games.length, candidates: totalCandidates };
  }

  private async mineGame(gameId: string): Promise<number> {
    const moves = await this.prisma.move.findMany({
      where: { gameId },
      orderBy: { moveNumber: 'asc' },
      select: {
        fromSquare: true,
        toSquare: true,
        capturedSquares: true,
        isPromotion: true,
        isMultiCapture: true,
        player: true,
        moveNumber: true,
      },
    });

    if (moves.length < MIN_GAME_MOVES) return 0;

    const moveRecords: MoveRecord[] = moves.map((m) => ({
      fromSquare: m.fromSquare,
      toSquare: m.toSquare,
      capturedSquares: m.capturedSquares,
      isPromotion: m.isPromotion,
      player: m.player as 'WHITE' | 'BLACK',
    }));

    const states = replayGame(moveRecords);
    let candidatesFound = 0;

    for (let i = 0; i < moves.length - 1; i++) {
      if (candidatesFound >= MAX_CANDIDATES_PER_GAME) break;

      const move = moves[i];
      const boardBefore = states[i];
      const boardAfter = states[i + 1];
      const sideToMove = move.player as 'WHITE' | 'BLACK';
      const opponent = sideToMove === 'WHITE' ? 'BLACK' : 'WHITE';

      // Fast path: always flag multi-captures as candidates (tactically rich).
      if (move.isMultiCapture) {
        await this.savePuzzleCandidate({
          gameId,
          moveNum: move.moveNumber,
          pieces: boardBefore,
          sideToMove,
          solution: {
            from: move.fromSquare,
            to: move.toSquare,
            captures: move.capturedSquares,
          },
          evalGap: 0, // will be estimated below
          theme: move.isPromotion ? 'promotion' : 'multi-capture',
        });
        candidatesFound++;
        continue;
      }

      // Eval-based detection: compare position before vs after the move.
      const evalGap = await this.computeEvalGap(
        boardBefore,
        boardAfter,
        sideToMove,
        opponent,
      );

      if (Math.abs(evalGap) >= PUZZLE_EVAL_THRESHOLD) {
        const theme = classifyTheme(move);
        await this.savePuzzleCandidate({
          gameId,
          moveNum: move.moveNumber,
          pieces: boardBefore,
          sideToMove,
          solution: {
            from: move.fromSquare,
            to: move.toSquare,
            captures: move.capturedSquares,
          },
          evalGap: Math.abs(evalGap),
          theme,
        });
        candidatesFound++;
      }
    }

    return candidatesFound;
  }

  /**
   * Returns the eval swing from the perspective of the player who moved.
   * Positive = the move was beneficial for sideToMove.
   */
  private async computeEvalGap(
    boardBefore: PieceSnapshot[],
    boardAfter: PieceSnapshot[],
    sideToMove: 'WHITE' | 'BLACK',
    opponent: 'WHITE' | 'BLACK',
  ): Promise<number> {
    try {
      const [evalBefore, evalAfter] = await Promise.all([
        this.analyzeWithTimeout(boardBefore, sideToMove),
        this.analyzeWithTimeout(boardAfter, opponent),
      ]);

      if (evalBefore === null || evalAfter === null) return 0;

      // evalBefore  = score from sideToMove's perspective (positive = good for them)
      // evalAfter   = score from opponent's perspective   (positive = good for opponent)
      // Swing for sideToMove = evalBefore - evalAfter (if they made a great move,
      // opponent's position worsened → evalAfter is negative → gap is large positive)
      return evalBefore - evalAfter;
    } catch {
      return 0;
    }
  }

  private async analyzeWithTimeout(
    pieces: PieceSnapshot[],
    player: 'WHITE' | 'BLACK',
  ): Promise<number | null> {
    const timeout = new Promise<null>((resolve) =>
      setTimeout(() => resolve(null), ANALYSIS_TIMEOUT_MS),
    );

    const analysis = this.mkaguzi
      .analyze(pieces as any, player)
      .then((r) => (r ? r.total : null))
      .catch(() => null);

    return Promise.race([analysis, timeout]);
  }

  private async savePuzzleCandidate(opts: {
    gameId: string;
    moveNum: number;
    pieces: PieceSnapshot[];
    sideToMove: 'WHITE' | 'BLACK';
    solution: { from: number; to: number; captures: number[] };
    evalGap: number;
    theme: string;
  }): Promise<void> {
    await this.prisma.puzzle.create({
      data: {
        pieces: opts.pieces as any,
        sideToMove: opts.sideToMove,
        solution: [opts.solution] as any,
        evalGap: opts.evalGap,
        theme: opts.theme,
        difficulty: evalGapToDifficulty(opts.evalGap),
        sourceGameId: opts.gameId,
        sourceMoveNum: opts.moveNum,
        status: 'PENDING',
      },
    });
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────

function classifyTheme(move: {
  capturedSquares: number[];
  isPromotion: boolean;
  isMultiCapture: boolean;
}): string {
  if (move.isPromotion) return 'promotion';
  if (move.isMultiCapture) return 'multi-capture';
  if (move.capturedSquares.length === 1) return 'capture';
  return 'positional';
}

function evalGapToDifficulty(gap: number): number {
  if (gap >= 600) return 1; // very obvious tactic
  if (gap >= 400) return 2;
  if (gap >= 250) return 3;
  if (gap >= 150) return 4;
  return 5; // subtle
}
