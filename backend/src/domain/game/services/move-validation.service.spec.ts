import { MoveValidationService } from './move-validation.service';
import { BoardState } from '../value-objects/board-state.vo';
import { Piece } from '../value-objects/piece.vo';
import { Position } from '../value-objects/position.vo';
import {
  PlayerColor,
  PieceType,
  GameType,
} from '../../../shared/constants/game.constants';
import { ValidationErrorCode } from '../types/validation-error.type';
import { Game } from '../entities/game.entity';

function wp(pos: number) {
  return new Piece(PieceType.MAN, PlayerColor.WHITE, new Position(pos));
}
function bp(pos: number) {
  return new Piece(PieceType.MAN, PlayerColor.BLACK, new Position(pos));
}
function pos(n: number) {
  return new Position(n);
}

/** Active game with a custom board (initial 12v12 replaced by snapshot). */
function makeActiveGame(b: BoardState): Game {
  const game = new Game('g1', 'white', 'black', GameType.CASUAL);
  game.start();
  game.restoreFromSnapshot(b.serialize(), []);
  return game;
}

/** Game still in WAITING state (not started). */
function makeWaitingGame(): Game {
  return new Game('g1', 'white', 'black', GameType.CASUAL);
}

describe('MoveValidationService', () => {
  let service: MoveValidationService;

  beforeEach(() => {
    service = new MoveValidationService();
  });

  // ─── Simple moves ───────────────────────────────────────────────────────────

  describe('simple (non-capture) moves', () => {
    it('accepts a valid forward-diagonal move', () => {
      // WHITE at 18 (4,3) → 22 (5,2): direction (+1,-1), empty destination
      const b = new BoardState([wp(18)]);
      const game = makeActiveGame(b);
      const result = service.validateMove(
        game,
        PlayerColor.WHITE,
        pos(18),
        pos(22),
      );
      expect(result.isValid).toBe(true);
      expect(result.move).toBeDefined();
      expect(result.newBoardState).toBeDefined();
    });

    it('rejects a backward move for a man', () => {
      // WHITE at 18 (4,3) → 14 (3,2): backward — not in WHITE's valid directions
      const b = new BoardState([wp(18)]);
      const game = makeActiveGame(b);
      const result = service.validateMove(
        game,
        PlayerColor.WHITE,
        pos(18),
        pos(14),
      );
      expect(result.isValid).toBe(false);
      expect(result.error?.code).toBe(ValidationErrorCode.INVALID_MOVE);
    });

    it('rejects a move to an occupied square', () => {
      // WHITE at 18, WHITE at 22 — destination occupied
      const b = new BoardState([wp(18), wp(22)]);
      const game = makeActiveGame(b);
      const result = service.validateMove(
        game,
        PlayerColor.WHITE,
        pos(18),
        pos(22),
      );
      expect(result.isValid).toBe(false);
      expect(result.error?.code).toBe(ValidationErrorCode.DESTINATION_OCCUPIED);
    });
  });

  // ─── Capture moves ───────────────────────────────────────────────────────────

  describe('capture moves', () => {
    it('accepts a valid capture move', () => {
      // WHITE at 18 (4,3) captures BLACK at 22 (5,2), lands at 25 (6,1)
      const b = new BoardState([wp(18), bp(22)]);
      const game = makeActiveGame(b);
      const result = service.validateMove(
        game,
        PlayerColor.WHITE,
        pos(18),
        pos(25),
      );
      expect(result.isValid).toBe(true);
      expect(result.move?.capturedSquares).toHaveLength(1);
      expect(result.move?.capturedSquares[0].value).toBe(22);
    });

    it('enforces mandatory capture — simple move rejected when capture exists', () => {
      // WHITE at 18 has a capture (BLACK at 22). Attempting a non-capture move
      // to 23 (5,4) instead must be rejected.
      const b = new BoardState([wp(18), bp(22)]);
      const game = makeActiveGame(b);
      const result = service.validateMove(
        game,
        PlayerColor.WHITE,
        pos(18),
        pos(23), // valid direction but ignores available capture
      );
      expect(result.isValid).toBe(false);
      expect(result.error?.code).toBe(ValidationErrorCode.CAPTURE_REQUIRED);
    });

    it('returns correct newBoardState after capture', () => {
      const b = new BoardState([wp(18), bp(22)]);
      const game = makeActiveGame(b);
      const result = service.validateMove(
        game,
        PlayerColor.WHITE,
        pos(18),
        pos(25),
      );
      expect(result.isValid).toBe(true);
      // Captured piece removed; piece moved to 25
      const newBoard = result.newBoardState!;
      expect(newBoard.getPieceAt(new Position(22))).toBeNull();
      expect(newBoard.getPieceAt(new Position(25))).not.toBeNull();
      expect(newBoard.getPieceAt(new Position(18))).toBeNull();
    });

    it('rejects an invalid capture destination', () => {
      // BLACK at 22 is present but destination 26 is not a valid landing square
      const b = new BoardState([wp(18), bp(22)]);
      const game = makeActiveGame(b);
      const result = service.validateMove(
        game,
        PlayerColor.WHITE,
        pos(18),
        pos(26), // wrong landing
      );
      expect(result.isValid).toBe(false);
      expect(result.error?.code).toBe(ValidationErrorCode.CAPTURE_REQUIRED);
    });
  });

  // ─── Game-state validation ───────────────────────────────────────────────────

  describe('game state validation', () => {
    it('rejects a move when the game is not active', () => {
      const game = makeWaitingGame(); // status = WAITING
      const result = service.validateMove(
        game,
        PlayerColor.WHITE,
        pos(18),
        pos(22),
      );
      expect(result.isValid).toBe(false);
      expect(result.error?.code).toBe(ValidationErrorCode.GAME_NOT_ACTIVE);
    });

    it("rejects a move when it is not the player's turn", () => {
      // Game turn = WHITE; BLACK tries to move
      const b = new BoardState([wp(18), bp(22)]);
      const game = makeActiveGame(b);
      const result = service.validateMove(
        game,
        PlayerColor.BLACK, // wrong turn
        pos(22),
        pos(18),
      );
      expect(result.isValid).toBe(false);
      expect(result.error?.code).toBe(ValidationErrorCode.WRONG_TURN);
    });
  });

  // ─── Piece validation ────────────────────────────────────────────────────────

  describe('piece validation', () => {
    it('rejects a move from an empty square', () => {
      const b = new BoardState([wp(18)]);
      const game = makeActiveGame(b);
      const result = service.validateMove(
        game,
        PlayerColor.WHITE,
        pos(10), // empty
        pos(15),
      );
      expect(result.isValid).toBe(false);
      expect(result.error?.code).toBe(ValidationErrorCode.NO_PIECE);
    });

    it("rejects moving the opponent's piece", () => {
      // Board has BLACK at 22; player=WHITE tries to move it
      const b = new BoardState([wp(18), bp(22)]);
      const game = makeActiveGame(b);
      const result = service.validateMove(
        game,
        PlayerColor.WHITE,
        pos(22), // BLACK's piece
        pos(17),
      );
      expect(result.isValid).toBe(false);
      expect(result.error?.code).toBe(ValidationErrorCode.WRONG_PIECE_COLOR);
    });
  });

  // ─── Promotion via simple move ───────────────────────────────────────────────

  describe('promotion', () => {
    it('marks isPromotion when a man reaches the back row via simple move', () => {
      // WHITE man at 27 (6,5) → 31 (7,4): reaches row 7 → promotion
      const b = new BoardState([wp(27)]);
      const game = makeActiveGame(b);
      const result = service.validateMove(
        game,
        PlayerColor.WHITE,
        pos(27),
        pos(31),
      );
      expect(result.isValid).toBe(true);
      expect(result.move?.isPromotion).toBe(true);
    });

    it('does not mark isPromotion for a non-back-row move', () => {
      const b = new BoardState([wp(18)]);
      const game = makeActiveGame(b);
      const result = service.validateMove(
        game,
        PlayerColor.WHITE,
        pos(18),
        pos(22),
      );
      expect(result.isValid).toBe(true);
      expect(result.move?.isPromotion).toBe(false);
    });
  });
});
