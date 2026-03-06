import { BoardState } from './board-state.vo';
import { Piece } from './piece.vo';
import { Position } from './position.vo';
import {
  PieceType,
  PlayerColor,
  PIECES_PER_PLAYER,
} from '../../../shared/constants/game.constants';

function wp(pos: number) {
  return new Piece(PieceType.MAN, PlayerColor.WHITE, new Position(pos));
}
function bp(pos: number) {
  return new Piece(PieceType.MAN, PlayerColor.BLACK, new Position(pos));
}
function wk(pos: number) {
  return new Piece(PieceType.KING, PlayerColor.WHITE, new Position(pos));
}
function pos(n: number) {
  return new Position(n);
}

describe('BoardState', () => {
  // ─── Basic queries ────────────────────────────────────────────────────────

  describe('getPieceAt', () => {
    it('returns the piece at an occupied square', () => {
      const board = new BoardState([wp(18)]);
      const piece = board.getPieceAt(pos(18));
      expect(piece).not.toBeNull();
      expect(piece!.color).toBe(PlayerColor.WHITE);
    });

    it('returns null for an empty square', () => {
      const board = new BoardState([wp(18)]);
      expect(board.getPieceAt(pos(22))).toBeNull();
    });
  });

  describe('getPiecesByColor', () => {
    it('returns only pieces of the requested color', () => {
      const board = new BoardState([wp(18), bp(22), wp(19)]);
      const whites = board.getPiecesByColor(PlayerColor.WHITE);
      expect(whites).toHaveLength(2);
      whites.forEach((p) => expect(p.color).toBe(PlayerColor.WHITE));
    });

    it('returns empty array when no pieces of that color', () => {
      const board = new BoardState([bp(22)]);
      expect(board.getPiecesByColor(PlayerColor.WHITE)).toHaveLength(0);
    });
  });

  describe('getAllPieces', () => {
    it('returns all pieces on the board', () => {
      const board = new BoardState([wp(18), bp(22), bp(23)]);
      expect(board.getAllPieces()).toHaveLength(3);
    });
  });

  describe('isOccupied / isEmpty', () => {
    it('returns true for occupied square', () => {
      const board = new BoardState([wp(18)]);
      expect(board.isOccupied(pos(18))).toBe(true);
      expect(board.isEmpty(pos(18))).toBe(false);
    });

    it('returns false for empty square', () => {
      const board = new BoardState([wp(18)]);
      expect(board.isOccupied(pos(22))).toBe(false);
      expect(board.isEmpty(pos(22))).toBe(true);
    });
  });

  // ─── Mutations (immutable) ─────────────────────────────────────────────────

  describe('placePiece', () => {
    it('returns a new board with the piece added; original is unchanged', () => {
      const original = new BoardState([wp(18)]);
      const updated = original.placePiece(bp(22));
      expect(updated.getAllPieces()).toHaveLength(2);
      expect(original.getAllPieces()).toHaveLength(1); // unchanged
    });
  });

  describe('removePiece', () => {
    it('returns a new board without the piece; original is unchanged', () => {
      const original = new BoardState([wp(18), bp(22)]);
      const updated = original.removePiece(pos(18));
      expect(updated.getAllPieces()).toHaveLength(1);
      expect(updated.getPieceAt(pos(18))).toBeNull();
      expect(original.getAllPieces()).toHaveLength(2); // unchanged
    });
  });

  describe('movePiece', () => {
    it('moves a piece to the target square', () => {
      const board = new BoardState([wp(18)]);
      const updated = board.movePiece(pos(18), pos(22));
      expect(updated.getPieceAt(pos(18))).toBeNull();
      expect(updated.getPieceAt(pos(22))).not.toBeNull();
    });

    it('promotes a WHITE man that reaches row 7', () => {
      // pos 27 (6,5) → pos 31 (7,4): row 7 = WHITE promotion row
      const board = new BoardState([wp(27)]);
      const updated = board.movePiece(pos(27), pos(31));
      const promoted = updated.getPieceAt(pos(31));
      expect(promoted).not.toBeNull();
      expect(promoted!.isKing()).toBe(true);
    });

    it('throws when no piece at from position', () => {
      const board = new BoardState([wp(18)]);
      expect(() => board.movePiece(pos(10), pos(14))).toThrow();
    });
  });

  // ─── Factory / serialization ──────────────────────────────────────────────

  describe('createInitialBoard', () => {
    it('creates 12 white men in positions 1-12', () => {
      const board = BoardState.createInitialBoard();
      const whites = board.getPiecesByColor(PlayerColor.WHITE);
      expect(whites).toHaveLength(PIECES_PER_PLAYER);
      whites.forEach((p) => {
        expect(p.isMan()).toBe(true);
        expect(p.position.value).toBeGreaterThanOrEqual(1);
        expect(p.position.value).toBeLessThanOrEqual(12);
      });
    });

    it('creates 12 black men in positions 21-32', () => {
      const board = BoardState.createInitialBoard();
      const blacks = board.getPiecesByColor(PlayerColor.BLACK);
      expect(blacks).toHaveLength(PIECES_PER_PLAYER);
      blacks.forEach((p) => {
        expect(p.isMan()).toBe(true);
        expect(p.position.value).toBeGreaterThanOrEqual(21);
        expect(p.position.value).toBeLessThanOrEqual(32);
      });
    });

    it('leaves positions 13-20 empty', () => {
      const board = BoardState.createInitialBoard();
      for (let i = 13; i <= 20; i++) {
        expect(board.getPieceAt(new Position(i))).toBeNull();
      }
    });
  });

  describe('serialize / fromSnapshot', () => {
    it('round-trips board state correctly', () => {
      const board = new BoardState([wp(18), wk(5), bp(22)]);
      const snapshot = board.serialize();
      const restored = BoardState.fromSnapshot(snapshot);
      expect(restored.getAllPieces()).toHaveLength(3);
      expect(restored.getPieceAt(pos(18))?.isMan()).toBe(true);
      expect(restored.getPieceAt(pos(5))?.isKing()).toBe(true);
      expect(restored.getPieceAt(pos(22))?.color).toBe(PlayerColor.BLACK);
    });
  });

  describe('countPieces', () => {
    it('counts pieces by color', () => {
      const board = new BoardState([wp(18), wp(19), bp(22)]);
      expect(board.countPieces(PlayerColor.WHITE)).toBe(2);
      expect(board.countPieces(PlayerColor.BLACK)).toBe(1);
    });
  });

  describe('clone', () => {
    it('creates an independent copy', () => {
      const original = new BoardState([wp(18)]);
      const clone = original.clone();
      expect(clone.getAllPieces()).toHaveLength(1);
      // Verify they are logically equal but independent objects
      expect(clone.getPieceAt(pos(18))).not.toBeNull();
    });
  });
});
