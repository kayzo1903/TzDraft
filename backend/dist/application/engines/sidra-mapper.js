"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SidraBoardMapper = void 0;
class SidraBoardMapper {
    static toSidraRequest(request) {
        const transformedPieces = request.pieces.map((p) => ({
            ...p,
            position: 33 - p.position,
        }));
        return {
            pieces: transformedPieces,
            currentPlayer: request.currentPlayer,
            moveCount: request.moveCount,
            timeLimitMs: request.timeLimitMs,
        };
    }
    static fromSidraResponse(parsed, originalRequest) {
        const result = {
            from: 33 - parsed.from,
            to: 33 - parsed.to,
            capturedSquares: parsed.capturedSquares.map((s) => 33 - s),
            isPromotion: parsed.isPromotion,
        };
        if (result.capturedSquares.length === 0 &&
            result.from !== result.to &&
            result.from > 0 &&
            result.to > 0) {
            const path = this.findCapturePath(result.from, result.to, originalRequest.pieces, originalRequest.currentPlayer);
            if (path.length > 0) {
                result.capturedSquares = path;
            }
        }
        return result;
    }
    static findCapturePath(startPos, endPos, pieces, playerColor) {
        const board = new Map();
        pieces.forEach((p) => board.set(p.position, p));
        const startPiece = board.get(startPos);
        if (!startPiece)
            return [];
        const stack = [];
        stack.push({ pos: startPos, captured: [] });
        let foundPath = null;
        while (stack.length > 0) {
            const { pos, captured } = stack.pop();
            if (pos === endPos && captured.length > 0) {
                foundPath = captured;
                break;
            }
            if (startPiece.type === 'MAN' &&
                captured.length > 0 &&
                this.isPromotionSquare(pos, playerColor)) {
                continue;
            }
            const jumps = this.getLegalJumps(pos, startPiece, board, playerColor, captured);
            for (const jump of jumps) {
                if (!captured.includes(jump.capturedPiece)) {
                    stack.push({
                        pos: jump.landingPos,
                        captured: [...captured, jump.capturedPiece],
                    });
                }
            }
        }
        return foundPath ?? [];
    }
    static getLegalJumps(fromPos, movingPiece, board, playerColor, ignoredPieces) {
        if (movingPiece.type === 'KING') {
            return this.getKingJumps(fromPos, movingPiece, board, playerColor, ignoredPieces);
        }
        else {
            return this.getManJumps(fromPos, movingPiece, board, playerColor, ignoredPieces);
        }
    }
    static getManJumps(fromPos, movingPiece, board, playerColor, ignoredPieces) {
        const jumps = [];
        const { row, col } = this.getRowCol(fromPos);
        const forward = playerColor === 'WHITE' ? 1 : -1;
        const directions = [
            { r: forward, c: -1 },
            { r: forward, c: 1 },
        ];
        for (const d of directions) {
            const capRow = row + d.r;
            const capCol = col + d.c;
            const landRow = row + d.r * 2;
            const landCol = col + d.c * 2;
            const capPos = this.positionFromRowCol(capRow, capCol);
            const landPos = this.positionFromRowCol(landRow, landCol);
            if (capPos && landPos) {
                const capPiece = board.get(capPos);
                const landPiece = board.get(landPos);
                const isValidCap = capPiece &&
                    capPiece.color !== playerColor &&
                    !ignoredPieces.includes(capPos);
                let isLandingEmpty = !landPiece;
                if (landPiece && ignoredPieces.includes(landPos)) {
                    isLandingEmpty = true;
                }
                if (isValidCap && isLandingEmpty) {
                    jumps.push({ landingPos: landPos, capturedPiece: capPos });
                }
            }
        }
        return jumps;
    }
    static getKingJumps(fromPos, movingPiece, board, playerColor, ignoredPieces) {
        const jumps = [];
        const { row, col } = this.getRowCol(fromPos);
        const directions = [
            { r: -1, c: -1 },
            { r: -1, c: 1 },
            { r: 1, c: -1 },
            { r: 1, c: 1 },
        ];
        for (const d of directions) {
            let r = row + d.r;
            let c = col + d.c;
            let foundOpponent = false;
            let capturedPos = -1;
            while (true) {
                const pos = this.positionFromRowCol(r, c);
                if (!pos)
                    break;
                const piece = board.get(pos);
                if (foundOpponent) {
                    if (piece && !ignoredPieces.includes(pos)) {
                        break;
                    }
                    else {
                        if (!piece) {
                            jumps.push({ landingPos: pos, capturedPiece: capturedPos });
                        }
                    }
                }
                else {
                    if (piece) {
                        if (piece.color === playerColor) {
                            break;
                        }
                        else if (ignoredPieces.includes(pos)) {
                            break;
                        }
                        else {
                            foundOpponent = true;
                            capturedPos = pos;
                        }
                    }
                }
                r += d.r;
                c += d.c;
            }
        }
        return jumps;
    }
    static getRowCol(val) {
        const row = Math.floor((val - 1) / 4);
        const col = ((val - 1) % 4) * 2 + ((row + 1) % 2);
        return { row, col };
    }
    static positionFromRowCol(row, col) {
        if (row < 0 || row > 7 || col < 0 || col > 7)
            return null;
        if ((row + col) % 2 === 0)
            return null;
        return row * 4 + Math.floor(col / 2) + 1;
    }
    static isPromotionSquare(pos, playerColor) {
        const { row } = this.getRowCol(pos);
        return playerColor === 'WHITE' ? row === 7 : row === 0;
    }
}
exports.SidraBoardMapper = SidraBoardMapper;
//# sourceMappingURL=sidra-mapper.js.map