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
const PUZZLE_EVAL_THRESHOLD = 280;      // for combinations (immediate strong moves)
const TRAP_EVAL_THRESHOLD    = 200;      // for genuine traps (deceptive first move)
const TRAP_DECEPTIVE_MAX     = 100;      // first move must look this innocent to be a trap

/** Maximum candidates to extract per game (avoids flooding the queue). */
const MAX_CANDIDATES_PER_GAME = 4;

/** Minimum moves a game must have to be worth mining. */
const MIN_GAME_MOVES = 14;

/** Minimum pieces on the board — avoids near-empty trivial endgames. */
const MIN_PIECES_ON_BOARD = 8;

/** Minimum solution length in half-moves (ply) for the active side. */
const MIN_SOLUTION_MOVES = 2;

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
        // Source from stronger games for higher-quality positions
        OR: [{ whiteElo: { gte: 1000 } }, { blackElo: { gte: 1000 } }],
      },
      select: { id: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
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

      // GATE 1: Skip positions where captures are already forced.
      const jumps = this.findAllJumps(boardBefore, sideToMove);
      if (jumps.length > 0) continue;

      // GATE 2: Require a meaningful middlegame position.
      if (boardBefore.length < MIN_PIECES_ON_BOARD) continue;

      // GATE 3: There must be at least 2 same-side moves ahead.
      const move2Idx = i + 2;
      const move3Idx = i + 4;
      if (move2Idx >= moves.length) continue;
      if (moves[move2Idx].player !== sideToMove) continue;

      // ── Eval measurements ─────────────────────────────────────────────
      //
      // boardAfterMove1 = board after player's FIRST quiet move (before opponent responds)
      // boardAfter2     = board after player's 2nd move (the full 2-move payoff)
      //
      // evalGap1 = immediate value of the first move alone
      //   → small means the first move LOOKS innocent (classic trap setup)
      // evalGap2 = total value of the 2-move sequence
      //   → must be large to be worth showing as a puzzle
      //
      const boardAfterMove1 = states[i + 1]; // after player's move, before opponent's
      const boardAfter2     = states[Math.min(move2Idx + 1, states.length - 1)];
      const boardAfter3     = move3Idx < moves.length
        ? states[Math.min(move3Idx + 1, states.length - 1)]
        : null;

      // Eval after first move alone (is it deceptive?)
      const evalGap1 = await this.computeEvalGap(boardBefore, boardAfterMove1, sideToMove, opponent);
      // Eval after 2-move sequence
      const evalGap2 = await this.computeEvalGap(boardBefore, boardAfter2, sideToMove, opponent);
      const evalGap3 = boardAfter3
        ? await this.computeEvalGap(boardBefore, boardAfter3, sideToMove, opponent)
        : 0;

      const evalGap = Math.max(evalGap2, evalGap3);

      // ── Trap vs Combination classification ────────────────────────────
      //
      // TRAP:        first move looks innocent (evalGap1 < TRAP_DECEPTIVE_MAX)
      //              but 2-move payoff is large  (evalGap >= TRAP_EVAL_THRESHOLD)
      //              → lower bar so we find MORE traps
      //
      // COMBINATION: first move already scores well (evalGap1 >= TRAP_DECEPTIVE_MAX)
      //              → need higher bar to keep combinations instructive
      //
      const isTrap = evalGap1 < TRAP_DECEPTIVE_MAX && evalGap >= TRAP_EVAL_THRESHOLD;
      const isCombination = !isTrap && evalGap >= PUZZLE_EVAL_THRESHOLD;
      if (!isTrap && !isCombination) continue;

      // ── Build solution — interleave opponent responses with isOpp:true ──
      // Format: [playerMove1, opponentResponse1, playerMove2, ...]
      // The mobile player animates isOpp moves automatically; backend skips them
      // when validating submitted player moves.
      const move2 = moves[move2Idx];
      const oppResponse1 = moves[i + 1]; // opponent's move between player move 1 and 2
      const solutionMoves: Array<{ from: number; to: number; captures: number[]; isOpp?: true }> = [
        {
          from: moves[i].fromSquare,
          to: moves[i].toSquare,
          captures: moves[i].capturedSquares ?? [],
        },
        {
          from: oppResponse1.fromSquare,
          to: oppResponse1.toSquare,
          captures: oppResponse1.capturedSquares ?? [],
          isOpp: true,
        },
        {
          from: move2.fromSquare,
          to: move2.toSquare,
          captures: move2.capturedSquares ?? [],
        },
      ];

      if (
        boardAfter3 &&
        evalGap3 >= evalGap2 &&
        move3Idx < moves.length &&
        moves[move3Idx].player === sideToMove
      ) {
        const oppResponse2 = moves[move3Idx - 1]; // opponent between move2 and move3
        solutionMoves.push({
          from: oppResponse2.fromSquare,
          to: oppResponse2.toSquare,
          captures: oppResponse2.capturedSquares ?? [],
          isOpp: true,
        });
        solutionMoves.push({
          from: moves[move3Idx].fromSquare,
          to: moves[move3Idx].toSquare,
          captures: moves[move3Idx].capturedSquares ?? [],
        });
      }

      const theme = classifyTheme(
        moves[i] as any,
        move2 as any,
        boardBefore,
        boardAfter2,
        evalGap1,
      );

      const setupMove = i > 0 ? {
        from: moves[i - 1].fromSquare,
        to: moves[i - 1].toSquare,
        captures: moves[i - 1].capturedSquares ?? [],
      } : null;
      const setupPieces = i > 0 ? states[i - 1] : null;

      await this.savePuzzleCandidate({
        gameId,
        moveNum: moves[i].moveNumber,
        pieces: boardBefore,
        sideToMove,
        solution: solutionMoves,
        evalGap,
        theme,
        setupMove,
        setupPieces,
      });

      candidatesFound++;
      i += 3; // smaller step = more positions checked per game
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
    setupMove: { from: number; to: number; captures: number[] } | null;
    setupPieces: PieceSnapshot[] | null;
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
        ...(opts.setupMove && { setupMove: opts.setupMove as any }),
        ...(opts.setupPieces && { setupPieces: opts.setupPieces as any }),
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

/**
 * Classify the puzzle theme using both moves and the deceptiveness score.
 *
 * evalGap1 = eval change after JUST the first quiet move.
 * A small evalGap1 means the first move looks innocent — classic trap pattern.
 */
function classifyTheme(
  move1: MoveRecord,
  move2: MoveRecord,
  boardBefore: PieceSnapshot[],
  boardAfter: PieceSnapshot[],
  evalGap1: number,
): string {
  const sideToMove = move1.player;
  const opponent = sideToMove === 'WHITE' ? 'BLACK' : 'WHITE';

  // 1. King Trap: opponent's king is gone after the sequence
  const lostKings = boardBefore.filter(
    (p) =>
      p.color === opponent &&
      p.type === 'KING' &&
      !boardAfter.some((a) => a.position === p.position),
  );
  if (lostKings.length > 0) return 'king-trap';

  // 2. Sacrifice: we gave up material to get the advantage
  const myMaterialBefore = countMaterial(boardBefore, sideToMove);
  const myMaterialAfter  = countMaterial(boardAfter,  sideToMove);
  if (myMaterialAfter < myMaterialBefore) return 'sacrifice';

  // 3. Endgame technique
  if (boardBefore.length <= 8) return 'endgame';

  // 4. Promotion setup
  if (move1.isPromotion || move2.isPromotion) return 'promotion';

  // 5. Capture-trap: first move is quiet AND the payoff move is a capture.
  //    This is the classic "bait and spring" — lure, then pounce.
  const move2IsCapture = (move2.capturedSquares?.length ?? 0) > 0;
  if (evalGap1 < TRAP_DECEPTIVE_MAX && move2IsCapture) return 'capture-trap';

  // 6. Zugzwang-style: first move creates a situation where any
  //    opponent response worsens their position (very small evalGap1).
  if (evalGap1 < 50) return 'zugzwang';

  // 7. Position-trap: quiet setup with positional (non-capture) payoff
  if (evalGap1 < TRAP_DECEPTIVE_MAX) return 'position-trap';

  // 8. Combination: strong immediate sequence
  return 'combination';
}

function countMaterial(
  pieces: PieceSnapshot[],
  color: 'WHITE' | 'BLACK',
): number {
  return pieces
    .filter((p) => p.color === color)
    .reduce((sum, p) => sum + (p.type === 'KING' ? 3 : 1), 0);
}

/**
 * Difficulty based on eval gap.
 * Higher gap = the winning idea is more decisive = harder to find intuitively.
 * Lower gap = subtle positional edge = also hard but in a different way.
 * We target the mid-range (300-500cp) as the "sweet spot" for instructive puzzles.
 */
function evalGapToDifficulty(gap: number): number {
  if (gap >= 700) return 5; // Crushing — should be obvious in hindsight
  if (gap >= 500) return 4;
  if (gap >= 350) return 3; // Sweet spot: clear advantage, non-trivial
  if (gap >= 300) return 2;
  return 1; // Subtle edge — hardest to find
}
