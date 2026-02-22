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
import {
  SidraMoveRequest,
  SidraMoveResponse,
  SidraPayload,
} from './sidra-types';
import { SidraBoardMapper } from './sidra-mapper';

@Injectable()
export class SidraEngineService {
  async getMove(request: SidraMoveRequest): Promise<SidraMoveResponse | null> {
    console.log('[SiDra] === Move Request ===');
    console.log('[SiDra] Current Player:', request.currentPlayer);
    console.log('[SiDra] Move Count:', request.moveCount);
    console.log('[SiDra] Pieces Count:', request.pieces.length);

    try {
      // Use Mapper to transform request
      const sidraPayload = SidraBoardMapper.toSidraRequest(request);

      console.log('[SiDra] Sending transformed payload to CLI...');

      const { stdout } = await this.executeSidraCli(sidraPayload);

      console.log('[SiDra] CLI Raw Output:', stdout);

      // Extract JSON from output
      const jsonStart = stdout.lastIndexOf('{');
      const jsonEnd = stdout.lastIndexOf('}');

      let parsed: SidraMoveResponse;
      if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
        const jsonStr = stdout.substring(jsonStart, jsonEnd + 1);
        try {
          parsed = JSON.parse(jsonStr) as SidraMoveResponse;
        } catch (e) {
          console.error('[SiDra] JSON Parse Error on substring:', jsonStr);
          throw e; // Caught below
        }
      } else {
        console.error('[SiDra] No JSON found in output:', stdout);
        throw new Error('No JSON found in CLI output');
      }

      if (
        parsed &&
        typeof parsed.from === 'number' &&
        typeof parsed.to === 'number'
      ) {
        if (parsed.from < 1 || parsed.to < 1) {
          console.log('[SiDra] ❌ Invalid move detected (from/to < 1)');
          return null;
        }

        console.log(`[SiDra] ✅ Valid move: ${parsed.from} -> ${parsed.to}`);
        console.log('[SiDra] Captured:', parsed.capturedSquares);

        // Transform back
        const sidraMapped = SidraBoardMapper.fromSidraResponse(parsed, request);

        // Normalize/validate against the official TZD rules engine.
        const normalized = this.normalizeToOfficialMove(request, sidraMapped);
        if (!normalized) {
          console.warn(
            '[SiDra] Move rejected by official rules. Falling back.',
          );
          return this.fallbackOfficialMove(request);
        }

        return normalized;
      }

      return null;
    } catch (e) {
      const logPath = path.resolve(process.cwd(), 'sidra-debug.log');
      const debugInfo = `
Timestamp: ${new Date().toISOString()}
Error: ${e instanceof Error ? e.message : String(e)}
Stack: ${e instanceof Error ? e.stack : ''}
`;
      try {
        appendFileSync(logPath, debugInfo);
      } catch (err) {}
      console.error('[SiDra] Error executing move:', e);
      return null;
    }
  }

  private normalizeToOfficialMove(
    request: SidraMoveRequest,
    move: SidraMoveResponse,
  ): SidraMoveResponse | null {
    const board = new BoardState(
      request.pieces.map(
        (p) =>
          new Piece(
            p.type as unknown as PieceType,
            p.color as unknown as PlayerColor,
            new Position(p.position),
          ),
      ),
    );

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
    const board = new BoardState(
      request.pieces.map(
        (p) =>
          new Piece(
            p.type as unknown as PieceType,
            p.color as unknown as PlayerColor,
            new Position(p.position),
          ),
      ),
    );

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

  private executeSidraCli(
    payload: SidraPayload,
  ): Promise<{ stdout: string; stderr: string }> {
    return new Promise((resolve, reject) => {
      let cliPath = process.env.SIDRA_CLI_PATH;

      if (!cliPath) {
        const isWin = process.platform === 'win32';
        const binName = isWin ? 'sidra-cli.exe' : 'sidra';
        const binDir = isWin ? 'engines/sidra/bin' : 'engines/sidra/bin'; // Keep same struct

        // 1. Try relative to CWD (usually backend root)
        const localPath = path.resolve(
          process.cwd(),
          `../${binDir}/${binName}`,
        );

        // 2. Try relative to project root (if CWD is deep)
        const rootPath = path.resolve(process.cwd(), `${binDir}/${binName}`);

        if (existsSync(localPath)) {
          cliPath = localPath;
        } else if (existsSync(rootPath)) {
          cliPath = rootPath;
        } else {
          // 3. Try legacy path for Windows dev (vs/bin/Release?) or fallback
          // logic for existing setup
          const legacyPath = path.resolve(
            process.cwd(),
            '../engines/sidra/bin/sidra-cli.exe',
          );
          if (existsSync(legacyPath)) {
            cliPath = legacyPath;
          } else {
            const errorMsg = `Sidra binary not found. Searched: ${localPath}, ${rootPath}`;
            console.error('[SiDra]', errorMsg);
            reject(new Error(errorMsg));
            return;
          }
        }
      }

      console.log('[SiDra] Spawning CLI at:', cliPath);

      const child = spawn(cliPath, [], {
        cwd: path.dirname(cliPath),
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        if (code !== 0) {
          const logPath = path.resolve(process.cwd(), 'sidra-debug.log');
          const debugInfo = `
Timestamp: ${new Date().toISOString()}
Exit Code: ${code}
Stdout: ${stdout}
Stderr: ${stderr}
Payload: ${JSON.stringify(payload)}
`;
          try {
            appendFileSync(logPath, debugInfo);
          } catch (err) {}
          reject(new Error(`SiDra CLI exited with code ${code}`));
        } else {
          resolve({ stdout, stderr });
        }
      });

      child.on('error', (err) => {
        reject(err);
      });

      child.stdin.write(JSON.stringify(payload));
      child.stdin.end();
    });
  }
}
