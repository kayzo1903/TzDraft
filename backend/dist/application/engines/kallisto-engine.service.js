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
exports.KallistoEngineService = void 0;
const common_1 = require("@nestjs/common");
const child_process_1 = require("child_process");
const fs_1 = require("fs");
const path = __importStar(require("path"));
const official_engine_1 = require("@tzdraft/official-engine");
const cake_engine_1 = require("@tzdraft/cake-engine");
const sidra_mapper_1 = require("./sidra-mapper");
let KallistoEngineService = class KallistoEngineService {
    LOG_FILE = 'kallisto-debug.log';
    static timeLimitForLevel(level) {
        if (level <= 6)
            return 1000;
        if (level === 7)
            return 3000;
        return 8000;
    }
    async getMove(request) {
        console.log('[Kallisto] === Move Request ===');
        console.log('[Kallisto] Current Player:', request.currentPlayer);
        console.log('[Kallisto] Move Count:', request.moveCount);
        console.log('[Kallisto] Pieces:', request.pieces.length);
        try {
            const payload = sidra_mapper_1.SidraBoardMapper.toSidraRequest(request);
            console.log('[Kallisto] Spawning sidecar…');
            const { stdout } = await this.executeSidecar(payload);
            console.log('[Kallisto] Raw output:', stdout);
            const jsonStart = stdout.lastIndexOf('{');
            const jsonEnd = stdout.lastIndexOf('}');
            if (jsonStart === -1 || jsonEnd === -1 || jsonEnd <= jsonStart) {
                console.error('[Kallisto] No JSON in output:', stdout);
                throw new Error('No JSON found in kallisto-sidecar output');
            }
            const jsonStr = stdout.substring(jsonStart, jsonEnd + 1);
            const parsed = JSON.parse(jsonStr);
            if (!parsed ||
                typeof parsed.from !== 'number' ||
                typeof parsed.to !== 'number') {
                throw new Error('Invalid JSON structure from kallisto-sidecar');
            }
            if (parsed.from < 1 || parsed.to < 1) {
                console.log('[Kallisto] Engine returned no-move sentinel');
                return this.fallbackOfficialMove(request);
            }
            console.log(`[Kallisto] ✅ Raw move: ${parsed.from} → ${parsed.to}`);
            const cakeMove = sidra_mapper_1.SidraBoardMapper.fromSidraResponse(parsed, request);
            const normalized = this.normalizeToOfficialMove(request, cakeMove);
            if (!normalized) {
                console.warn('[Kallisto] Move rejected by TZD rules. Falling back.');
                return this.fallbackOfficialMove(request);
            }
            return normalized;
        }
        catch (e) {
            this.appendDebugLog(e);
            console.error('[Kallisto] Error:', e);
            return null;
        }
    }
    normalizeToOfficialMove(request, move) {
        const board = this.buildBoard(request);
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
        const board = this.buildBoard(request);
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
    buildBoard(request) {
        return new cake_engine_1.BoardState(request.pieces.map((p) => new cake_engine_1.Piece(p.type, p.color, new cake_engine_1.Position(p.position))));
    }
    executeSidecar(payload) {
        return new Promise((resolve, reject) => {
            let cliPath = process.env.KALLISTO_CLI_PATH;
            if (!cliPath) {
                const isWin = process.platform === 'win32';
                const binName = isWin ? 'kallisto-sidecar.exe' : 'kallisto-sidecar';
                const binDir = 'engines/kallisto/bin';
                const localPath = path.resolve(process.cwd(), `../${binDir}/${binName}`);
                const rootPath = path.resolve(process.cwd(), `${binDir}/${binName}`);
                if ((0, fs_1.existsSync)(localPath)) {
                    cliPath = localPath;
                }
                else if ((0, fs_1.existsSync)(rootPath)) {
                    cliPath = rootPath;
                }
                else {
                    const legacyPath = path.resolve(process.cwd(), `../engines/kallisto/bin/${binName}`);
                    if ((0, fs_1.existsSync)(legacyPath)) {
                        cliPath = legacyPath;
                    }
                    else {
                        const err = `Kallisto sidecar not found. Searched: ${localPath}, ${rootPath}`;
                        console.error('[Kallisto]', err);
                        reject(new Error(err));
                        return;
                    }
                }
            }
            console.log('[Kallisto] Spawning sidecar at:', cliPath);
            const child = (0, child_process_1.spawn)(cliPath, [], {
                cwd: path.dirname(cliPath),
                stdio: ['pipe', 'pipe', 'pipe'],
            });
            let stdout = '';
            let stderr = '';
            child.stdout.on('data', (data) => (stdout += data.toString()));
            child.stderr.on('data', (data) => (stderr += data.toString()));
            child.on('close', (code) => {
                if (code !== 0) {
                    this.appendDebugLog(`Exit code ${code}\nStdout: ${stdout}\nStderr: ${stderr}\nPayload: ${JSON.stringify(payload)}`);
                    reject(new Error(`kallisto-sidecar exited with code ${code}`));
                }
                else {
                    resolve({ stdout, stderr });
                }
            });
            child.on('error', reject);
            child.stdin.write(JSON.stringify(payload));
            child.stdin.end();
        });
    }
    appendDebugLog(info) {
        const logPath = path.resolve(process.cwd(), this.LOG_FILE);
        const text = `\nTimestamp: ${new Date().toISOString()}\n${info instanceof Error ? `Error: ${info.message}\nStack: ${info.stack}` : String(info)}\n`;
        try {
            (0, fs_1.appendFileSync)(logPath, text);
        }
        catch (_) {
        }
    }
};
exports.KallistoEngineService = KallistoEngineService;
exports.KallistoEngineService = KallistoEngineService = __decorate([
    (0, common_1.Injectable)()
], KallistoEngineService);
//# sourceMappingURL=kallisto-engine.service.js.map