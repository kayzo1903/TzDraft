import { Injectable } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs';
import { inflateSync } from 'zlib';
// import { OfficialEngine } from '@tzdraft/official-engine';
import { BoardState } from '../../domain/game/value-objects/board-state.vo';
import { Piece } from '../../domain/game/value-objects/piece.vo';
import { Position } from '../../domain/game/value-objects/position.vo';
import { PieceType, PlayerColor } from '../../shared/constants/game.constants';
import type { SidraMoveResponse } from './sidra-types';

// ─── WDL values (for the side to move) ───────────────────────────────────────
const WDL_LOSS = 0;
const WDL_DRAW = 1;
const WDL_WIN = 2;
// 3 = unknown/illegal — treated as draw

// ─── Combinatorial index helpers (nCr table for position indexing) ────────────
/** Build a precomputed C(n,k) table for n,k ≤ 32. */
function buildNcr(): number[][] {
  const C: number[][] = Array.from({ length: 33 }, () => new Array(33).fill(0));
  for (let n = 0; n <= 32; n++) {
    C[n][0] = 1;
    for (let k = 1; k <= n; k++) {
      C[n][k] = C[n - 1][k - 1] + C[n - 1][k];
    }
  }
  return C;
}
const NCR = buildNcr();

// ─── CAKE ↔ EGTB square mapping ──────────────────────────────────────────────
/**
 * Convert a CAKE square (1–32) to a Russian EGTB square (0–31).
 *
 * CAKE layout:
 *   Row 0 (top) contains squares 1–4, row 7 (bottom) squares 29–32.
 *   Dark squares satisfy (row + col) % 2 === 1.
 *   Column formula: ((sq-1) % 4) * 2 + ((row+1) % 2)
 *
 * Russian EGTB layout:
 *   Squares 0–31, numbered left-to-right, top-to-bottom along dark squares.
 *   Row 0 dark columns: 1, 3, 5, 7  → EGTB squares 0–3
 *   Row 1 dark columns: 0, 2, 4, 6  → EGTB squares 4–7
 *   etc.
 *
 * Both use the same 8×8 board so we just re-derive the index from row/col.
 */
function cakeToEgtb(cakeSq: number): number {
  const row = Math.floor((cakeSq - 1) / 4);
  const col = ((cakeSq - 1) % 4) * 2 + ((row + 1) % 2);
  // EGTB index = row * 4 + (col rank among dark squares in this row)
  // Dark squares in even rows have cols 1,3,5,7 → rank = col/2
  // Dark squares in odd rows have cols 0,2,4,6  → rank = col/2
  return row * 4 + Math.floor(col / 2);
}

// ─── Piece info helper ────────────────────────────────────────────────────────
interface PieceInfo {
  type: 'MAN' | 'KING';
  color: 'WHITE' | 'BLACK';
  position: number; // CAKE square 1-32
}

// ─── EgtbService ─────────────────────────────────────────────────────────────
/**
 * EgtbService
 *
 * Reads and decodes Russian draughts Endgame TableBase (EGTB) files stored in
 * games-db/Russian/WDL/ and games-db/Russian/MTW/.
 *
 * Safety guard: only consulted when ALL pieces are kings and total ≤ 6.
 * This is the only region where Russian Draughts and Tanzania Draughts rules
 * are identical (men backward-capture and promotion-stops-sequence differences
 * do not apply to all-king positions).
 *
 * File format:
 *   Bytes 0–7:   Flags (LE uint64) — always 4 in our files.
 *   Bytes 8–15:  Position count (LE uint64).
 *   Bytes 16+:   2-bit packed WDL array, OR zlib-compressed payload.
 *                Zlib magic 0x78 0xDA identifies compressed files.
 *
 * WDL values at each 2-bit slot:
 *   0 = Loss (for side to move)
 *   1 = Draw
 *   2 = Win
 *   3 = Unknown/Illegal
 */
@Injectable()
export class EgtbService {
  private readonly MAX_PIECES = 6;
  private readonly MAX_CACHE = 128;

