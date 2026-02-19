import { Injectable } from '@nestjs/common';
import { spawn } from 'child_process';
import { existsSync, appendFileSync } from 'fs';
import * as path from 'path';
import { OfficialEngine } from '@tzdraft/official-engine';
import {
  BoardState,
  Piece,
  PieceType,
  PlayerColor,
  Position,
} from '@tzdraft/cake-engine';
import { SidraMoveRequest, SidraMoveResponse, SidraPayload } from './sidra-types';
import { SidraBoardMapper } from './sidra-mapper';

/**
 * KallistoEngineService
 *
 * Integrates the Kallisto_4.dll engine via the kallisto-sidecar.exe subprocess.
 * Kallisto uses the same EI coordinate system as SiDra (rank 8 = sq 1), so
 * the same SidraBoardMapper (33 - position transform) applies here as well.
 *
 * Bot level routing (used by BotMoveUseCase):
 *   Levels 1–5  → Frontend minimax (CAKE, handled client-side in local games)
 *   Levels 6–8  → This service (Kallisto_4.dll, server-side)
 *   Time budget: level 6 = 1 s, level 7 = 3 s, level 8 = 8 s
 */
@Injectable()
export class KallistoEngineService {
  private readonly LOG_FILE = 'kallisto-debug.log';

  /** Returns the appropriate time limit in ms for a given bot level. */
  static timeLimitForLevel(level: number): number {
    if (level <= 6) return 1000;
    if (level === 7) return 3000;
    return 8000; // level 8+
  }

