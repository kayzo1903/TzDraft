import { Piece } from './piece.js';
import { Position } from './position.js';
import { PieceType, PlayerColor, PIECES_PER_PLAYER } from './constants.js';
export class BoardState {
    constructor(pieces = []) {
        this.pieces = new Map();
        pieces.forEach((piece) => {
            this.pieces.set(piece.position.value, piece);
        });
    }
    getPieceAt(position) {
        return this.pieces.get(position.value) ?? null;
    }
    getPiecesByColor(color) {
        return Array.from(this.pieces.values()).filter((p) => p.color === color);
    }
    getAllPieces() {
        return Array.from(this.pieces.values());
    }
    isOccupied(position) {
        return this.pieces.has(position.value);
    }
    isEmpty(position) {
        return !this.isOccupied(position);
    }
    placePiece(piece) {
        return new BoardState([...Array.from(this.pieces.values()), piece]);
    }
    removePiece(position) {
        return new BoardState(Array.from(this.pieces.values()).filter((p) => !p.position.equals(position)));
    }
    movePiece(from, to) {
        const piece = this.getPieceAt(from);
        if (!piece)
            throw new Error(`No piece at position ${from.value}`);
        let board = this.removePiece(from);
        const moved = piece.moveTo(to);
        board = board.placePiece(moved.shouldPromote() ? moved.promote() : moved);
        return board;
    }
    countPieces(color) {
        return this.getPiecesByColor(color).length;
    }
    clone() {
        return new BoardState(this.getAllPieces());
    }
    /**
     * Serialize to the app's PDN FEN convention (WHITE at PDN 1-12, BLACK at PDN 21-32).
     * Side to move is provided as a parameter.
     */
    toFen(sideToMove) {
        const stm = sideToMove === PlayerColor.WHITE ? 'W' : 'B';
        const whiteParts = this.getPiecesByColor(PlayerColor.WHITE)
            .map((p) => (p.isKing() ? `K${p.position.value}` : `${p.position.value}`))
            .join(',');
        const blackParts = this.getPiecesByColor(PlayerColor.BLACK)
            .map((p) => (p.isKing() ? `K${p.position.value}` : `${p.position.value}`))
            .join(',');
        return `${stm}:W${whiteParts}:B${blackParts}`;
    }
    /**
     * Create a BoardState by parsing the app's PDN FEN convention.
     * Color labels are preserved as-is (WHITE pieces listed under :W).
     */
    static fromFen(fen) {
        const pieces = [];
        const wMatch = fen.match(/:W([^:]*)/);
        const bMatch = fen.match(/:B([^:]*)/);
        function parseSide(str, color) {
            if (!str)
                return;
            for (const token of str.split(',')) {
                const t = token.trim();
                if (!t)
                    continue;
                const isKing = t.startsWith('K') || t.startsWith('k');
                const num = parseInt(isKing ? t.slice(1) : t, 10);
                if (num >= 1 && num <= 32) {
                    pieces.push(new Piece(isKing ? PieceType.KING : PieceType.MAN, color, new Position(num)));
                }
            }
        }
        parseSide(wMatch?.[1] ?? '', PlayerColor.WHITE);
        parseSide(bMatch?.[1] ?? '', PlayerColor.BLACK);
        return new BoardState(pieces);
    }
    /**
     * Standard starting position in the app convention: WHITE at 1-12, BLACK at 21-32.
     */
    static createInitialBoard() {
        const pieces = [];
        for (let i = 1; i <= PIECES_PER_PLAYER; i++) {
            pieces.push(new Piece(PieceType.MAN, PlayerColor.WHITE, new Position(i)));
        }
        for (let i = 21; i <= 32; i++) {
            pieces.push(new Piece(PieceType.MAN, PlayerColor.BLACK, new Position(i)));
        }
        return new BoardState(pieces);
    }
    toString() {
        const grid = Array(8)
            .fill(null)
            .map(() => Array(8).fill('.'));
        this.getAllPieces().forEach((piece) => {
            const { row, col } = piece.position.toRowCol();
            grid[row][col] = `${piece.color === PlayerColor.WHITE ? 'W' : 'B'}${piece.isKing() ? 'K' : 'M'}`;
        });
        return grid.map((row) => row.join(' ')).join('\n');
    }
}
//# sourceMappingURL=board-state.js.map