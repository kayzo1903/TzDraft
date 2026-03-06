import { Position } from './position.vo';

describe('Position', () => {
  // ─── Constructor ──────────────────────────────────────────────────────────

  describe('constructor', () => {
    it('accepts boundary values 1 and 32', () => {
      expect(new Position(1).value).toBe(1);
      expect(new Position(32).value).toBe(32);
    });

    it('throws for position 0', () => {
      expect(() => new Position(0)).toThrow();
    });

    it('throws for position 33', () => {
      expect(() => new Position(33)).toThrow();
    });
  });

  // ─── toRowCol ─────────────────────────────────────────────────────────────

  describe('toRowCol', () => {
    it('converts pos 1 to (0,1)', () => {
      expect(new Position(1).toRowCol()).toEqual({ row: 0, col: 1 });
    });

    it('converts pos 5 to (1,0)', () => {
      expect(new Position(5).toRowCol()).toEqual({ row: 1, col: 0 });
    });

    it('converts pos 18 to (4,3)', () => {
      // Commonly used "d4" square in tests
      expect(new Position(18).toRowCol()).toEqual({ row: 4, col: 3 });
    });

    it('converts pos 32 to (7,6)', () => {
      expect(new Position(32).toRowCol()).toEqual({ row: 7, col: 6 });
    });
  });

  // ─── fromRowCol ───────────────────────────────────────────────────────────

  describe('fromRowCol', () => {
    it('creates position from row/col', () => {
      expect(Position.fromRowCol(0, 1).value).toBe(1);
      expect(Position.fromRowCol(4, 3).value).toBe(18);
      expect(Position.fromRowCol(7, 6).value).toBe(32);
    });

    it('throws for light squares', () => {
      // (0,0): row+col=0 → light square
      expect(() => Position.fromRowCol(0, 0)).toThrow();
    });

    it('throws for out-of-bounds coordinates', () => {
      expect(() => Position.fromRowCol(-1, 1)).toThrow();
      expect(() => Position.fromRowCol(8, 1)).toThrow();
      expect(() => Position.fromRowCol(0, -1)).toThrow();
      expect(() => Position.fromRowCol(0, 8)).toThrow();
    });

    it('round-trips with toRowCol for all 32 positions', () => {
      for (let pos = 1; pos <= 32; pos++) {
        const p = new Position(pos);
        const { row, col } = p.toRowCol();
        expect(Position.fromRowCol(row, col).value).toBe(pos);
      }
    });
  });

  // ─── equals ───────────────────────────────────────────────────────────────

  describe('equals', () => {
    it('returns true for same value', () => {
      expect(new Position(18).equals(new Position(18))).toBe(true);
    });

    it('returns false for different values', () => {
      expect(new Position(18).equals(new Position(19))).toBe(false);
    });
  });
});
