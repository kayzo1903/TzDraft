import { MoveGeneratorService } from './move-generator.service';
import { BoardState } from '../value-objects/board-state.vo';
import { Piece } from '../value-objects/piece.vo';
import { Position } from '../value-objects/position.vo';
import {
  PlayerColor,
  PieceType,
  GameType,
} from '../../../shared/constants/game.constants';
import { Game } from '../entities/game.entity';

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

/** Active game with a custom board. */
function makeGame(b: BoardState): Game {
  const game = new Game('g1', 'white', 'black', GameType.CASUAL);
  game.start();
  game.restoreFromSnapshot(b.serialize(), []);
  return game;
}

describe('MoveGeneratorService', () => {
  let service: MoveGeneratorService;

  beforeEach(() => {
    service = new MoveGeneratorService();
  });

  // ─── generateAllMoves ──────────────────────────────────────────────────────

  describe('generateAllMoves', () => {
    it('returns simple moves when no captures are available', () => {
      // WM at 18 (4,3): can move forward to 22 (5,2) and 23 (5,4)
      const game = makeGame(new BoardState([wp(18), bp(27)]));
      const moves = service.generateAllMoves(game, PlayerColor.WHITE);

      expect(moves.length).toBeGreaterThanOrEqual(2);
      expect(moves.every((m) => m.capturedSquares.length === 0)).toBe(true);
      expect(moves.some((m) => m.to.equals(pos(22)))).toBe(true);
      expect(moves.some((m) => m.to.equals(pos(23)))).toBe(true);
    });

    it('returns only capture moves when captures are available (mandatory)', () => {
      // WM at 18 can capture BM at 22 → captures must be returned, not simples
      const game = makeGame(new BoardState([wp(18), bp(22)]));
      const moves = service.generateAllMoves(game, PlayerColor.WHITE);

      expect(moves.length).toBeGreaterThan(0);
      expect(moves.every((m) => m.capturedSquares.length > 0)).toBe(true);
    });

    it('sets the correct player on each generated move', () => {
      const game = makeGame(new BoardState([wp(18), bp(27)]));
      const moves = service.generateAllMoves(game, PlayerColor.WHITE);
      moves.forEach((m) => expect(m.player).toBe(PlayerColor.WHITE));
    });

    it('flags isPromotion when a man would reach the back row', () => {
      // WM at 27 (6,5) can move to 31 (7,4) — promotion
      const game = makeGame(new BoardState([wp(27), bp(1)]));
      const moves = service.generateAllMoves(game, PlayerColor.WHITE);
      const promotionMove = moves.find((m) => m.to.equals(pos(31)));
      expect(promotionMove).toBeDefined();
      expect(promotionMove!.isPromotion).toBe(true);
    });

    it('returns empty array when player has no pieces', () => {
      const game = makeGame(new BoardState([bp(22)]));
      const moves = service.generateAllMoves(game, PlayerColor.WHITE);
      expect(moves).toHaveLength(0);
    });

    it('generates multi-square slides for a flying king', () => {
      // WK at 18 (4,3): king can slide multiple squares forward
      const game = makeGame(new BoardState([wk(18), bp(32)]));
      const moves = service.generateAllMoves(game, PlayerColor.WHITE);
      // King must have more than 2 moves (more options than a man)
      expect(moves.length).toBeGreaterThan(2);
    });
  });

  // ─── generateMovesForPiece ────────────────────────────────────────────────

  describe('generateMovesForPiece', () => {
    it('returns simple moves for a man when no capture is available', () => {
      const game = makeGame(new BoardState([wp(18), bp(27)]));
      const piece = game.board.getPieceAt(pos(18))!;
      const moves = service.generateMovesForPiece(game, piece);

      expect(moves.length).toBeGreaterThanOrEqual(1);
      moves.forEach((m) => expect(m.from.equals(pos(18))).toBe(true));
    });

    it('returns capture moves for a piece when captures are available', () => {
      const game = makeGame(new BoardState([wp(18), bp(22)]));
      const piece = game.board.getPieceAt(pos(18))!;
      const moves = service.generateMovesForPiece(game, piece);

      expect(moves.every((m) => m.capturedSquares.length > 0)).toBe(true);
    });
  });

  // ─── countLegalMoves ─────────────────────────────────────────────────────

  describe('countLegalMoves', () => {
    it('returns the total count of legal moves', () => {
      const game = makeGame(new BoardState([wp(18), bp(27)]));
      const count = service.countLegalMoves(game, PlayerColor.WHITE);
      expect(count).toBeGreaterThan(0);
    });

    it('returns 0 when no pieces present', () => {
      const game = makeGame(new BoardState([bp(22)]));
      expect(service.countLegalMoves(game, PlayerColor.WHITE)).toBe(0);
    });
  });

  // ─── isMoveLegal ─────────────────────────────────────────────────────────

  describe('isMoveLegal', () => {
    it('returns true for a legal move', () => {
      const game = makeGame(new BoardState([wp(18), bp(27)]));
      expect(
        service.isMoveLegal(game, PlayerColor.WHITE, pos(18), pos(23)),
      ).toBe(true);
    });

    it('returns false for an illegal move (backward)', () => {
      const game = makeGame(new BoardState([wp(18), bp(27)]));
      // Backward move for a man is illegal
      expect(
        service.isMoveLegal(game, PlayerColor.WHITE, pos(18), pos(14)),
      ).toBe(false);
    });

    it('returns false when captures are available and a non-capture is attempted', () => {
      // Capture is mandatory: simple move to 23 must be rejected
      const game = makeGame(new BoardState([wp(18), bp(22)]));
      expect(
        service.isMoveLegal(game, PlayerColor.WHITE, pos(18), pos(23)),
      ).toBe(false);
    });
  });
});
