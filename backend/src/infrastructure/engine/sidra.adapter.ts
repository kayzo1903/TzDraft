// sidra.adapter.ts
// NestJS service that integrates the SiDra engine by spawning sidra-cli.exe
// SiDra already has TZD-correct rules baked in (forward-only captures, stop-at-promo).

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
export class SidraAdapter
  implements IEngineAdapter, OnModuleInit, OnModuleDestroy
{
  readonly name = 'SiDra';
  private readonly logger = new Logger(SidraAdapter.name);

  private readonly defaultTimeLimitMs: number;
  private cliPath: string;

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
    } else {
      this.logger.log(`SiDra CLI resolved at: ${this.cliPath}`);
    }
  }

  onModuleDestroy() {
    this.logger.log('SidraAdapter destroyed.');
  }

  dispose() {}

  async getBestMove(request: EngineThinkRequest): Promise<EngineMove | null> {
    if (!fs.existsSync(this.cliPath)) {
      throw new Error(
        `SiDra CLI not found. Build it first at: ${this.cliPath}`,
      );
    }

    const timeLimitMs = request.timeLimitMs ?? this.defaultTimeLimitMs;
    const inputJson = JSON.stringify({
      currentPlayer: request.currentPlayer,
      timeLimitMs,
      pieces: request.pieces,
      aiLevel: request.aiLevel ?? null,
      mustContinueFrom: request.mustContinueFrom ?? null,
    });

    return new Promise((resolve, reject) => {
      const child = execFile(
        this.cliPath,
        [],
        { timeout: timeLimitMs + 2000, maxBuffer: 1024 * 64 },
        (error, stdout, stderr) => {
          if (stderr) {
            this.logger.debug(`[sidra-cli stderr] ${stderr.trim()}`);
          }

          if (error) {
            this.logger.error(`SiDra process error: ${error.message}`);
            reject(error);
            return;
          }

          try {
            const result: EngineMove = JSON.parse(stdout.trim());
            resolve(result.from === -1 ? null : result);
          } catch (parseErr) {
            this.logger.error(`Failed to parse SiDra output: ${stdout.trim()}`);
            reject(parseErr);
          }
        },
      );

      child.stdin?.write(inputJson);
      child.stdin?.end();
    });
  }
}