  async getMove(request: SidraMoveRequest): Promise<SidraMoveResponse | null> {
    console.log('[Kallisto] === Move Request ===');
    console.log('[Kallisto] Current Player:', request.currentPlayer);
    console.log('[Kallisto] Move Count:', request.moveCount);
    console.log('[Kallisto] Pieces:', request.pieces.length);

    try {
      // Reuse the same 33-position transform as SiDra (same EI coordinate system)
      const payload = SidraBoardMapper.toSidraRequest(request);

      console.log('[Kallisto] Spawning sidecar…');
      const { stdout } = await this.executeSidecar(payload);
      console.log('[Kallisto] Raw output:', stdout);

      // Extract the last JSON object from output
      const jsonStart = stdout.lastIndexOf('{');
      const jsonEnd = stdout.lastIndexOf('}');

      if (jsonStart === -1 || jsonEnd === -1 || jsonEnd <= jsonStart) {
        console.error('[Kallisto] No JSON in output:', stdout);
        throw new Error('No JSON found in kallisto-sidecar output');
      }

      const jsonStr = stdout.substring(jsonStart, jsonEnd + 1);
      const parsed = JSON.parse(jsonStr) as SidraMoveResponse;

      if (
        !parsed ||
        typeof parsed.from !== 'number' ||
        typeof parsed.to !== 'number'
      ) {
        throw new Error('Invalid JSON structure from kallisto-sidecar');
      }

      if (parsed.from < 1 || parsed.to < 1) {
        console.log('[Kallisto] Engine returned no-move sentinel');
        return this.fallbackOfficialMove(request);
      }

      console.log(`[Kallisto] ✅ Raw move: ${parsed.from} → ${parsed.to}`);

      // Transform back from EI coords → CAKE coords, then validate vs TZD rules
      const cakeMove = SidraBoardMapper.fromSidraResponse(parsed, request);
      const normalized = this.normalizeToOfficialMove(request, cakeMove);

      if (!normalized) {
        console.warn('[Kallisto] Move rejected by TZD rules. Falling back.');
        return this.fallbackOfficialMove(request);
      }

      return normalized;
    } catch (e) {
      this.appendDebugLog(e);
      console.error('[Kallisto] Error:', e);
      return null;
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Private helpers
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Match the engine's from→to against the OfficialEngine legal moves.
   * If Kallisto continues a capture past a TZD promotion square (Article 4.10),
   * the `to` will differ from the TZD-legal destination and no match is found.
   * In that case we return null and the caller falls back.
   */
  private normalizeToOfficialMove(
    request: SidraMoveRequest,
    move: SidraMoveResponse,
  ): SidraMoveResponse | null {
    const board = this.buildBoard(request);
    const legalMoves = OfficialEngine.generateLegalMoves(
      board,
      request.currentPlayer as unknown as PlayerColor,
      request.moveCount,
    );

    const match = legalMoves.find(
      (m) => m.from.value === move.from && m.to.value === move.to,
    );
    if (!match) return null;

    return {
      from: match.from.value,
      to: match.to.value,
      capturedSquares: match.capturedSquares.map((p: Position) => p.value),
      isPromotion: match.isPromotion,
    };
  }

  private fallbackOfficialMove(
    request: SidraMoveRequest,
  ): SidraMoveResponse | null {
    const board = this.buildBoard(request);
    const legalMoves = OfficialEngine.generateLegalMoves(
      board,
      request.currentPlayer as unknown as PlayerColor,
      request.moveCount,
    );
    if (legalMoves.length === 0) return null;

    const chosen = legalMoves[Math.floor(Math.random() * legalMoves.length)];
    return {
      from: chosen.from.value,
      to: chosen.to.value,
      capturedSquares: chosen.capturedSquares.map((p: Position) => p.value),
      isPromotion: chosen.isPromotion,
    };
  }

  private buildBoard(request: SidraMoveRequest): BoardState {
    return new BoardState(
      request.pieces.map(
        (p) =>
          new Piece(
            p.type as unknown as PieceType,
            p.color as unknown as PlayerColor,
            new Position(p.position),
          ),
      ),
    );
  }

  private executeSidecar(
    payload: SidraPayload,
  ): Promise<{ stdout: string; stderr: string }> {
    return new Promise((resolve, reject) => {
      let cliPath = process.env.KALLISTO_CLI_PATH;

      if (!cliPath) {
        const isWin = process.platform === 'win32';
        const binName = isWin ? 'kallisto-sidecar.exe' : 'kallisto-sidecar';
        const binDir = 'engines/kallisto/bin';

        const localPath = path.resolve(process.cwd(), `../${binDir}/${binName}`);
        const rootPath = path.resolve(process.cwd(), `${binDir}/${binName}`);

        if (existsSync(localPath)) {
          cliPath = localPath;
        } else if (existsSync(rootPath)) {
          cliPath = rootPath;
        } else {
          const legacyPath = path.resolve(
            process.cwd(),
            `../engines/kallisto/bin/${binName}`,
          );
          if (existsSync(legacyPath)) {
            cliPath = legacyPath;
          } else {
            const err = `Kallisto sidecar not found. Searched: ${localPath}, ${rootPath}`;
            console.error('[Kallisto]', err);
            reject(new Error(err));
            return;
          }
        }
      }

      console.log('[Kallisto] Spawning sidecar at:', cliPath);

      const child = spawn(cliPath, [], {
        cwd: path.dirname(cliPath),
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => (stdout += data.toString()));
      child.stderr.on('data', (data) => (stderr += data.toString()));

      child.on('close', (code) => {
        if (code !== 0) {
          this.appendDebugLog(
            `Exit code ${code}\nStdout: ${stdout}\nStderr: ${stderr}\nPayload: ${JSON.stringify(payload)}`,
          );
          reject(new Error(`kallisto-sidecar exited with code ${code}`));
        } else {
          resolve({ stdout, stderr });
        }
      });

      child.on('error', reject);

      child.stdin.write(JSON.stringify(payload));
      child.stdin.end();
    });
  }

  private appendDebugLog(info: unknown): void {
    const logPath = path.resolve(process.cwd(), this.LOG_FILE);
    const text = `\nTimestamp: ${new Date().toISOString()}\n${
      info instanceof Error ? `Error: ${info.message}\nStack: ${info.stack}` : String(info)
    }\n`;
    try {
      appendFileSync(logPath, text);
    } catch (_) {
      // ignore write errors
    }
  }
}
