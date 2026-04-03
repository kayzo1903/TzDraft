import { CaptureFindingService } from './capture-finding.service';
import { BoardState } from '../value-objects/board-state.vo';
import { Piece } from '../value-objects/piece.vo';
import { Position } from '../value-objects/position.vo';
import {
  PlayerColor,
  PieceType,
} from '../../../shared/constants/game.constants';

// Board coordinate quick-reference (position → row,col):
//   pos 6  → (1,2)   pos 10 → (2,3)   pos 14 → (3,2)
//   pos 15 → (3,4)   pos 18 → (4,3)   pos 19 → (4,5)
//   pos 22 → (5,2)   pos 23 → (5,4)   pos 24 → (5,6)
//   pos 25 → (6,1)   pos 27 → (6,5)   pos 31 → (7,4)
//   pos 32 → (7,6)

function wp(pos: number) {
  return new Piece(PieceType.MAN, PlayerColor.WHITE, new Position(pos));
}
function bp(pos: number) {
  return new Piece(PieceType.MAN, PlayerColor.BLACK, new Position(pos));
}
function wk(pos: number) {
  return new Piece(PieceType.KING, PlayerColor.WHITE, new Position(pos));
}
function bk(pos: number) {
  return new Piece(PieceType.KING, PlayerColor.BLACK, new Position(pos));
}
function board(...pieces: Piece[]) {
  return new BoardState(pieces);
}

