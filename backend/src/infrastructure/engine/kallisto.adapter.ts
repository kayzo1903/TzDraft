// kallisto.adapter.ts
// NestJS service that integrates the Kallisto engine by spawning kallisto-cli.exe
// as a subprocess, sending the position as JSON via stdin, and reading the best
// move from stdout.

import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { execFile } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import {
  IEngineAdapter,
  EngineMove,
  EngineThinkRequest,
} from './engine-adapter.interface';

@Injectable()
export class KallistoAdapter
  implements IEngineAdapter, OnModuleInit, OnModuleDestroy
{
  readonly name = 'Kallisto';
  private readonly logger = new Logger(KallistoAdapter.name);

  /** Default time limit per move in milliseconds. */
  private readonly defaultTimeLimitMs: number;

  /** Resolved path to kallisto-cli.exe */
  private cliPath: string;

  constructor(private readonly configService: ConfigService) {
    this.defaultTimeLimitMs = parseInt(
      this.configService.get('KALLISTO_TIME_LIMIT_MS') || '3000',
      10,
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Lifecycle
  // ──────────────────────────────────────────────────────────────────────────

  onModuleInit() {
    const envPath = this.configService.get<string>('KALLISTO_CLI_PATH');
    if (envPath && fs.existsSync(envPath)) {
      this.cliPath = envPath;
    } else {
      // Default: engines/kallisto/kallisto-cli.exe relative to project root
      const projectRoot = path.resolve(__dirname, '..', '..', '..', '..', '..');
      this.cliPath = path.join(
        projectRoot,
        'engines',
        'kallisto',
        'kallisto-cli.exe',
      );
    }

    if (!fs.existsSync(this.cliPath)) {
      this.logger.warn(
        `kallisto-cli.exe not found at: ${this.cliPath}. ` +
          `Build it first: cd engines\\kallisto && build_kallisto_cli.bat`,
      );
    } else {
      this.logger.log(`Kallisto CLI resolved at: ${this.cliPath}`);
    }
  }

  onModuleDestroy() {
    // No persistent process — each call spawns a new one-shot process.
    this.logger.log('KallistoAdapter destroyed.');
  }

  dispose() {
    // No persistent resources to clean up (stateless subprocess model).
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Core API
  // ──────────────────────────────────────────────────────────────────────────

  async getBestMove(request: EngineThinkRequest): Promise<EngineMove | null> {
    if (!fs.existsSync(this.cliPath)) {
      throw new Error(
        `Kallisto CLI not found. Build it first at: ${this.cliPath}`,
      );
    }

    const timeLimitMs = request.timeLimitMs ?? this.defaultTimeLimitMs;
    const inputJson = JSON.stringify({
      currentPlayer: request.currentPlayer,
      timeLimitMs,
      pieces: request.pieces,
    });

    return new Promise((resolve, reject) => {
      const child = execFile(
        this.cliPath,
        [],
        { timeout: timeLimitMs + 5000, maxBuffer: 1024 * 64 },
        (error, stdout, stderr) => {
          if (stderr) {
            // Engine diagnostic output — log at debug level only
            this.logger.debug(`[kallisto-cli stderr] ${stderr.trim()}`);
          }

          if (error) {
            this.logger.error(`Kallisto process error: ${error.message}`);
            reject(error);
            return;
          }

          try {
            const result: EngineMove = JSON.parse(stdout.trim());
            if (result.from === -1) {
              // Engine returned no move (game over / stalemate)
              resolve(null);
            } else {
              resolve(result);
            }
          } catch (parseErr) {
            this.logger.error(
              `Failed to parse Kallisto output: ${stdout.trim()}`,
            );
            reject(parseErr);
          }
        },
      );

      // Send board position to engine via stdin
      child.stdin?.write(inputJson);
      child.stdin?.end();
    });
  }
}
