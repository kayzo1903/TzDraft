/**
 * puzzle-miner.service.ts
 *
 * Nightly cron job (3 AM) that scans recently finished games, replays each
 * position, and uses Mkaguzi's eval to detect tactical moments worth turning
 * into puzzles.
 *
 * A position is a puzzle candidate when the position is quiet (no captures
 * available) and the eval swing exceeds PUZZLE_EVAL_THRESHOLD centipawns.
 * This filters out forced captures and ensures puzzles require genuine
 * strategic insight (sacrifices, positional traps, endgame maneuvers).
 *
 * Candidates are saved with status=PENDING and reviewed in the admin dashboard
 * before being published to players.
 */

import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../infrastructure/database/prisma/prisma.service';
import { MkaguziAdapter } from '../../infrastructure/engine/mkaguzi.adapter';
import { replayGame, MoveRecord, PieceSnapshot } from './board-reconstructor';
// We avoid the WASM-based MkaguziEngine in the backend miner to avoid Node.js/WASM load issues.
// Instead we use lightweight pure-JS checkers logic for jump detection.

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
        // Prioritize ranked games with at least one established player
        OR: [{ whiteElo: { gte: 1000 } }, { blackElo: { gte: 1000 } }],
      },
      select: { id: true },
      orderBy: {
        createdAt: 'desc',
      },
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
      isMultiCapture: m.isMultiCapture,
      player: m.player as 'WHITE' | 'BLACK',
    }));

    const states = replayGame(moveRecords);
    let candidatesFound = 0;

    for (let i = 0; i < moves.length - 5; i++) {
      if (candidatesFound >= MAX_CANDIDATES_PER_GAME) break;

      const boardBefore = states[i];
      const sideToMove = moves[i].player as 'WHITE' | 'BLACK';
      const opponent = sideToMove === 'WHITE' ? 'BLACK' : 'WHITE';
      const jumps = this.findAllJumps(boardBefore, sideToMove);

      // RULE: If there's ANY forced jump, it's a "mandatory capture puzzle".
      // We skip these to focus on "quiet" starting moves like sacrifices and traps.
      if (jumps.length > 0) continue;

      // Deep Eval: Check if the player's position improves significantly after their NEXT move too.
      // This helps catch sacrifices (move i) that lead to a win (move i+2).
      const boardAfter1 = states[i + 1]; // After player's 1st move
      const boardAfter3 = states[Math.min(i + 3, moves.length - 1)]; // After player's 2nd move (if exists)

      const evalGapShort = await this.computeEvalGap(boardBefore, boardAfter1, sideToMove, opponent);
      const evalGapDeep = await this.computeEvalGap(boardBefore, boardAfter3, sideToMove, opponent);

      const evalGap = Math.max(evalGapShort, evalGapDeep);

      // Thresholds: positional traps need a slightly higher bar to be "clean"
      if (evalGap >= 150) {
        const solutionMoves = [{
          from: moves[i].fromSquare,
          to: moves[i].toSquare,
          captures: moves[i].capturedSquares,
        }];

        // Add follow-up moves if they maintain the advantage
        if (i + 2 < moves.length && moves[i+2].player === sideToMove) {
            solutionMoves.push({
                from: moves[i+2].fromSquare,
                to: moves[i+2].toSquare,
                captures: moves[i+2].capturedSquares,
            });
        }

        const theme = classifyTheme(moves[i] as any, boardBefore, boardAfter1);
        
        await this.savePuzzleCandidate({
          gameId,
          moveNum: moves[i].moveNumber,
          pieces: boardBefore,
          sideToMove,
          solution: solutionMoves,
          evalGap: evalGap,
          theme: theme,
        });
        candidatesFound++;
        i += 3; // Move past the sequence
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
      const evalBefore = await this.analyzeWithTimeout(boardBefore, sideToMove);
      const evalAfter = await this.analyzeWithTimeout(boardAfter, opponent);

      if (evalBefore === null || evalAfter === null) return 0;

      // evalBefore  = score from sideToMove's perspective (positive = good for them)
      // evalAfter   = score from opponent's perspective   (positive = good for opponent)
      // Eval for sideToMove after the move is -evalAfter.
      // Swing for sideToMove = (Eval After) - (Eval Before) = -evalAfter - evalBefore
      return -evalAfter - evalBefore;
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
    solution: Array<{ from: number; to: number; captures: number[] }>;
    evalGap: number;
    theme: string;
  }): Promise<void> {
    await this.prisma.puzzle.create({
      data: {
        pieces: opts.pieces as any,
        sideToMove: opts.sideToMove,
        solution: opts.solution as any,
        evalGap: opts.evalGap,
        theme: opts.theme,
        difficulty: evalGapToDifficulty(opts.evalGap),
        sourceGameId: opts.gameId,
        sourceMoveNum: opts.moveNum,
        status: 'PENDING',
      },
    });
  }

  // ── Pure JS Draughts Logic for Mining Filter ──────────────────────────────

  /**
   * Returns all legal captures available to sideToMove.
   *
   * Uses correct PDN 1-32 board geometry (row parity determines offsets) and
   * handles flying king jumps: kings can jump over any piece along a diagonal,
   * not just the immediately adjacent one.
   *
   * Men can only capture forward (WHITE=SW/SE, BLACK=NW/NE) per TZD rules.
   */
  private findAllJumps(
    pieces: PieceSnapshot[],
    sideToMove: 'WHITE' | 'BLACK',
  ): Array<{ from: number; to: number }> {
    const jumps: Array<{ from: number; to: number }> = [];
    const pieceMap = new Map(pieces.map(p => [p.position, p]));
    const opponent = sideToMove === 'WHITE' ? 'BLACK' : 'WHITE';
    // WHITE moves toward higher square numbers (down); BLACK toward lower (up).
    const manDirs: DiagDir[] = sideToMove === 'WHITE' ? ['sw', 'se'] : ['nw', 'ne'];

    for (const p of pieces.filter(pc => pc.color === sideToMove)) {
      if (p.type === 'MAN') {
        for (const dir of manDirs) {
          const over = pdnStep(p.position, dir);
          if (over === null) continue;
          if (pieceMap.get(over)?.color !== opponent) continue;
          const land = pdnStep(over, dir);
          if (land !== null && !pieceMap.has(land)) {
            jumps.push({ from: p.position, to: land });
          }
        }
      } else {
        // Flying king: scan each diagonal for an opponent piece, then collect
        // all empty landing squares beyond it in the same direction.
        for (const dir of ALL_DIRS) {
          let cur = p.position;
          let foundOpponent = false;
          while (true) {
            const next = pdnStep(cur, dir);
            if (next === null) break;
            const nextPiece = pieceMap.get(next);
            if (!foundOpponent) {
              if (nextPiece) {
                if (nextPiece.color === sideToMove) break; // own piece blocks
                foundOpponent = true;
              }
            } else {
              if (nextPiece) break; // second piece blocks
              jumps.push({ from: p.position, to: next });
            }
            cur = next;
          }
        }
      }
    }

    return jumps;
  }
}