describe('CaptureFindingService', () => {
  let service: CaptureFindingService;

  beforeEach(() => {
    service = new CaptureFindingService();
  });

  describe('findAllCaptures', () => {
    it('returns a capture when a man can jump forward', () => {
      // WHITE at 18 (4,3) → jumps BLACK at 22 (5,2) → lands at 25 (6,1)
      const b = board(wp(18), bp(22));
      const captures = service.findAllCaptures(b, PlayerColor.WHITE);
      expect(captures).toHaveLength(1);
      expect(captures[0].from.value).toBe(18);
      expect(captures[0].to.value).toBe(25);
      expect(captures[0].capturedSquares[0].value).toBe(22);
    });

    it('returns empty when no captures are available', () => {
      const b = board(wp(18));
      expect(service.findAllCaptures(b, PlayerColor.WHITE)).toHaveLength(0);
    });

    it('does not allow a man to capture backward (TZD Art 4.6)', () => {
      // BLACK at 18 (4,3) is BEHIND WHITE at 22 (5,2) — backward capture not allowed
      const b = board(wp(22), bp(18));
      expect(service.findAllCaptures(b, PlayerColor.WHITE)).toHaveLength(0);
    });

    it('collects captures from multiple pieces', () => {
      // WHITE at 18 can capture BLACK at 22; WHITE at 6 can capture BLACK at 10
      const b = board(wp(18), bp(22), wp(6), bp(10));
      const captures = service.findAllCaptures(b, PlayerColor.WHITE);
      expect(captures.length).toBeGreaterThanOrEqual(2);
    });

    it('returns black captures when black is the active player', () => {
      // BLACK at 22 (5,2) → dir(-1,+1) → jumps WHITE at 18 (4,3) → lands at 15 (3,4)
      const b = board(bp(22), wp(18));
      const captures = service.findAllCaptures(b, PlayerColor.BLACK);
      expect(captures).toHaveLength(1);
      expect(captures[0].to.value).toBe(15);
      expect(captures[0].capturedSquares[0].value).toBe(18);
    });
  });

  describe('findCapturesForPiece – man captures', () => {
    it('finds a single forward capture', () => {
      const b = board(wp(18), bp(22));
      const captures = service.findCapturesForPiece(b, wp(18));
      expect(captures).toHaveLength(1);
      expect(captures[0].to.value).toBe(25);
      expect(captures[0].capturedSquares).toHaveLength(1);
      expect(captures[0].isPromotion).toBe(false);
    });

    it('returns a complete multi-capture path (Art 4.5 – must continue)', () => {
      // WHITE at 6 (1,2) → jumps BLACK at 10 (2,3) → lands 15 (3,4)
      //   → jumps BLACK at 19 (4,5) → lands 24 (5,6) — no promotion
      const b = board(wp(6), bp(10), bp(19));
      const captures = service.findCapturesForPiece(b, wp(6));
      // Art 4.5: only complete chains are returned; partial single-step path
      // to 15 must NOT appear because the chain can continue.
      expect(captures).toHaveLength(1);
      const [c] = captures;
      expect(c.to.value).toBe(24);
      expect(c.capturedSquares).toHaveLength(2);
      expect(c.capturedSquares[0].value).toBe(10);
      expect(c.capturedSquares[1].value).toBe(19);
      expect(c.isPromotion).toBe(false);
    });

    it('stops the chain on promotion (Art 4.10)', () => {
      // WHITE at 15 (3,4) → jumps BLACK at 19 (4,5) → lands 24 (5,6)
      //   → jumps BLACK at 27 (6,5) → lands 31 (7,4) → PROMOTION, chain ends
      const b = board(wp(15), bp(19), bp(27));
      const captures = service.findCapturesForPiece(b, wp(15));
      expect(captures).toHaveLength(1);
      const [c] = captures;
      expect(c.to.value).toBe(31);
      expect(c.capturedSquares).toHaveLength(2);
      expect(c.capturedSquares[0].value).toBe(19);
      expect(c.capturedSquares[1].value).toBe(27);
      expect(c.isPromotion).toBe(true);
    });

    it('returns empty when the piece has no opponent to capture', () => {
      const b = board(wp(18));
      expect(service.findCapturesForPiece(b, wp(18))).toHaveLength(0);
    });

    it('does not capture own pieces', () => {
      // WHITE at 18, another WHITE at 22 (potential jump square) — no capture
      const b = board(wp(18), wp(22));
      expect(service.findCapturesForPiece(b, wp(18))).toHaveLength(0);
    });

    it('does not capture the same piece twice in one chain', () => {
      // Verify the capturedSoFar guard: build a board where a naive recursion
      // might try to re-jump an already-captured piece.
      // WHITE at 18, BLACK at 22 only — after jumping 22, 22 is gone; no further
      // captures, so the result is just the single capture.
      const b = board(wp(18), bp(22));
      const captures = service.findCapturesForPiece(b, wp(18));
      expect(captures).toHaveLength(1);
      const capturedValues = captures[0].capturedSquares.map((p) => p.value);
      const unique = new Set(capturedValues);
      expect(unique.size).toBe(capturedValues.length);
    });
  });

  describe('findCapturesForPiece – king captures (flying king)', () => {
    it('finds a flying-king capture with multiple landing options', () => {
      // WHITE KING at 14 (3,2), BLACK MAN at 23 (5,4) along the (+1,+1) diagonal
      // King slides past 18 (empty), captures 23, can land at 27 (6,5) or 32 (7,6)
      const b = board(wk(14), bp(23));
      const captures = service.findCapturesForPiece(b, wk(14));
      expect(captures.length).toBeGreaterThanOrEqual(2);
      captures.forEach((c) => {
        expect(c.capturedSquares.some((cs) => cs.value === 23)).toBe(true);
      });
    });

    it('does not let a king capture its own pieces', () => {
      const b = board(wk(14), wk(23));
      expect(service.findCapturesForPiece(b, wk(14))).toHaveLength(0);
    });

    it('finds captures for a BLACK king', () => {
      // BLACK KING at 23 (5,4), WHITE MAN at 14 (3,2) — backward diagonal (-1,-1)
      const b = board(bk(23), wp(14));
      const captures = service.findCapturesForPiece(b, bk(23));
      expect(captures.length).toBeGreaterThanOrEqual(1);
      captures.forEach((c) => {
        expect(c.capturedSquares.some((cs) => cs.value === 14)).toBe(true);
      });
    });
  });

  describe('hasCapturesAvailable', () => {
    it('returns true when a capture exists', () => {
      const b = board(wp(18), bp(22));
      expect(service.hasCapturesAvailable(b, PlayerColor.WHITE)).toBe(true);
    });

    it('returns false when no captures exist', () => {
      // WHITE at 18 (4,3), BLACK at 30 (7,2) — not adjacent
      const b = board(wp(18), bp(30));
      expect(service.hasCapturesAvailable(b, PlayerColor.WHITE)).toBe(false);
    });

    it('returns false for a player with no pieces', () => {
      const b = board(bp(22));
      expect(service.hasCapturesAvailable(b, PlayerColor.WHITE)).toBe(false);
    });
  });

  describe('isValidCapture', () => {
    it('returns true for a matching capture', () => {
      const b = board(wp(18), bp(22));
      const result = service.isValidCapture(b, wp(18), new Position(25), [
        new Position(22),
      ]);
      expect(result).toBe(true);
    });

    it('returns false when destination does not match', () => {
      const b = board(wp(18), bp(22));
      const result = service.isValidCapture(b, wp(18), new Position(26), [
        new Position(22),
      ]);
      expect(result).toBe(false);
    });

    it('returns false when captured squares do not match', () => {
      const b = board(wp(18), bp(22));
      // Correct destination (25) but wrong captured square
      const result = service.isValidCapture(b, wp(18), new Position(25), [
        new Position(21),
      ]);
      expect(result).toBe(false);
    });
  });
});
