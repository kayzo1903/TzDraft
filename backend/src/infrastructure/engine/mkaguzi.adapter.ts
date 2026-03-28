// mkaguzi.adapter.ts
// NestJS service that integrates the Mkaguzi engine via a persistent JSON IPC process.
//
// Mkaguzi is TzDraft's own C++20 Tanzania draughts engine.
// Unlike SiDra (one-shot process per move), Mkaguzi stays alive between requests:
//   setVariant → setPosition → go → read bestmove
//   setVariant → evalTrace   → read evalTrace
//
// The process is restarted automatically if it dies unexpectedly.

import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import * as readline from 'readline';
import {
  IEngineAdapter,
  EngineMove,
  EngineThinkRequest,
  EnginePiece,
  EngineAnalysis,
} from './engine-adapter.interface';

@Injectable()
export class MkaguziAdapter
  implements IEngineAdapter, OnModuleInit, OnModuleDestroy
{
  readonly name = 'Mkaguzi';
  private readonly logger = new Logger(MkaguziAdapter.name);

  private enginePath: string;
  private proc: ChildProcess | null = null;
  private destroyed = false;

  /** Queued line resolvers: next waiting consumer gets the next emitted line. */
  private lineResolvers: Array<(line: string) => void> = [];
  /** Lines emitted before any consumer was waiting. */
  private lineBuffer: string[] = [];

  /** Serialise requests — only one in-flight at a time. */
  private busy = false;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const envPath = this.configService.get<string>('MKAGUZI_PATH');
    if (envPath && fs.existsSync(envPath)) {
      this.enginePath = envPath;
    } else {
      const projectRoot = path.resolve(__dirname, '..', '..', '..', '..', '..');
      const bin = process.platform === 'win32' ? 'mkaguzi.exe' : 'mkaguzi';
      const candidates = [
        path.join(projectRoot, 'engines', 'core', 'build', 'Release', bin),
        path.join(projectRoot, 'engines', 'core', 'build', 'Debug',   bin),
        path.join(projectRoot, 'engines', 'core', 'build_mkaguzi', 'Release', bin),
        path.join(projectRoot, 'engines', 'core', 'build_mkaguzi', 'Debug',   bin),
      ];
      this.enginePath = candidates.find((p) => fs.existsSync(p)) ?? candidates[0];
    }

    if (!fs.existsSync(this.enginePath)) {
      this.logger.warn(
        `Mkaguzi binary not found at: ${this.enginePath}. ` +
          'Build it: cd engines/core && cmake -B build -G "Visual Studio 17 2022" && cmake --build build --config Release',
      );
      return;
    }

    this.logger.log(`Mkaguzi engine resolved at: ${this.enginePath}`);
    this.startProcess();
  }

  onModuleDestroy() {
    this.destroyed = true;
    this.killProcess();
    this.logger.log('MkaguziAdapter destroyed.');
  }

  dispose() {
    this.destroyed = true;
    this.killProcess();
  }

  // ── Process lifecycle ──────────────────────────────────────────────────

  private startProcess() {
    if (this.destroyed || !fs.existsSync(this.enginePath)) return;

    this.proc = spawn(this.enginePath, [], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    this.proc.stderr?.on('data', (d: Buffer) => {
      this.logger.debug(`[mkaguzi stderr] ${d.toString().trim()}`);
    });

    // Line-by-line reader on stdout
    const rl = readline.createInterface({ input: this.proc.stdout! });
    rl.on('line', (line) => this.onLine(line.trim()));

    this.proc.once('exit', (code) => {
      this.logger.warn(`Mkaguzi process exited (code ${code})`);
      this.proc = null;
      // Reject any pending waiters
      while (this.lineResolvers.length > 0) {
        const resolve = this.lineResolvers.shift()!;
        resolve('{"type":"error","message":"process exited"}');
      }
      // Auto-restart unless shutting down
      if (!this.destroyed) {
        this.logger.log('Restarting Mkaguzi process...');
        setTimeout(() => this.startProcess(), 500);
      }
    });

    this.proc.once('error', (err) => {
      this.logger.error(`Mkaguzi process error: ${err.message}`);
    });
  }

  private killProcess() {
    if (this.proc) {
      try { this.proc.kill(); } catch {}
      this.proc = null;
    }
  }

  // ── Line reader ──────────────────────────────────────────────────────

  private onLine(line: string) {
    if (!line) return;
    if (this.lineResolvers.length > 0) {
      const resolve = this.lineResolvers.shift()!;
      resolve(line);
    } else {
      this.lineBuffer.push(line);
    }
  }

  private nextLine(timeoutMs: number): Promise<string> {
    if (this.lineBuffer.length > 0) {
      return Promise.resolve(this.lineBuffer.shift()!);
    }
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        const idx = this.lineResolvers.indexOf(resolve);
        if (idx >= 0) this.lineResolvers.splice(idx, 1);
        reject(new Error(`Mkaguzi response timeout after ${timeoutMs}ms`));
      }, timeoutMs);

      this.lineResolvers.push((line) => {
        clearTimeout(timer);
        resolve(line);
      });
    });
  }

  // ── Helpers ──────────────────────────────────────────────────────────

  private send(obj: object) {
    if (!this.proc?.stdin?.writable) {
      throw new Error('Mkaguzi process is not running');
    }
    this.proc.stdin.write(JSON.stringify(obj) + '\n');
  }

  /**
   * Build a FEN string for Mkaguzi from CAKE board state.
   *
   * CAKE uses the American convention: WHITE pieces start at positions 1-12
   * (top of the board) and promote at positions 29-32 (bottom).
   *
   * Mkaguzi uses the International convention: WHITE pieces start at positions
   * 21-32 (bottom) and promote at positions 1-4 (top).
   *
   * The square numbers (1-32) refer to the same physical squares in both
   * systems, but the color assignments are inverted. Fix: send CAKE WHITE as
   * Mkaguzi BLACK and vice-versa, and flip the side-to-move accordingly.
   * The returned move (from/to) is in the same 1-32 PDN numbering so no
   * further conversion is needed.
   */
  private piecesToFen(pieces: EnginePiece[], currentPlayer: 'WHITE' | 'BLACK'): string {
    // CAKE WHITE = Mkaguzi BLACK (both at top, sqs 1-12)
    // CAKE BLACK = Mkaguzi WHITE (both at bottom, sqs 21-32)
    const mkaguziStm = currentPlayer === 'WHITE' ? 'B' : 'W';
    const mkaguziWhiteParts = pieces
      .filter((p) => p.color === 'BLACK')
      .map((p) => (p.type === 'KING' ? `K${p.position}` : `${p.position}`))
      .join(',');
    const mkaguziBlackParts = pieces
      .filter((p) => p.color === 'WHITE')
      .map((p) => (p.type === 'KING' ? `K${p.position}` : `${p.position}`))
      .join(',');
    return `${mkaguziStm}:W${mkaguziWhiteParts}:B${mkaguziBlackParts}`;
  }

  /** Convert a CAKE-convention FEN to Mkaguzi-convention FEN (swap colors + STM). */
  private cakeToMkaguziFen(cakeFen: string): string {
    const stm = cakeFen[0] === 'W' ? 'B' : 'W';
    const wMatch = cakeFen.match(/:W([^:]*)/);
    const bMatch = cakeFen.match(/:B([^:]*)/);
    const whiteSqs = wMatch ? wMatch[1] : '';
    const blackSqs = bMatch ? bMatch[1] : '';
    return `${stm}:W${blackSqs}:B${whiteSqs}`;
  }

  private parseMoveString(move: unknown): { from: number; to: number } | null {
    if (typeof move !== 'string' || !/^\d{4}$/.test(move)) return null;
    const from = parseInt(move.substring(0, 2), 10);
    const to = parseInt(move.substring(2, 4), 10);
    if (!Number.isInteger(from) || !Number.isInteger(to)) return null;
    if (from < 1 || from > 32 || to < 1 || to > 32) return null;
    return { from, to };
  }

  private pickDiverseOpeningMove(opts: {
    aiLevel?: number;
    priorHistoryCount: number;
    bestMove: string;
    rootInfos: Array<{ move: string; score: number; pvIndex: number }>;
  }): string {
    const { aiLevel, priorHistoryCount, bestMove, rootInfos } = opts;

    if (!aiLevel || aiLevel < 15) return bestMove;
    // Add diversity only in the opening/middlegame transition.
    if (priorHistoryCount >= 12) return bestMove;

    const sorted = rootInfos
      .filter((r) => this.parseMoveString(r.move) !== null)
      .sort((a, b) => a.pvIndex - b.pvIndex);
    if (sorted.length === 0) return bestMove;

    const bestScore = sorted[0].score;
    const scoreWindowByLevel: Record<number, number> = {
      15: 90,
      16: 75,
      17: 60,
      18: 40,
      19: 24,
    };
    const diversifyChanceByLevel: Record<number, number> = {
      15: 0.45,
      16: 0.32,
      17: 0.22,
      18: 0.12,
      19: 0.06,
    };
    const scoreWindow = scoreWindowByLevel[aiLevel] ?? 30;
    const diversifyChance = diversifyChanceByLevel[aiLevel] ?? 0.1;
    const nearBest = sorted.filter((r) => bestScore - r.score <= scoreWindow);

    if (nearBest.length <= 1 || Math.random() >= diversifyChance) {
      return bestMove;
    }

    // Weighted by rank: prefer stronger PVs while still introducing variety.
    const weighted: Array<{ move: string; w: number }> = nearBest.map((r) => ({
      move: r.move,
      w: 1 / (r.pvIndex + 1),
    }));
    const total = weighted.reduce((sum, item) => sum + item.w, 0);
    let pick = Math.random() * total;
    for (const item of weighted) {
      pick -= item.w;
      if (pick <= 0) return item.move;
    }
    return nearBest[0].move;
  }

  // ── Public API ──────────────────────────────────────────────────────

  async getBestMove(request: EngineThinkRequest): Promise<EngineMove | null> {
    if (!this.proc) {
      throw new Error('Mkaguzi engine not running. Build it first.');
    }
    if (this.busy) {
      throw new Error('Mkaguzi is already processing a request');
    }
    this.busy = true;

    // Strength is controlled by time budget only — no depth cap.
    // Depth 64 = effectively unlimited; the engine searches until timeMs runs out.
    // Shallow depth caps caused the engine to finish in <10ms and ignore the budget.
    const depth = 64;
    let timeMs = request.timeLimitMs ?? 2500;

    if (request.aiLevel !== undefined && request.aiLevel !== null) {
      switch (request.aiLevel) {
        case 15: timeMs = 1000; break;
        case 16: timeMs = 1500; break;
        case 17: timeMs = 2500; break;
        case 18: timeMs = 4000; break;
        case 19: timeMs = 6000; break;
        default: timeMs = request.timeLimitMs ?? 6000; break;
      }
    }

    const timeoutMs = timeMs + 8000;

    try {
      const fen = this.piecesToFen(request.pieces, request.currentPlayer);

      this.send({ type: 'setVariant', variant: 'tanzania' });
      const posMsg: Record<string, unknown> = { type: 'setPosition', fen };
      if (request.history && request.history.length > 0) {
        posMsg.history = request.history.map((f) => this.cakeToMkaguziFen(f));
      }
      this.send(posMsg);

      const multiPV =
        request.aiLevel !== undefined && request.aiLevel !== null
          ? request.aiLevel >= 19
            ? 2
            : request.aiLevel >= 17
              ? 3
              : 4
          : 2;

      let randomness = 0;
      if (request.aiLevel !== undefined && request.aiLevel !== null) {
        const noiseMap: Record<number, number> = {
          15: 18,
          16: 12,
          17: 7,
          18: 3,
          19: 0,
        };
        randomness = noiseMap[request.aiLevel] ?? 0;
      }

      this.send({
        type: 'go',
        depth,
        timeMs,
        multiPV,
        level: request.aiLevel ?? 19,
        randomness,
      });

      const rootInfos: Array<{ move: string; score: number; pvIndex: number }> =
        [];

      // Read lines until we get a bestmove or error response
      while (true) {
        const line = await this.nextLine(timeoutMs);
        let obj: any;
        try { obj = JSON.parse(line); } catch { continue; }

        if (obj.type === 'info') {
          const pv = Array.isArray(obj.pv) ? obj.pv : [];
          const rootMove = typeof pv[0] === 'string' ? pv[0] : null;
          const score = Number.isFinite(obj.score) ? Number(obj.score) : null;
          const pvIndex = Number.isInteger(obj.pvIndex) ? Number(obj.pvIndex) : null;
          if (rootMove && score !== null && pvIndex !== null) {
            rootInfos.push({ move: rootMove, score, pvIndex });
          }
          continue;
        }

        if (obj.type === 'bestmove') {
          const rawBestMove: string = obj.move ?? '';
          const moveStr = this.pickDiverseOpeningMove({
            aiLevel: request.aiLevel,
            priorHistoryCount: request.history?.length ?? 0,
            bestMove: rawBestMove,
            rootInfos,
          });
          if (!moveStr || moveStr === '0000') return null;

          const parsed = this.parseMoveString(moveStr);
          if (!parsed) {
            this.logger.warn(`Mkaguzi returned unparsable move: ${moveStr}`);
            return null;
          }
          const from = parsed.from;
          const to = parsed.to;
          const capturedSquares: number[] = Array.isArray(obj.capturedSquares)
            ? obj.capturedSquares
            : [];
          const isPromotion: boolean = obj.isPromotion === true;

          return { from, to, capturedSquares, isPromotion };
        }

        if (obj.type === 'error') {
          throw new Error(`Mkaguzi error: ${obj.message}`);
        }
        // type === 'info' — ignore search progress lines
      }
    } finally {
      this.busy = false;
    }
  }

  async analyze(pieces: EnginePiece[], currentPlayer: 'WHITE' | 'BLACK'): Promise<EngineAnalysis | null> {
    if (!this.proc) {
      throw new Error('Mkaguzi engine not running. Build it first.');
    }
    if (this.busy) {
      throw new Error('Mkaguzi is already processing a request');
    }
    this.busy = true;

    try {
      const fen = this.piecesToFen(pieces, currentPlayer);

      this.send({ type: 'setVariant', variant: 'tanzania' });
      this.send({ type: 'evalTrace', fen });

      while (true) {
        const line = await this.nextLine(5000);
        let obj: any;
        try { obj = JSON.parse(line); } catch { continue; }

        if (obj.type === 'evalTrace') {
          return {
            material:   obj.material   ?? 0,
            mobility:   obj.mobility   ?? 0,
            structure:  obj.structure  ?? 0,
            patterns:   obj.patterns   ?? 0,
            kingSafety: obj.kingSafety ?? 0,
            tempo:      obj.tempo      ?? 0,
            total:      obj.total      ?? 0,
          };
        }
        if (obj.type === 'error') {
          throw new Error(`Mkaguzi error: ${obj.message}`);
        }
      }
    } finally {
      this.busy = false;
    }
  }
}
