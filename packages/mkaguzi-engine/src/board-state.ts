import { Piece } from './piece.js';
import { Position } from './position.js';
import { PieceType, PlayerColor, PIECES_PER_PLAYER } from './constants.js';

export class BoardState {
  private readonly pieces: Map<number, Piece>;

  constructor(pieces: Piece[] = []) {
    this.pieces = new Map();
    pieces.forEach((piece) => {
      this.pieces.set(piece.position.value, piece);
    });
  }

  getPieceAt(position: Position): Piece | null {
    return this.pieces.get(position.value) ?? null;
  }

  getPiecesByColor(color: PlayerColor): Piece[] {
    return Array.from(this.pieces.values()).filter((p) => p.color === color);
  }

  getAllPieces(): Piece[] {
    return Array.from(this.pieces.values());
  }

  isOccupied(position: Position): boolean {
    return this.pieces.has(position.value);
  }

  isEmpty(position: Position): boolean {
    return !this.isOccupied(position);
  }

  placePiece(piece: Piece): BoardState {
    return new BoardState([...Array.from(this.pieces.values()), piece]);
  }

  removePiece(position: Position): BoardState {
    return new BoardState(
      Array.from(this.pieces.values()).filter((p) => !p.position.equals(position)),
    );
  }

  movePiece(from: Position, to: Position): BoardState {
    const piece = this.getPieceAt(from);
    if (!piece) throw new Error(`No piece at position ${from.value}`);

    let board = this.removePiece(from);
    const moved = piece.moveTo(to);
    board = board.placePiece(moved.shouldPromote() ? moved.promote() : moved);
    return board;
  }

  countPieces(color: PlayerColor): number {
    return this.getPiecesByColor(color).length;
  }

  clone(): BoardState {
    return new BoardState(this.getAllPieces());
  }

  /**
   * Serialize to the app's PDN FEN convention (WHITE at PDN 1-12, BLACK at PDN 21-32).
   * Side to move is provided as a parameter.
   */
  toFen(sideToMove: PlayerColor): string {
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
  static fromFen(fen: string): BoardState {
    const pieces: Piece[] = [];
    const wMatch = fen.match(/:W([^:]*)/);
    const bMatch = fen.match(/:B([^:]*)/);

    function parseSide(str: string, color: PlayerColor) {
      if (!str) return;
      for (const token of str.split(',')) {
        const t = token.trim();
        if (!t) continue;
        const isKing = t.startsWith('K') || t.startsWith('k');
        const num = parseInt(isKing ? t.slice(1) : t, 10);
        if (num >= 1 && num <= 32) {
          pieces.push(
            new Piece(isKing ? PieceType.KING : PieceType.MAN, color, new Position(num)),
          );
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
  static createInitialBoard(): BoardState {
    const pieces: Piece[] = [];
    for (let i = 1; i <= PIECES_PER_PLAYER; i++) {
      pieces.push(new Piece(PieceType.MAN, PlayerColor.WHITE, new Position(i)));
    }
    for (let i = 21; i <= 32; i++) {
      pieces.push(new Piece(PieceType.MAN, PlayerColor.BLACK, new Position(i)));
    }
    return new BoardState(pieces);
  }

  toString(): string {
    const grid: string[][] = Array(8)
      .fill(null)
      .map(() => Array(8).fill('.'));

    this.getAllPieces().forEach((piece) => {
      const { row, col } = piece.position.toRowCol();
      grid[row][col] = `${piece.color === PlayerColor.WHITE ? 'W' : 'B'}${piece.isKing() ? 'K' : 'M'}`;
    });

    return grid.map((row) => row.join(' ')).join('\n');
  }
}
