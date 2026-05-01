/**
 * puzzle-simulator.service.ts
 *
 * Generates high-quality puzzle candidates by simulating engine vs engine
 * games using the Mkaguzi engine at a strong level (17-18).
 *
 * Engine games produce far richer tactical positions than amateur player
 * games — the engine creates genuine positional traps, sacrifices, and
 * multi-move combinations that are instructive and non-trivial.
 *
 * Flow:
 *   1. Simulate N games of Mkaguzi (WHITE) vs Mkaguzi (BLACK)
 *   2. At each position, check if captures are forced (skip if so)
 *   3. After each quiet move, measure the eval swing across 2-3 player moves
 *   4. Save positions with a decisive swing as PENDING puzzle candidates
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma/prisma.service';
import { MkaguziAdapter } from '../../infrastructure/engine/mkaguzi.adapter';
import {
  PieceSnapshot,
  MoveRecord,
  applyMove,
  replayGame,
} from './board-reconstructor';

/** Engine level for simulated games. 17 = strong, responsive (~3s/move). */
const SIM_ENGINE_LEVEL = 17;

/** Minimum eval swing for combinations (first move already good). */
const SIM_EVAL_THRESHOLD = 280;

/** Minimum eval swing for genuine traps (first move looks innocent). */
const SIM_TRAP_THRESHOLD = 200;

/** First move's eval change must be below this to qualify as a trap. */
const SIM_TRAP_DECEPTIVE_MAX = 100;

/** Minimum pieces on board to be worth considering as a puzzle start. */
const SIM_MIN_PIECES = 8;

/** Maximum moves per simulated game before we call it a draw. */
const SIM_MAX_MOVES = 80;

/** Maximum puzzle candidates to extract per simulated game. */
const SIM_MAX_CANDIDATES_PER_GAME = 4;



@Injectable()
export class PuzzleSimulatorService {
  private readonly logger = new Logger(PuzzleSimulatorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mkaguzi: MkaguziAdapter,
  ) {}

  /**
   * Simulate `count` engine vs engine games and extract puzzle candidates.
   * Returns a summary of games played and candidates saved.
   */
  async simulateAndMine(
    count: number,
  ): Promise<{ games: number; candidates: number }> {
    this.logger.log(
      `Starting puzzle simulation: ${count} game(s) at engine level ${SIM_ENGINE_LEVEL}`,
    );

    let totalCandidates = 0;

    for (let g = 0; g < count; g++) {
      try {
        const candidates = await this.simulateGame();
        totalCandidates += candidates;
        this.logger.log(
          `Simulated game ${g + 1}/${count}: ${candidates} candidate(s) found`,
        );
      } catch (err) {
        this.logger.warn(`Simulated game ${g + 1} failed: ${err}`);
      }
    }

    this.logger.log(
      `Simulation complete — ${totalCandidates} candidate(s) from ${count} game(s)`,
    );
    return { games: count, candidates: totalCandidates };
  }

  // ── Core simulation ──────────────────────────────────────────────────────

  private async simulateGame(): Promise<number> {
    const moveRecords: MoveRecord[] = [];
    let board: PieceSnapshot[] = getInitialBoard();
    let sideToMove: 'WHITE' | 'BLACK' = 'WHITE';
    let moveNum = 0;

    // Play the game move by move
    while (moveNum < SIM_MAX_MOVES) {
      const engineMove = await this.mkaguzi.getBestMove({
        pieces: board as any,
        currentPlayer: sideToMove,
        aiLevel: SIM_ENGINE_LEVEL,
        timeLimitMs: 3000,
      }).catch(() => null);

      if (!engineMove) break; // game over or engine error

      const isPromotion: boolean = engineMove.isPromotion === true;

      const record: MoveRecord = {
        fromSquare: engineMove.from,
        toSquare: engineMove.to,
        capturedSquares: engineMove.capturedSquares ?? [],
        isPromotion,
        player: sideToMove,
      };

      board = applyMove(board, record);
      moveRecords.push(record);
      sideToMove = sideToMove === 'WHITE' ? 'BLACK' : 'WHITE';
      moveNum++;

      // Game over if one side has no pieces
      const hasPieces = (color: 'WHITE' | 'BLACK') =>
        board.some((p) => p.color === color);
      if (!hasPieces('WHITE') || !hasPieces('BLACK')) break;
    }

    this.logger.debug(`Simulated game: ${moveRecords.length} moves played`);

    if (moveRecords.length < 14) return 0;

    // Replay to get all board states and extract puzzle candidates
    return await this.extractCandidates(moveRecords);
  }

