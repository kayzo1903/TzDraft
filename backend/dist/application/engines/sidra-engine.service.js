"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.SidraEngineService = void 0;
const common_1 = require("@nestjs/common");
const child_process_1 = require("child_process");
const fs_1 = require("fs");
const path = __importStar(require("path"));
const official_engine_1 = require("@tzdraft/official-engine");
const cake_engine_1 = require("@tzdraft/cake-engine");
const sidra_mapper_1 = require("./sidra-mapper");
let SidraEngineService = class SidraEngineService {
    async getMove(request) {
        console.log('[SiDra] === Move Request ===');
        console.log('[SiDra] Current Player:', request.currentPlayer);
        console.log('[SiDra] Move Count:', request.moveCount);
        console.log('[SiDra] Pieces Count:', request.pieces.length);
        try {
            const sidraPayload = sidra_mapper_1.SidraBoardMapper.toSidraRequest(request);
            console.log('[SiDra] Sending transformed payload to CLI...');
            const { stdout } = await this.executeSidraCli(sidraPayload);
            console.log('[SiDra] CLI Raw Output:', stdout);
            const jsonStart = stdout.lastIndexOf('{');
            const jsonEnd = stdout.lastIndexOf('}');
            let parsed;
            if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
                const jsonStr = stdout.substring(jsonStart, jsonEnd + 1);
                try {
                    parsed = JSON.parse(jsonStr);
                }
                catch (e) {
                    console.error('[SiDra] JSON Parse Error on substring:', jsonStr);
                    throw e;
                }
            }
            else {
                console.error('[SiDra] No JSON found in output:', stdout);
                throw new Error('No JSON found in CLI output');
            }
            if (parsed &&
                typeof parsed.from === 'number' &&
                typeof parsed.to === 'number') {
                if (parsed.from < 1 || parsed.to < 1) {
                    console.log('[SiDra] ❌ Invalid move detected (from/to < 1)');
                    return null;
                }
                console.log(`[SiDra] ✅ Valid move: ${parsed.from} -> ${parsed.to}`);
                console.log('[SiDra] Captured:', parsed.capturedSquares);
                const sidraMapped = sidra_mapper_1.SidraBoardMapper.fromSidraResponse(parsed, request);
                const normalized = this.normalizeToOfficialMove(request, sidraMapped);
                if (!normalized) {
                    console.warn('[SiDra] Move rejected by official rules. Falling back.');
                    return this.fallbackOfficialMove(request);
                }
                return normalized;
            }
            return null;
        }
        catch (e) {
            const logPath = path.resolve(process.cwd(), 'sidra-debug.log');
            const debugInfo = `
Timestamp: ${new Date().toISOString()}
Error: ${e instanceof Error ? e.message : String(e)}
Stack: ${e instanceof Error ? e.stack : ''}
`;
            try {
                (0, fs_1.appendFileSync)(logPath, debugInfo);
            }
            catch (err) { }
            console.error('[SiDra] Error executing move:', e);
            return null;
        }
    }
    normalizeToOfficialMove(request, move) {
        const board = new cake_engine_1.BoardState(request.pieces.map((p) => new cake_engine_1.Piece(p.type, p.color, new cake_engine_1.Position(p.position))));
        const legalMoves = official_engine_1.OfficialEngine.generateLegalMoves(board, request.currentPlayer, request.moveCount);
        const match = legalMoves.find((m) => m.from.value === move.from && m.to.value === move.to);
        if (!match)
            return null;
        return {
            from: match.from.value,
            to: match.to.value,
            capturedSquares: match.capturedSquares.map((p) => p.value),
            isPromotion: match.isPromotion,
        };
    }
    fallbackOfficialMove(request) {
        const board = new cake_engine_1.BoardState(request.pieces.map((p) => new cake_engine_1.Piece(p.type, p.color, new cake_engine_1.Position(p.position))));
        const legalMoves = official_engine_1.OfficialEngine.generateLegalMoves(board, request.currentPlayer, request.moveCount);
        if (legalMoves.length === 0)
            return null;
        const chosen = legalMoves[Math.floor(Math.random() * legalMoves.length)];
        return {
            from: chosen.from.value,
            to: chosen.to.value,
            capturedSquares: chosen.capturedSquares.map((p) => p.value),
            isPromotion: chosen.isPromotion,
        };
    }
    executeSidraCli(payload) {
        return new Promise((resolve, reject) => {
            let cliPath = process.env.SIDRA_CLI_PATH;
            if (!cliPath) {
                const isWin = process.platform === 'win32';
                const binName = isWin ? 'sidra-cli.exe' : 'sidra';
                const binDir = isWin ? 'engines/sidra/bin' : 'engines/sidra/bin';
                const localPath = path.resolve(process.cwd(), `../${binDir}/${binName}`);
                const rootPath = path.resolve(process.cwd(), `${binDir}/${binName}`);
                if ((0, fs_1.existsSync)(localPath)) {
                    cliPath = localPath;
                }
                else if ((0, fs_1.existsSync)(rootPath)) {
                    cliPath = rootPath;
                }
                else {
                    const legacyPath = path.resolve(process.cwd(), '../engines/sidra/bin/sidra-cli.exe');
                    if ((0, fs_1.existsSync)(legacyPath)) {
                        cliPath = legacyPath;
                    }
                    else {
                        const errorMsg = `Sidra binary not found. Searched: ${localPath}, ${rootPath}`;
                        console.error('[SiDra]', errorMsg);
                        reject(new Error(errorMsg));
                        return;
                    }
                }
            }
            console.log('[SiDra] Spawning CLI at:', cliPath);
            const child = (0, child_process_1.spawn)(cliPath, [], {
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
                        (0, fs_1.appendFileSync)(logPath, debugInfo);
                    }
                    catch (err) { }
                    reject(new Error(`SiDra CLI exited with code ${code}`));
                }
                else {
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
};
exports.SidraEngineService = SidraEngineService;
exports.SidraEngineService = SidraEngineService = __decorate([
    (0, common_1.Injectable)()
], SidraEngineService);
//# sourceMappingURL=sidra-engine.service.js.map