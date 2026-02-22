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
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EgtbService = void 0;
const common_1 = require("@nestjs/common");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const zlib_1 = require("zlib");
const board_state_vo_1 = require("../../domain/game/value-objects/board-state.vo");
const piece_vo_1 = require("../../domain/game/value-objects/piece.vo");
const position_vo_1 = require("../../domain/game/value-objects/position.vo");
const game_constants_1 = require("../../shared/constants/game.constants");
const WDL_LOSS = 0;
const WDL_DRAW = 1;
const WDL_WIN = 2;
function buildNcr() {
    const C = Array.from({ length: 33 }, () => new Array(33).fill(0));
    for (let n = 0; n <= 32; n++) {
        C[n][0] = 1;
        for (let k = 1; k <= n; k++) {
            C[n][k] = C[n - 1][k - 1] + C[n - 1][k];
        }
    }
    return C;
}
const NCR = buildNcr();
function cakeToEgtb(cakeSq) {
    const row = Math.floor((cakeSq - 1) / 4);
    const col = ((cakeSq - 1) % 4) * 2 + ((row + 1) % 2);
    return row * 4 + Math.floor(col / 2);
}
let EgtbService = class EgtbService {
    MAX_PIECES = 6;
    MAX_CACHE = 128;
    cache = new Map();
    dbPath;
    constructor() {
        const candidates = [
            path.resolve(process.cwd(), '../games-db/Russian'),
            path.resolve(process.cwd(), 'games-db/Russian'),
        ];
        this.dbPath = candidates.find((p) => fs.existsSync(p)) ?? candidates[0];
        console.log(`[EGTB] Database path: ${this.dbPath}`);
    }
    async getBestMove(pieces, sideToMove, moveCount) {
        if (pieces.some((p) => p.type === 'MAN'))
            return null;
        if (pieces.length > this.MAX_PIECES || pieces.length < 2)
            return null;
        const hasWhite = pieces.some((p) => p.color === 'WHITE');
        const hasBlack = pieces.some((p) => p.color === 'BLACK');
        if (!hasWhite || !hasBlack)
            return null;
        const board = this.buildBoard(pieces);
        const color = sideToMove === 'WHITE' ? game_constants_1.PlayerColor.WHITE : game_constants_1.PlayerColor.BLACK;
        const { OfficialEngine } = require('@tzdraft/official-engine');
        const legalMoves = OfficialEngine.generateLegalMoves(board, color, moveCount);
        if (legalMoves.length === 0)
            return null;
        const oppSide = sideToMove === 'WHITE' ? 'BLACK' : 'WHITE';
        let bestScore = -1;
        let bestMove = null;
        for (const move of legalMoves) {
            const nextPieces = this.applyMove(pieces, move);
            const oppWdl = this.lookupWdl(nextPieces, oppSide);
            let score;
            if (oppWdl === WDL_LOSS)
                score = 2;
            else if (oppWdl === WDL_DRAW)
                score = 1;
            else if (oppWdl === WDL_WIN)
                score = 0;
            else
                score = 1;
            if (score > bestScore) {
                bestScore = score;
                bestMove = {
                    from: move.from.value,
                    to: move.to.value,
                    capturedSquares: move.capturedSquares.map((p) => p.value),
                    isPromotion: move.isPromotion,
                };
            }
        }
        if (bestMove) {
            console.log(`[EGTB] Hit (${pieces.length}p, side=${sideToMove}): ${bestMove.from}→${bestMove.to} score=${bestScore}`);
        }
        return bestMove;
    }
    lookupWdl(pieces, sideToMove) {
        if (pieces.some((p) => p.type === 'MAN'))
            return WDL_DRAW;
        if (pieces.length > this.MAX_PIECES || pieces.length < 2)
            return WDL_DRAW;
        const hasW = pieces.some((p) => p.color === 'WHITE');
        const hasB = pieces.some((p) => p.color === 'BLACK');
        if (!hasW || !hasB)
            return WDL_DRAW;
        try {
            const { filePath, posIndex } = this.resolvePosition(pieces, sideToMove);
            const table = this.loadTable(filePath);
            if (!table)
                return WDL_DRAW;
            const byteIdx = Math.floor(posIndex / 4);
            const bitShift = (posIndex % 4) * 2;
            if (byteIdx >= table.length)
                return WDL_DRAW;
            return (table[byteIdx] >> bitShift) & 0b11;
        }
        catch {
            return WDL_DRAW;
        }
    }
    resolvePosition(pieces, sideToMove) {
        const wm = pieces.filter((p) => p.color === 'WHITE' && p.type === 'MAN').length;
        const bm = pieces.filter((p) => p.color === 'BLACK' && p.type === 'MAN').length;
        const wk = pieces.filter((p) => p.color === 'WHITE' && p.type === 'KING').length;
        const bk = pieces.filter((p) => p.color === 'BLACK' && p.type === 'KING').length;
        const n = wm + bm + wk + bk;
        const config = `${wm}${bm}${wk}${bk}`.padStart(4, '0');
        const sideIdx = sideToMove === 'WHITE' ? 1 : 2;
        const globalIdx = this.computePositionIndex(pieces, sideToMove);
        const CHUNK_SIZE = 65536;
        const chunkIdx = Math.floor(globalIdx / CHUNK_SIZE);
        const posIndex = globalIdx % CHUNK_SIZE;
        const folder = n <= 4 ? 'MTW' : 'WDL';
        const fileName = `${n}-${config}-${sideIdx}-${chunkIdx}`;
        const filePath = path.join(this.dbPath, folder, fileName);
        return { filePath, posIndex };
    }
    loadTable(filePath) {
        if (this.cache.has(filePath)) {
            return this.cache.get(filePath) ?? null;
        }
        if (this.cache.size >= this.MAX_CACHE) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
        if (!fs.existsSync(filePath)) {
            this.cache.set(filePath, null);
            return null;
        }
        try {
            const raw = fs.readFileSync(filePath);
            const payload = raw.slice(16);
            const isZlib = payload.length >= 2 && payload[0] === 0x78;
            const table = isZlib ? Buffer.from((0, zlib_1.inflateSync)(payload)) : payload;
            this.cache.set(filePath, table);
            console.log(`[EGTB] Loaded table: ${path.basename(filePath)} (${table.length} B)`);
            return table;
        }
        catch (e) {
            console.warn(`[EGTB] Failed to load ${filePath}:`, e);
            this.cache.set(filePath, null);
            return null;
        }
    }
    computePositionIndex(pieces, _sideToMove) {
        const wkSqs = pieces
            .filter((p) => p.color === 'WHITE' && p.type === 'KING')
            .map((p) => cakeToEgtb(p.position))
            .sort((a, b) => a - b);
        const bkSqs = pieces
            .filter((p) => p.color === 'BLACK' && p.type === 'KING')
            .map((p) => cakeToEgtb(p.position))
            .sort((a, b) => a - b);
        const wkRank = this.combinatorialRank(wkSqs, 32);
        const used = new Set(wkSqs);
        const avail = Array.from({ length: 32 }, (_, i) => i).filter((s) => !used.has(s));
        const bkMapped = bkSqs.map((s) => avail.indexOf(s)).sort((a, b) => a - b);
        const bkRank = this.combinatorialRank(bkMapped, avail.length);
        const bkBase = NCR[32 - wkSqs.length][bkSqs.length];
        return wkRank * bkBase + bkRank;
    }
    combinatorialRank(sortedSqs, _n) {
        let rank = 0;
        for (let i = 0; i < sortedSqs.length; i++) {
            rank += NCR[sortedSqs[i]][i + 1];
        }
        return rank;
    }
    buildBoard(pieces) {
        return new board_state_vo_1.BoardState(pieces.map((p) => new piece_vo_1.Piece(p.type, p.color, new position_vo_1.Position(p.position))));
    }
    applyMove(pieces, move) {
        const capturedSet = new Set(move.capturedSquares.map((p) => p.value));
        return pieces
            .filter((p) => !capturedSet.has(p.position))
            .map((p) => p.position === move.from.value
            ? {
                ...p,
                position: move.to.value,
                type: move.isPromotion ? 'KING' : p.type,
            }
            : p);
    }
};
exports.EgtbService = EgtbService;
exports.EgtbService = EgtbService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], EgtbService);
//# sourceMappingURL=egtb.service.js.map