  private async extractCandidates(moveRecords: MoveRecord[]): Promise<number> {
    const states = replayGame(moveRecords);
    let candidatesFound = 0;

    for (let i = 0; i < moveRecords.length - 5; i++) {
      if (candidatesFound >= SIM_MAX_CANDIDATES_PER_GAME) break;

      const boardBefore = states[i];
      const sideToMove = moveRecords[i].player;
      const opponent = sideToMove === 'WHITE' ? 'BLACK' : 'WHITE';

      // GATE 1: Skip positions with forced captures.
      const jumps = findAllJumps(boardBefore, sideToMove);
      if (jumps.length > 0) continue;

      // GATE 2: Meaningful middlegame position.
      if (boardBefore.length < SIM_MIN_PIECES) continue;

      // GATE 3: At least 2 same-side moves ahead.
      const move2Idx = i + 2;
      const move3Idx = i + 4;
      if (move2Idx >= moveRecords.length) continue;
      if (moveRecords[move2Idx].player !== sideToMove) continue;

      // ── Eval measurements ───────────────────────────────────────
      // evalGap1: immediate value of the first quiet move
      //   → small = looks innocent = good trap setup
      // evalGap2: full value of the 2-move sequence
      //   → must be large to be worth showing
      const boardAfterMove1 = states[i + 1];
      const boardAfter2 = states[Math.min(move2Idx + 1, states.length - 1)];
      const boardAfter3 = move3Idx < moveRecords.length
        ? states[Math.min(move3Idx + 1, states.length - 1)]
        : null;

      const evalGap1 = await this.computeEvalGap(boardBefore, boardAfterMove1, sideToMove, opponent);
      const evalGap2 = await this.computeEvalGap(boardBefore, boardAfter2, sideToMove, opponent);
      const evalGap3 = boardAfter3
        ? await this.computeEvalGap(boardBefore, boardAfter3, sideToMove, opponent)
        : 0;

      const evalGap = Math.max(evalGap2, evalGap3);

      // ── Trap vs Combination ─────────────────────────────────────────
      const isTrap = evalGap1 < SIM_TRAP_DECEPTIVE_MAX && evalGap >= SIM_TRAP_THRESHOLD;
      const isCombination = !isTrap && evalGap >= SIM_EVAL_THRESHOLD;
      if (!isTrap && !isCombination) continue;

      // ── Build solution ───────────────────────────────────────────
      const move2 = moveRecords[move2Idx];
      const solution: Array<{ from: number; to: number; captures: number[] }> = [
        {
          from: moveRecords[i].fromSquare,
          to: moveRecords[i].toSquare,
          captures: moveRecords[i].capturedSquares ?? [],
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
        move3Idx < moveRecords.length &&
        moveRecords[move3Idx].player === sideToMove
      ) {
        solution.push({
          from: moveRecords[move3Idx].fromSquare,
          to: moveRecords[move3Idx].toSquare,
          captures: moveRecords[move3Idx].capturedSquares ?? [],
        });
      }

      const theme = classifySimTheme(
        moveRecords[i],
        move2,
        boardBefore,
        boardAfter2,
        evalGap1,
      );

      await this.prisma.puzzle.create({
        data: {
          pieces: boardBefore as any,
          sideToMove,
          solution: solution as any,
          evalGap,
          theme,
          difficulty: simDifficulty(evalGap, evalGap1),
          sourceGameId: null,
          sourceMoveNum: i,
          status: 'PENDING',
        },
      });

      candidatesFound++;
      i += 3; // smaller step = more positions per game
    }

    return candidatesFound;
  }

  private async computeEvalGap(
    boardBefore: PieceSnapshot[],
    boardAfter: PieceSnapshot[],
    sideToMove: 'WHITE' | 'BLACK',
    opponent: 'WHITE' | 'BLACK',
  ): Promise<number> {
    try {
      // IMPORTANT: MkaguziAdapter has a single `busy` flag — calls MUST be sequential.
      const evalBefore = await this.mkaguzi
        .analyze(boardBefore as any, sideToMove)
        .catch(() => null);
      const evalAfter = await this.mkaguzi
        .analyze(boardAfter as any, opponent)
        .catch(() => null);

      if (!evalBefore || !evalAfter) return 0;
      // Swing for sideToMove = (how good after) - (how good before)
      // evalAfter is from opponent's perspective so we negate it.
      return -evalAfter.total - evalBefore.total;
    } catch {
      return 0;
    }
  }
}

// ── Starting position ──────────────────────────────────────────────────────

function getInitialBoard(): PieceSnapshot[] {
  return [
    ...Array.from({ length: 12 }, (_, i): PieceSnapshot => ({
      type: 'MAN',
      color: 'WHITE',
      position: i + 1,
    })),
    ...Array.from({ length: 12 }, (_, i): PieceSnapshot => ({
      type: 'MAN',
      color: 'BLACK',
      position: i + 21,
    })),
  ];
}

// ── PDN board geometry (shared with miner) ────────────────────────────────

type DiagDir = 'nw' | 'ne' | 'sw' | 'se';

function pdnAdjacent(sq: number): Record<DiagDir, number | null> {
  const group = Math.ceil(sq / 4);
  const pos = (sq - 1) % 4;
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

function findAllJumps(
  pieces: PieceSnapshot[],
  sideToMove: 'WHITE' | 'BLACK',
): Array<{ from: number; to: number }> {
  const jumps: Array<{ from: number; to: number }> = [];
  const pieceMap = new Map(pieces.map((p) => [p.position, p]));
  const opponent = sideToMove === 'WHITE' ? 'BLACK' : 'WHITE';
  const manDirs: DiagDir[] =
    sideToMove === 'WHITE' ? ['sw', 'se'] : ['nw', 'ne'];
  const allDirs: DiagDir[] = ['nw', 'ne', 'sw', 'se'];

  for (const p of pieces.filter((pc) => pc.color === sideToMove)) {
    if (p.type === 'MAN') {
      for (const dir of manDirs) {
        const over = pdnStep(p.position, dir);
        if (!over || pieceMap.get(over)?.color !== opponent) continue;
        const land = pdnStep(over, dir);
        if (land !== null && !pieceMap.has(land)) {
          jumps.push({ from: p.position, to: land });
        }
      }
    } else {
      for (const dir of allDirs) {
        let cur = p.position;
        let foundOpponent = false;
        while (true) {
          const next = pdnStep(cur, dir);
          if (!next) break;
          const nextPiece = pieceMap.get(next);
          if (!foundOpponent) {
            if (nextPiece) {
              if (nextPiece.color === sideToMove) break;
              foundOpponent = true;
            }
          } else {
            if (nextPiece) break;
            jumps.push({ from: p.position, to: next });
          }
          cur = next;
        }
      }
    }
  }

  return jumps;
}

// ── Theme classification ────────────────────────────────────────────

function classifySimTheme(
  move1: MoveRecord,
  move2: MoveRecord,
  boardBefore: PieceSnapshot[],
  boardAfter: PieceSnapshot[],
  evalGap1: number,
): string {
  const sideToMove = move1.player;
  const opponent = sideToMove === 'WHITE' ? 'BLACK' : 'WHITE';

  const lostKings = boardBefore.filter(
    (p) =>
      p.color === opponent &&
      p.type === 'KING' &&
      !boardAfter.some((a) => a.position === p.position),
  );
  if (lostKings.length > 0) return 'king-trap';

  const myMaterialBefore = countMaterial(boardBefore, sideToMove);
  const myMaterialAfter  = countMaterial(boardAfter,  sideToMove);
  if (myMaterialAfter < myMaterialBefore) return 'sacrifice';

  if (boardBefore.length <= 8) return 'endgame';
  if (move1.isPromotion || move2.isPromotion) return 'promotion';

  const move2IsCapture = (move2.capturedSquares?.length ?? 0) > 0;
  if (evalGap1 < SIM_TRAP_DECEPTIVE_MAX && move2IsCapture) return 'capture-trap';
  if (evalGap1 < 50) return 'zugzwang';
  if (evalGap1 < SIM_TRAP_DECEPTIVE_MAX) return 'position-trap';
  return 'combination';
}

function countMaterial(pieces: PieceSnapshot[], color: 'WHITE' | 'BLACK'): number {
  return pieces
    .filter((p) => p.color === color)
    .reduce((sum, p) => sum + (p.type === 'KING' ? 3 : 1), 0);
}

/**
 * Difficulty for simulated puzzles.
 * Traps get +1 difficulty because they are HARDER to find — the first
 * move looks like nothing, so the solver must think further ahead.
 */
function simDifficulty(evalGap: number, evalGap1: number): number {
  const isTrap = evalGap1 < SIM_TRAP_DECEPTIVE_MAX;
  let base: number;
  if (evalGap >= 700) base = 5;
  else if (evalGap >= 500) base = 4;
  else if (evalGap >= 350) base = 3;
  else if (evalGap >= 250) base = 2;
  else base = 1;
  // Traps are harder to spot — bump difficulty by 1 (capped at 5)
  return isTrap ? Math.min(base + 1, 5) : base;
}