  /** LRU cache: file path → decoded 2-bit table (packed bytes) or null if missing */
  private readonly cache = new Map<string, Buffer | null>();

  private readonly dbPath: string;

  constructor() {
    // Resolve the games-db path relative to the backend cwd or one level up
    const candidates = [
      path.resolve(process.cwd(), '../games-db/Russian'),
      path.resolve(process.cwd(), 'games-db/Russian'),
    ];
    this.dbPath = candidates.find((p) => fs.existsSync(p)) ?? candidates[0];
    console.log(`[EGTB] Database path: ${this.dbPath}`);
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Public API
  // ────────────────────────────────────────────────────────────────────────────

  /**
   * Returns the best EGTB move for the position, or null if EGTB cannot be
   * used (men on board, too many pieces, file not found, no legal moves).
   */
  async getBestMove(
    pieces: PieceInfo[],
    sideToMove: 'WHITE' | 'BLACK',
    moveCount: number,
  ): Promise<SidraMoveResponse | null> {
    // ── Guards ────────────────────────────────────────────────────────────────
    if (pieces.some((p) => p.type === 'MAN')) return null;
    if (pieces.length > this.MAX_PIECES || pieces.length < 2) return null;

    const hasWhite = pieces.some((p) => p.color === 'WHITE');
    const hasBlack = pieces.some((p) => p.color === 'BLACK');
    if (!hasWhite || !hasBlack) return null;

    // ── Build board and get legal king moves via TZD official engine ──────────
    const board = this.buildBoard(pieces);
    const color =
      sideToMove === 'WHITE' ? PlayerColor.WHITE : PlayerColor.BLACK;

    // Lazy load to avoid Jest load-time crash with ESM workspace packages
    const { OfficialEngine } = require('@tzdraft/official-engine');
    const legalMoves = OfficialEngine.generateLegalMoves(
      board,
      color,
      moveCount,
    );
    if (legalMoves.length === 0) return null;

    // ── Score each move by consulting the opponent's WDL after the move ───────
    const oppSide = sideToMove === 'WHITE' ? 'BLACK' : 'WHITE';
    let bestScore = -1;
    let bestMove: SidraMoveResponse | null = null;

    for (const move of legalMoves) {
      const nextPieces = this.applyMove(pieces, move);
      const oppWdl = this.lookupWdl(nextPieces, oppSide);

      // Invert opponent's outcome → our score (2=we win, 1=draw, 0=we lose)
      let score: number;
      if (oppWdl === WDL_LOSS) score = 2;
      else if (oppWdl === WDL_DRAW) score = 1;
      else if (oppWdl === WDL_WIN) score = 0;
      else score = 1; // unknown → treat as draw

      if (score > bestScore) {
        bestScore = score;
        bestMove = {
          from: move.from.value,
          to: move.to.value,
          capturedSquares: move.capturedSquares.map((p: Position) => p.value),
          isPromotion: move.isPromotion,
        };
      }
    }

    if (bestMove) {
      console.log(
        `[EGTB] Hit (${pieces.length}p, side=${sideToMove}): ${bestMove.from}→${bestMove.to} score=${bestScore}`,
      );
    }
    return bestMove;
  }

  // ────────────────────────────────────────────────────────────────────────────
  // WDL lookup
  // ────────────────────────────────────────────────────────────────────────────

  /**
   * Look up the WDL value for a given position.
   * Returns WDL_DRAW (1) when no data is available.
   */
  private lookupWdl(
    pieces: PieceInfo[],
    sideToMove: 'WHITE' | 'BLACK',
  ): number {
    if (pieces.some((p) => p.type === 'MAN')) return WDL_DRAW;
    if (pieces.length > this.MAX_PIECES || pieces.length < 2) return WDL_DRAW;

    const hasW = pieces.some((p) => p.color === 'WHITE');
    const hasB = pieces.some((p) => p.color === 'BLACK');
    if (!hasW || !hasB) return WDL_DRAW;

    try {
      const { filePath, posIndex } = this.resolvePosition(pieces, sideToMove);
      const table = this.loadTable(filePath);
      if (!table) return WDL_DRAW;

      // Each position occupies 2 bits; 4 positions per byte
      const byteIdx = Math.floor(posIndex / 4);
      const bitShift = (posIndex % 4) * 2;
      if (byteIdx >= table.length) return WDL_DRAW;

      return (table[byteIdx] >> bitShift) & 0b11;
    } catch {
      return WDL_DRAW;
    }
  }

  // ────────────────────────────────────────────────────────────────────────────
  // File resolution and loading
  // ────────────────────────────────────────────────────────────────────────────

  /**
   * Resolve the EGTB file path and position index for a given set of pieces.
   *
   * File naming: {N}-{WM}{WK}{BM}{BK}-{sideIdx}-{chunkIdx}
   *   N       = total piece count
   *   WM/WK   = white men/king count (single decimal digit each)
   *   BM/BK   = black men/king count
   *   sideIdx = 0 for white-to-move, 1 for black-to-move
   *   chunkIdx = partition index into which this position falls
   *
   * For king-only positions BM=WM=0; config = "0{WK}0{BK}".
   *
   * Chunking: larger configs split positions across multiple files so that no
   * single file exceeds ~64 KB.  Chunk boundary = 65536 positions per file.
   * The position index mod 65536 is the within-file offset; div 65536 is the
   * chunk number.
   */
  private resolvePosition(
    pieces: PieceInfo[],
    sideToMove: 'WHITE' | 'BLACK',
  ): { filePath: string; posIndex: number } {
    const wm = pieces.filter(
      (p) => p.color === 'WHITE' && p.type === 'MAN',
    ).length;
    const bm = pieces.filter(
      (p) => p.color === 'BLACK' && p.type === 'MAN',
    ).length;
    const wk = pieces.filter(
      (p) => p.color === 'WHITE' && p.type === 'KING',
    ).length;
    const bk = pieces.filter(
      (p) => p.color === 'BLACK' && p.type === 'KING',
    ).length;
    const n = wm + bm + wk + bk;

    // config: WM BM WK BK (Kallisto format)
    const config = `${wm}${bm}${wk}${bk}`.padStart(4, '0');
    const sideIdx = sideToMove === 'WHITE' ? 1 : 2;

    // For sparse tables, we check for a file named {n}-{config}-{side}-{idx}
    // where idx is often the first piece's square.
    // Since we don't know the exact mapping, we default to chunk 0 or search.
    // For now, we use the combinatorial index as the globalIdx and chunk 0.
    const globalIdx = this.computePositionIndex(pieces, sideToMove);
    const CHUNK_SIZE = 65536;
    const chunkIdx = Math.floor(globalIdx / CHUNK_SIZE);
    const posIndex = globalIdx % CHUNK_SIZE;

    const folder = n <= 4 ? 'MTW' : 'WDL';
    const fileName = `${n}-${config}-${sideIdx}-${chunkIdx}`;
    const filePath = path.join(this.dbPath, folder, fileName);

    return { filePath, posIndex };
  }

  /**
   * Load and decode a table file, using the LRU cache.
   * Returns the decoded 2-bit packed byte array, or null if file not found.
   */
  private loadTable(filePath: string): Buffer | null {
    if (this.cache.has(filePath)) {
      return this.cache.get(filePath) ?? null;
    }

    // Evict oldest entry if cache is full
    if (this.cache.size >= this.MAX_CACHE) {
      const firstKey = this.cache.keys().next().value as string;
      this.cache.delete(firstKey);
    }

    if (!fs.existsSync(filePath)) {
      this.cache.set(filePath, null);
      return null;
    }

    try {
      const raw = fs.readFileSync(filePath);
      // Skip 16-byte header; rest is either raw or zlib-compressed 2-bit array
      const payload = raw.slice(16);
      const isZlib = payload.length >= 2 && payload[0] === 0x78;
      const table = isZlib ? Buffer.from(inflateSync(payload)) : payload;

      this.cache.set(filePath, table);
      console.log(
        `[EGTB] Loaded table: ${path.basename(filePath)} (${table.length} B)`,
      );
      return table;
    } catch (e) {
      console.warn(`[EGTB] Failed to load ${filePath}:`, e);
      this.cache.set(filePath, null);
      return null;
    }
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Position index computation (combinatorial number system)
  // ────────────────────────────────────────────────────────────────────────────

  /**
   * Compute a unique integer index for this board position.
   *
   * Strategy:
   *   1. Convert all CAKE squares to EGTB squares (0–31).
   *   2. Sort white kings ascending, then black kings ascending.
   *   3. Apply the combinatorial number system (Kingsrow/Russian EGTB standard):
   *      index = Σ C(sq_i, i+1)  for i = 0..n-1  (Gosper ranking)
   *   4. Separate the two groups and combine:
   *      globalIdx = wkIndex * C(32-wk, bk) + bkIndex
   *      (with black squares chosen from those not occupied by white).
   *
   * This gives a dense 0-based index within [0, C(32,wk)*C(32-wk,bk)).
   */
  private computePositionIndex(
    pieces: PieceInfo[],
    _sideToMove: 'WHITE' | 'BLACK',
  ): number {
    const wkSqs = pieces
      .filter((p) => p.color === 'WHITE' && p.type === 'KING')
      .map((p) => cakeToEgtb(p.position))
      .sort((a, b) => a - b);

    const bkSqs = pieces
      .filter((p) => p.color === 'BLACK' && p.type === 'KING')
      .map((p) => cakeToEgtb(p.position))
      .sort((a, b) => a - b);

    // Rank white kings in C(32, wk)
    const wkRank = this.combinatorialRank(wkSqs, 32);

    // Build available squares for black (all 32 minus white squares)
    const used = new Set(wkSqs);
    const avail = Array.from({ length: 32 }, (_, i) => i).filter(
      (s) => !used.has(s),
    );

    // Map black squares to their indices in the available list and rank
    const bkMapped = bkSqs.map((s) => avail.indexOf(s)).sort((a, b) => a - b);
    const bkRank = this.combinatorialRank(bkMapped, avail.length);

    const bkBase = NCR[32 - wkSqs.length][bkSqs.length];
    return wkRank * bkBase + bkRank;
  }

  /**
   * Combinatorial rank of a sorted list of k indices chosen from {0 … n-1}.
   * Uses the standard Gosper / combinatorial number system ranking:
   *   rank = Σ C(sq[i], i+1)
   */
  private combinatorialRank(sortedSqs: number[], _n: number): number {
    let rank = 0;
    for (let i = 0; i < sortedSqs.length; i++) {
      rank += NCR[sortedSqs[i]][i + 1];
    }
    return rank;
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Board helpers
  // ────────────────────────────────────────────────────────────────────────────

  private buildBoard(pieces: PieceInfo[]): BoardState {
    return new BoardState(
      pieces.map(
        (p) =>
          new Piece(
            p.type as unknown as PieceType,
            p.color as unknown as PlayerColor,
            new Position(p.position),
          ),
      ),
    );
  }

  /**
   * Apply a legal move to a piece list and return the new piece list.
   * Handles captures (remove captured pieces) and keeps all coordinates.
   */
  private applyMove(
    pieces: PieceInfo[],
    move: {
      from: Position;
      to: Position;
      capturedSquares: Position[];
      isPromotion: boolean;
    },
  ): PieceInfo[] {
    const capturedSet = new Set(move.capturedSquares.map((p) => p.value));
    return pieces
      .filter((p) => !capturedSet.has(p.position)) // remove captures
      .map((p) =>
        p.position === move.from.value
          ? {
              ...p,
              position: move.to.value,
              type: move.isPromotion ? 'KING' : p.type,
            }
          : p,
      );
  }
}