// ── PDN 1-32 Board Geometry ────────────────────────────────────────────────

type DiagDir = 'nw' | 'ne' | 'sw' | 'se';
const ALL_DIRS: DiagDir[] = ['nw', 'ne', 'sw', 'se'];

/**
 * Returns the diagonal neighbor of `sq` in direction `dir`, or null if off-board.
 *
 * PDN 1-32 squares are grouped into rows of 4 (group = ceil(sq/4)).
 * Odd-numbered groups have their dark squares in even columns (B,D,F,H);
 * even-numbered groups in odd columns (A,C,E,G). This alternation means the
 * step offsets differ by row parity.
 */
function pdnAdjacent(sq: number): Record<DiagDir, number | null> {
  const group = Math.ceil(sq / 4); // 1–8
  const pos = (sq - 1) % 4;       // 0–3 (0 = leftmost in group)
  const isOdd = group % 2 === 1;

  if (isOdd) {
    return {
      nw: group > 1 ? sq - 4 : null,
      ne: group > 1 && pos < 3 ? sq - 3 : null,
      sw: group < 8 ? sq + 4 : null,
      se: group < 8 && pos < 3 ? sq + 5 : null,
    };
  } else {
    return {
      nw: group > 1 && pos > 0 ? sq - 5 : null,
      ne: group > 1 ? sq - 4 : null,
      sw: group < 8 && pos > 0 ? sq + 3 : null,
      se: group < 8 ? sq + 4 : null,
    };
  }
}

function pdnStep(sq: number, dir: DiagDir): number | null {
  return pdnAdjacent(sq)[dir];
}

// ── Helpers ────────────────────────────────────────────────────────────────

function classifyTheme(
  move: MoveRecord,
  boardBefore: PieceSnapshot[],
  boardAfter: PieceSnapshot[],
): string {
  const sideToMove = move.player;
  const opponent = sideToMove === 'WHITE' ? 'BLACK' : 'WHITE';

  // 1. King Trap: Did a follow-up sequence eliminate an opponent's King?
  const lostKings = boardBefore.filter(
    (p) =>
      p.color === opponent &&
      p.type === 'KING' &&
      !boardAfter.some(a => a.position === p.position),
  );
  if (lostKings.length > 0) return 'king-trap';

  // 2. Sacrifice: Did our total material decrease while eval went up?
  const myMaterialBefore = countMaterial(boardBefore, sideToMove);
  const myMaterialAfter = countMaterial(boardAfter, sideToMove);
  if (myMaterialAfter < myMaterialBefore) return 'sacrifice';

  // 3. Endgame: Very few pieces left on the board.
  if (boardBefore.length <= 8) return 'endgame';

  if (move.isPromotion) return 'promotion';
  return 'position-trap';
}

function countMaterial(
  pieces: PieceSnapshot[],
  color: 'WHITE' | 'BLACK',
): number {
  return pieces
    .filter((p) => p.color === color)
    .reduce((sum, p) => sum + (p.type === 'KING' ? 3 : 1), 0);
}

function evalGapToDifficulty(gap: number): number {
  if (gap >= 600) return 1; // very obvious tactic
  if (gap >= 400) return 2;
  if (gap >= 250) return 3;
  if (gap >= 150) return 4;
  return 5; // subtle
}
