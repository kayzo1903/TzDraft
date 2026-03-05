// sidra.adapter.ts
// NestJS service that integrates the SiDra engine by spawning sidra-cli.exe
// SiDra already has TZD-correct rules baked in (forward-only captures, stop-at-promo).
//
// Performance: maintains a pool of POOL_SIZE pre-warmed processes so the
// OS process-creation overhead (~50-200ms on Windows) is paid in advance,
// not on the hot path of an AI move request.

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
import {
  IEngineAdapter,
  EngineMove,
  EngineThinkRequest,
} from './engine-adapter.interface';

/** Number of idle processes kept alive and ready for the next AI move. */
const POOL_SIZE = 4;

@Injectable()
export class SidraAdapter
  implements IEngineAdapter, OnModuleInit, OnModuleDestroy
{
  readonly name = 'SiDra';
  private readonly logger = new Logger(SidraAdapter.name);

  private readonly defaultTimeLimitMs: number;
  private cliPath: string;

  /** Pool of idle processes waiting for a JSON request on stdin. */
  private pool: ChildProcess[] = [];
  private destroyed = false;

  constructor(private readonly configService: ConfigService) {
    this.defaultTimeLimitMs = parseInt(
      this.configService.get('SIDRA_TIME_LIMIT_MS') || '3000',
      10,
    );
  }

  onModuleInit() {
    const envPath = this.configService.get<string>('SIDRA_CLI_PATH');
    if (envPath && fs.existsSync(envPath)) {
      this.cliPath = envPath;
    } else {
      const projectRoot = path.resolve(__dirname, '..', '..', '..', '..', '..');
      this.cliPath = path.join(
        projectRoot,
        'engines',
        'sidra',
        'cli',
        'sidra-cli.exe',
      );
    }

    if (!fs.existsSync(this.cliPath)) {
      this.logger.warn(
        `sidra-cli.exe not found at: ${this.cliPath}. ` +
          `Build it: cd engines\\sidra\\cli && build_cli.bat`,
      );
      return;
    }

    this.logger.log(`SiDra CLI resolved at: ${this.cliPath}`);
    this.fillPool();
  }

  onModuleDestroy() {
    this.destroyed = true;
    this.drainPool();
    this.logger.log('SidraAdapter destroyed, pool drained.');
  }

  dispose() {
    this.destroyed = true;
    this.drainPool();
  }

  // ── Pool management ────────────────────────────────────────────────────

  private fillPool(): void {
    while (this.pool.length < POOL_SIZE) {
      this.spawnIdle();
    }
  }

  private spawnIdle(): void {
    if (this.destroyed || !fs.existsSync(this.cliPath)) return;

    const child = spawn(this.cliPath, [], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    child.stderr?.on('data', (d: Buffer) => {
      this.logger.debug(`[sidra idle stderr] ${d.toString().trim()}`);
    });

    // Remove from pool on premature exit and optionally refill
    child.once('exit', () => {
      const idx = this.pool.indexOf(child);
      if (idx >= 0) this.pool.splice(idx, 1);
    });

    this.pool.push(child);
  }

  private drainPool(): void {
    for (const p of this.pool) {
      try {
        p.kill();
      } catch {}
    }
    this.pool = [];
  }

  // ── Public API ──────────────────────────────────────────────────────────

  async getBestMove(request: EngineThinkRequest): Promise<EngineMove | null> {
    if (!fs.existsSync(this.cliPath)) {
      throw new Error(
        `SiDra CLI not found. Build it first at: ${this.cliPath}`,
      );
    }

    const timeLimitMs = request.timeLimitMs ?? this.defaultTimeLimitMs;
    // The Sidra engine computes TimeForMove = TimeRemaining / 20, treating
    // the value as remaining game time. Since the CLI is one-shot (one move
    // per process), we pass timeLimitMs * 20 so the engine allocates exactly
    // timeLimitMs for this move instead of timeLimitMs / 20.
    const engineTimeLimitMs = timeLimitMs * 20;
    const inputJson = JSON.stringify({
      currentPlayer: request.currentPlayer,
      timeLimitMs: engineTimeLimitMs,
      pieces: request.pieces,
      aiLevel: request.aiLevel ?? null,
      mustContinueFrom: request.mustContinueFrom ?? null,
    });

    // Grab a pre-warmed process from the pool, or fall back to a fresh spawn
    const child = this.pool.shift() ?? spawn(this.cliPath, [], { stdio: ['pipe', 'pipe', 'pipe'] });

    // Immediately start a replacement to keep the pool full
    if (!this.destroyed) {
      setImmediate(() => this.spawnIdle());
    }

    return new Promise<EngineMove | null>((resolve, reject) => {
      let stdout = '';
      let stderrData = '';

      const timeoutHandle = setTimeout(() => {
        try { child.kill(); } catch {}
        reject(new Error(`SiDra timed out after ${timeLimitMs + 3000}ms`));
      }, timeLimitMs + 3000);

      child.stdout?.on('data', (d: Buffer) => { stdout += d.toString(); });
      child.stderr?.on('data', (d: Buffer) => { stderrData += d.toString(); });

      child.once('exit', () => {
        clearTimeout(timeoutHandle);
        if (stderrData) {
          this.logger.debug(`[sidra-cli stderr] ${stderrData.trim()}`);
        }
        try {
          const result: EngineMove = JSON.parse(stdout.trim());
          resolve(result.from === -1 ? null : result);
        } catch {
          this.logger.error(`Failed to parse SiDra output: "${stdout.trim()}"`);
          reject(new Error(`Invalid SiDra output: ${stdout.trim()}`));
        }
      });

      child.once('error', (err) => {
        clearTimeout(timeoutHandle);
        reject(err);
      });

      child.stdin?.write(inputJson);
      child.stdin?.end();
    });
  }
}
