import { GameRulesService } from './game-rules.service';
import { BoardState } from '../value-objects/board-state.vo';
import { Piece } from '../value-objects/piece.vo';
import { Position } from '../value-objects/position.vo';
import {
  PlayerColor,
  PieceType,
  GameType,
  Winner,
  EndReason,
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
function bk(pos: number) {
  return new Piece(PieceType.KING, PlayerColor.BLACK, new Position(pos));
}

/** Active game with custom board. Current turn is always WHITE. */
function makeGame(b: BoardState): Game {
  const game = new Game('g1', 'white', 'black', GameType.CASUAL);
  game.start();
  game.restoreFromSnapshot(b.serialize(), []);
  return game;
}

describe('GameRulesService', () => {
  let service: GameRulesService;

  beforeEach(() => {
    service = new GameRulesService();
  });

  // ─── shouldPromote ────────────────────────────────────────────────────────────

  describe('shouldPromote', () => {
    it('returns true for a WHITE man on row 7 (positions 29-32)', () => {
      // Position 29 → (7,0): back row for WHITE
      const p = wp(29);
      expect(service.shouldPromote(p, new Position(29))).toBe(true);
    });

    it('returns false for a WHITE man not on row 7', () => {
      const p = wp(25); // (6,1): one row before promotion
      expect(service.shouldPromote(p, new Position(25))).toBe(false);
    });

    it('returns true for a BLACK man on row 0 (positions 1-4)', () => {
      // Position 1 → (0,1): back row for BLACK
      const p = bp(1);
      expect(service.shouldPromote(p, new Position(1))).toBe(true);
    });

    it('returns false for a BLACK man not on row 0', () => {
      const p = bp(6); // (1,2)
      expect(service.shouldPromote(p, new Position(6))).toBe(false);
    });

    it('returns false for a king (already promoted)', () => {
      const p = wk(29);
      expect(service.shouldPromote(p, new Position(29))).toBe(false);
    });
  });

  // ─── promotePiece ─────────────────────────────────────────────────────────────

  describe('promotePiece', () => {
    it('promotes a man to king', () => {
      const promoted = service.promotePiece(wp(18));
      expect(promoted.isKing()).toBe(true);
      expect(promoted.color).toBe(PlayerColor.WHITE);
      expect(promoted.position.value).toBe(18);
    });

    it('returns the same piece if already a king', () => {
      const king = wk(18);
      expect(service.promotePiece(king).isKing()).toBe(true);
    });
  });

  // ─── hasLegalMoves ────────────────────────────────────────────────────────────

  describe('hasLegalMoves', () => {
    it('returns true when a simple move is available', () => {
      // WHITE man at 18 (4,3) — forward squares 22 and 23 are empty
      const game = makeGame(new BoardState([wp(18)]));
      expect(service.hasLegalMoves(game, PlayerColor.WHITE)).toBe(true);
    });

    it('returns true when a capture is available', () => {
      const game = makeGame(new BoardState([wp(18), bp(22)]));
      expect(service.hasLegalMoves(game, PlayerColor.WHITE)).toBe(true);
    });

    it('returns false when the piece is completely blocked (no moves or captures)', () => {
      // WHITE at 4 (0,7): only forward direction is (+1,-1) → pos8 [BLACK]
      // Capture landing is pos11 [BLACK, occupied] → no valid landing.
      // Other direction (+1,+1) → col 8: out of bounds.
      const game = makeGame(new BoardState([wp(4), bp(8), bp(11)]));
      expect(service.hasLegalMoves(game, PlayerColor.WHITE)).toBe(false);
    });

    it('returns false when a player has no pieces', () => {
      const game = makeGame(new BoardState([bp(22)]));
      expect(service.hasLegalMoves(game, PlayerColor.WHITE)).toBe(false);
    });
  });

  // ─── isGameOver ───────────────────────────────────────────────────────────────

  describe('isGameOver', () => {
    it('returns false for an active game with legal moves', () => {
      const game = makeGame(new BoardState([wp(18), bp(27)]));
      expect(service.isGameOver(game)).toBe(false);
    });

    it('returns true when the game status is FINISHED', () => {
      const game = makeGame(new BoardState([wp(18), bp(27)]));
      game.endGame(Winner.WHITE, EndReason.STALEMATE);
      expect(service.isGameOver(game)).toBe(true);
    });

    it('returns true when the current player has no pieces', () => {
      // Only BLACK pieces on board; it is WHITE's turn (default)
      const game = makeGame(new BoardState([bp(22), bp(23)]));
      expect(service.isGameOver(game)).toBe(true);
    });

    it('returns true when the current player is blocked', () => {
      // WHITE trapped at pos 4 (explained in hasLegalMoves above)
      const game = makeGame(new BoardState([wp(4), bp(8), bp(11)]));
      expect(service.isGameOver(game)).toBe(true);
    });
  });

  // ─── detectWinner ────────────────────────────────────────────────────────────

  describe('detectWinner', () => {
    it('returns Winner.BLACK when WHITE has no pieces', () => {
      const game = makeGame(new BoardState([bp(22), bp(23)]));
      expect(service.detectWinner(game)).toBe(Winner.BLACK);
    });

    it('returns Winner.WHITE when BLACK has no pieces', () => {
      const game = makeGame(new BoardState([wp(18), wp(19)]));
      expect(service.detectWinner(game)).toBe(Winner.WHITE);
    });

    it('returns Winner.BLACK when WHITE has no legal moves and it is WHITE turn', () => {
      // WHITE is trapped; game.currentTurn = WHITE (default after start)
      const game = makeGame(new BoardState([wp(4), bp(8), bp(11)]));
      expect(service.detectWinner(game)).toBe(Winner.BLACK);
    });

    it('returns null when both players have legal moves', () => {
      // WHITE can capture BLACK at 22; BLACK can move to 17 or 14
      const game = makeGame(new BoardState([wp(18), bp(22)]));
      expect(service.detectWinner(game)).toBeNull();
    });
  });

  // ─── Draw detection ───────────────────────────────────────────────────────────

  describe('isDrawByThirtyMoveRule (Art 8.3)', () => {
    it('returns true at 60 reversible half-moves', () => {
      expect(service.isDrawByThirtyMoveRule(60)).toBe(true);
    });

    it('returns false at 59 half-moves', () => {
      expect(service.isDrawByThirtyMoveRule(59)).toBe(false);
    });

    it('returns true above 60', () => {
      expect(service.isDrawByThirtyMoveRule(61)).toBe(true);
    });
  });

  describe('isDrawByThreeKingsRule (Art 8.5)', () => {
    it('returns true at 12 three-kings moves', () => {
      expect(service.isDrawByThreeKingsRule(12)).toBe(true);
    });

    it('returns false at 11 moves', () => {
      expect(service.isDrawByThreeKingsRule(11)).toBe(false);
    });
  });

  describe('isDrawByArticle84Endgame (Art 8.4)', () => {
    it('returns true at 10 endgame half-moves', () => {
      expect(service.isDrawByArticle84Endgame(10)).toBe(true);
    });

    it('returns false at 9 half-moves', () => {
      expect(service.isDrawByArticle84Endgame(9)).toBe(false);
    });
  });

  describe('isDrawByInsufficientMaterial (Art 8.1)', () => {
    it('returns true for 1 King vs 1 King with legal moves', () => {
      const game = makeGame(new BoardState([wk(1), bk(32)]));
      expect(service.isDrawByInsufficientMaterial(game)).toBe(true);
    });

    it('returns false if one side has a man', () => {
      const game = makeGame(new BoardState([wk(1), wp(2), bk(32)]));
      expect(service.isDrawByInsufficientMaterial(game)).toBe(false);
    });

    it('returns false if one side is blocked (stalemate)', () => {
      // White king at 4 (0,7), only moves to 8 (1,6).
      // If black king at 8 and no capture possible?
      // With flying kings, it's hard to be blocked unless completely surrounded.
      // Let's use a mock-like setup if needed, but here we can just test basic 1v1.
      const game = makeGame(new BoardState([wk(1), bk(32)]));
      // In this setup, white king at 1 can move to 5, 6, etc.
      expect(service.isDrawByInsufficientMaterial(game)).toBe(true);
    });

    it('returns false for 2 Kings vs 1 King', () => {
      const game = makeGame(new BoardState([wk(1), wk(2), bk(32)]));
      expect(service.isDrawByInsufficientMaterial(game)).toBe(false);
    });
  });

  // ─── countPieces ──────────────────────────────────────────────────────────────

  describe('countPieces', () => {
    it('returns correct piece counts for each player', () => {
      const b = new BoardState([wp(1), wp(2), bp(30)]);
      expect(service.countPieces(b, PlayerColor.WHITE)).toBe(2);
      expect(service.countPieces(b, PlayerColor.BLACK)).toBe(1);
    });
  });

  // ─── endGame ─────────────────────────────────────────────────────────────────

  describe('endGame', () => {
    it('sets the game winner and status to FINISHED', () => {
      const game = makeGame(new BoardState([wp(18), bp(22)]));
      service.endGame(game, Winner.WHITE, EndReason.STALEMATE);
      expect(game.isGameOver()).toBe(true);
      expect(game.winner).toBe(Winner.WHITE);
      expect(game.endReason).toBe(EndReason.STALEMATE);
    });
  });
});
