import { Piece } from './piece.vo';
import { Position } from './position.vo';
import {
  PieceType,
  PlayerColor,
} from '../../../shared/constants/game.constants';

describe('Piece', () => {
  const pos18 = new Position(18);
  const pos29 = new Position(29); // row 7 — WHITE promotion row
  const pos1 = new Position(1); // row 0 — BLACK promotion row

  // ─── Type predicates ──────────────────────────────────────────────────────

  describe('isKing / isMan', () => {
    it('isMan returns true for MAN pieces', () => {
      const p = new Piece(PieceType.MAN, PlayerColor.WHITE, pos18);
      expect(p.isMan()).toBe(true);
      expect(p.isKing()).toBe(false);
    });

    it('isKing returns true for KING pieces', () => {
      const k = new Piece(PieceType.KING, PlayerColor.BLACK, pos18);
      expect(k.isKing()).toBe(true);
      expect(k.isMan()).toBe(false);
    });
  });

  // ─── promote ──────────────────────────────────────────────────────────────

  describe('promote', () => {
    it('promotes a man to a king at the same position', () => {
      const man = new Piece(PieceType.MAN, PlayerColor.WHITE, pos18);
      const king = man.promote();
      expect(king.isKing()).toBe(true);
      expect(king.color).toBe(PlayerColor.WHITE);
      expect(king.position.value).toBe(18);
    });

    it('throws when promoting an already-king piece', () => {
      const king = new Piece(PieceType.KING, PlayerColor.WHITE, pos18);
      expect(() => king.promote()).toThrow();
    });
  });

  // ─── moveTo ───────────────────────────────────────────────────────────────

  describe('moveTo', () => {
    it('returns a new piece at the target position with same type and color', () => {
      const p = new Piece(PieceType.MAN, PlayerColor.WHITE, pos18);
      const moved = p.moveTo(new Position(22));
      expect(moved.position.value).toBe(22);
      expect(moved.type).toBe(PieceType.MAN);
      expect(moved.color).toBe(PlayerColor.WHITE);
    });
  });

  // ─── shouldPromote ────────────────────────────────────────────────────────

  describe('shouldPromote', () => {
    it('returns true for a WHITE man on row 7', () => {
      // pos 29 is (7,0) — WHITE promotion row
      const p = new Piece(PieceType.MAN, PlayerColor.WHITE, pos29);
      expect(p.shouldPromote()).toBe(true);
    });

    it('returns false for a WHITE man not on row 7', () => {
      const p = new Piece(PieceType.MAN, PlayerColor.WHITE, pos18);
      expect(p.shouldPromote()).toBe(false);
    });

    it('returns true for a BLACK man on row 0', () => {
      // pos 1 is (0,1) — BLACK promotion row
      const p = new Piece(PieceType.MAN, PlayerColor.BLACK, pos1);
      expect(p.shouldPromote()).toBe(true);
    });

    it('returns false for a king regardless of row', () => {
      const k = new Piece(PieceType.KING, PlayerColor.WHITE, pos29);
      expect(k.shouldPromote()).toBe(false);
    });
  });

  // ─── equals ───────────────────────────────────────────────────────────────

  describe('equals', () => {
    it('returns true for identical pieces', () => {
      const a = new Piece(PieceType.MAN, PlayerColor.WHITE, pos18);
      const b = new Piece(PieceType.MAN, PlayerColor.WHITE, new Position(18));
      expect(a.equals(b)).toBe(true);
    });

    it('returns false for different type', () => {
      const man = new Piece(PieceType.MAN, PlayerColor.WHITE, pos18);
      const king = new Piece(PieceType.KING, PlayerColor.WHITE, pos18);
      expect(man.equals(king)).toBe(false);
    });

    it('returns false for different color', () => {
      const w = new Piece(PieceType.MAN, PlayerColor.WHITE, pos18);
      const b = new Piece(PieceType.MAN, PlayerColor.BLACK, pos18);
      expect(w.equals(b)).toBe(false);
    });

    it('returns false for different position', () => {
      const a = new Piece(PieceType.MAN, PlayerColor.WHITE, pos18);
      const b = new Piece(PieceType.MAN, PlayerColor.WHITE, new Position(22));
      expect(a.equals(b)).toBe(false);
    });
  });
});
