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

  private piecesToFen(pieces: EnginePiece[], currentPlayer: 'WHITE' | 'BLACK'): string {
    const stm = currentPlayer === 'WHITE' ? 'W' : 'B';
    const whiteParts = pieces
      .filter((p) => p.color === 'WHITE')
      .map((p) => (p.type === 'KING' ? `K${p.position}` : `${p.position}`))
      .join(',');
    const blackParts = pieces
      .filter((p) => p.color === 'BLACK')
      .map((p) => (p.type === 'KING' ? `K${p.position}` : `${p.position}`))
      .join(',');
    return `${stm}:W${whiteParts}:B${blackParts}`;
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

    const timeoutMs = (request.timeLimitMs ?? 5000) + 5000;

    try {
      const fen = this.piecesToFen(request.pieces, request.currentPlayer);

      this.send({ type: 'setVariant', variant: 'tanzania' });
      const posMsg: Record<string, unknown> = { type: 'setPosition', fen };
      if (request.history && request.history.length > 0) {
        posMsg.history = request.history;
      }
      this.send(posMsg);

      // Scale strength based on aiLevel (Levels 15-19)
      let depth = 20;
      let timeMs = request.timeLimitMs ?? 2500;
      
      if (request.aiLevel !== undefined && request.aiLevel !== null) {
        switch (request.aiLevel) {
          case 15: depth = 8;  timeMs = 1000; break;
          case 16: depth = 10; timeMs = 1500; break;
          case 17: depth = 12; timeMs = 2000; break;
          case 18: depth = 15; timeMs = 3000; break;
          case 19: depth = 20; timeMs = 5000; break;
          default: depth = 20; timeMs = request.timeLimitMs ?? 5000; break;
        }
      }

      this.send({ type: 'go', depth, timeMs });

      // Read lines until we get a bestmove or error response
      while (true) {
        const line = await this.nextLine(timeoutMs);
        let obj: any;
        try { obj = JSON.parse(line); } catch { continue; }

        if (obj.type === 'bestmove') {
          const moveStr: string = obj.move ?? '';
          if (!moveStr || moveStr === '0000') return null;

          const from = parseInt(moveStr.substring(0, 2), 10);
          const to   = parseInt(moveStr.substring(2, 4), 10);
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
