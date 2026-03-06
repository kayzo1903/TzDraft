import { Game } from './game.entity';
import { Move } from './move.entity';
import { Position } from '../value-objects/position.vo';
import { Piece } from '../value-objects/piece.vo';
import {
  PlayerColor,
  PieceType,
  GameType,
  GameStatus,
  Winner,
  EndReason,
} from '../../../shared/constants/game.constants';

function pos(n: number) {
  return new Position(n);
}

function makeMove(
  player: PlayerColor,
  from: number,
  to: number,
  captured: number[] = [],
  isPromotion = false,
): Move {
  const fromPos = new Position(from);
  const toPos = new Position(to);
  const capturedPos = captured.map((c) => new Position(c));
  return new Move(
    'move-id',
    'g1',
    1,
    player,
    fromPos,
    toPos,
    capturedPos,
    isPromotion,
    Move.generateNotation(fromPos, toPos, capturedPos),
  );
}

/** Active game with a custom board (replaces the initial 12v12). */
function makeGame(pieces: { p: number; c: 'WHITE' | 'BLACK'; k: boolean }[]) {
  const game = new Game('g1', 'white', 'black', GameType.CASUAL);
  game.start();
  game.restoreFromSnapshot(pieces, []);
  return game;
}

describe('Game', () => {
  // ─── start ────────────────────────────────────────────────────────────────

  describe('start', () => {
    it('transitions WAITING → ACTIVE and sets startedAt', () => {
      const game = new Game('g1', 'white', 'black', GameType.CASUAL);
      expect(game.status).toBe(GameStatus.WAITING);
      game.start();
      expect(game.status).toBe(GameStatus.ACTIVE);
      expect(game.startedAt).not.toBeNull();
    });

    it('throws when called a second time', () => {
      const game = new Game('g1', 'white', 'black', GameType.CASUAL);
      game.start();
      expect(() => game.start()).toThrow('Game has already started');
    });
  });

  // ─── applyMove ────────────────────────────────────────────────────────────

  describe('applyMove', () => {
    it('moves the piece on the board and switches turn', () => {
      // WHITE man at 18 moves to 23 (forward-right: (4,3)→(5,4))
      const game = makeGame([
        { p: 18, c: 'WHITE', k: false },
        { p: 27, c: 'BLACK', k: false },
      ]);
      const move = makeMove(PlayerColor.WHITE, 18, 23);
      game.applyMove(move);

      expect(game.board.getPieceAt(pos(18))).toBeNull();
      expect(game.board.getPieceAt(pos(23))).not.toBeNull();
      expect(game.currentTurn).toBe(PlayerColor.BLACK);
    });

    it('removes captured pieces from the board', () => {
      // WHITE at 18 captures BLACK at 22, lands at 25
      const game = makeGame([
        { p: 18, c: 'WHITE', k: false },
        { p: 22, c: 'BLACK', k: false },
      ]);
      const move = makeMove(PlayerColor.WHITE, 18, 25, [22]);
      game.applyMove(move);

      expect(game.board.getPieceAt(pos(22))).toBeNull(); // captured
      expect(game.board.getPieceAt(pos(25))).not.toBeNull(); // landed
    });

    it('adds the move to history', () => {
      const game = makeGame([{ p: 18, c: 'WHITE', k: false }]);
      const move = makeMove(PlayerColor.WHITE, 18, 23);
      game.applyMove(move);

      expect(game.getMoveCount()).toBe(1);
      expect(game.getLastMove()).toBe(move);
    });

    it('throws when game is not ACTIVE', () => {
      const game = new Game('g1', 'white', 'black', GameType.CASUAL);
      const move = makeMove(PlayerColor.WHITE, 9, 13);
      expect(() => game.applyMove(move)).toThrow('Game is not active');
    });

    it("throws when it is not the player's turn", () => {
      const game = makeGame([
        { p: 18, c: 'WHITE', k: false },
        { p: 22, c: 'BLACK', k: false },
      ]);
      // currentTurn = WHITE, but move is BLACK
      const move = makeMove(PlayerColor.BLACK, 22, 17);
      expect(() => game.applyMove(move)).toThrow("Not this player's turn");
    });
  });

  // ─── endGame / resign / abort ──────────────────────────────────────────────

  describe('endGame', () => {
    it('sets FINISHED status, winner, endReason, and endedAt', () => {
      const game = makeGame([
        { p: 18, c: 'WHITE', k: false },
        { p: 27, c: 'BLACK', k: false },
      ]);
      game.endGame(Winner.WHITE, EndReason.STALEMATE);

      expect(game.status).toBe(GameStatus.FINISHED);
      expect(game.winner).toBe(Winner.WHITE);
      expect(game.endReason).toBe(EndReason.STALEMATE);
      expect(game.endedAt).not.toBeNull();
    });

    it('throws when called a second time', () => {
      const game = makeGame([{ p: 18, c: 'WHITE', k: false }]);
      game.endGame(Winner.WHITE, EndReason.STALEMATE);
      expect(() => game.endGame(Winner.BLACK, EndReason.STALEMATE)).toThrow(
        'Game is already finished',
      );
    });
  });

  describe('resign', () => {
    it('WHITE resign → winner is BLACK', () => {
      const game = makeGame([{ p: 18, c: 'WHITE', k: false }]);
      game.resign(PlayerColor.WHITE);
      expect(game.winner).toBe(Winner.BLACK);
      expect(game.endReason).toBe(EndReason.RESIGN);
    });

    it('BLACK resign → winner is WHITE', () => {
      const game = makeGame([{ p: 22, c: 'BLACK', k: false }]);
      game.resign(PlayerColor.BLACK);
      expect(game.winner).toBe(Winner.WHITE);
    });
  });

  describe('abort', () => {
    it('sets status to ABORTED', () => {
      const game = new Game('g1', 'white', 'black', GameType.CASUAL);
      game.abort();
      expect(game.status).toBe(GameStatus.ABORTED);
    });
  });

  // ─── Status helpers ────────────────────────────────────────────────────────

  describe('isGameOver', () => {
    it('returns false for an active game', () => {
      const game = makeGame([{ p: 18, c: 'WHITE', k: false }]);
      expect(game.isGameOver()).toBe(false);
    });

    it('returns true for FINISHED', () => {
      const game = makeGame([{ p: 18, c: 'WHITE', k: false }]);
      game.endGame(Winner.WHITE, EndReason.STALEMATE);
      expect(game.isGameOver()).toBe(true);
    });

    it('returns true for ABORTED', () => {
      const game = new Game('g1', 'white', 'black', GameType.CASUAL);
      game.abort();
      expect(game.isGameOver()).toBe(true);
    });
  });

  describe('isPlayerTurn', () => {
    it('returns true when it is the player turn and game is ACTIVE', () => {
      const game = makeGame([{ p: 18, c: 'WHITE', k: false }]);
      expect(game.isPlayerTurn(PlayerColor.WHITE)).toBe(true);
      expect(game.isPlayerTurn(PlayerColor.BLACK)).toBe(false);
    });

    it('returns false when game is not ACTIVE', () => {
      const game = new Game('g1', 'white', 'black', GameType.CASUAL);
      // Status is WAITING
      expect(game.isPlayerTurn(PlayerColor.WHITE)).toBe(false);
    });
  });

  // ─── getMoveCount / getLastMove ────────────────────────────────────────────

  describe('getMoveCount / getLastMove', () => {
    it('returns 0 and null for a fresh game', () => {
      const game = makeGame([{ p: 18, c: 'WHITE', k: false }]);
      expect(game.getMoveCount()).toBe(0);
      expect(game.getLastMove()).toBeNull();
    });
  });

  // ─── Draw counters ─────────────────────────────────────────────────────────

  describe('reversibleMoveCount (Art 8.3)', () => {
    it('increments when kings-only board has a non-capture move', () => {
      // WK at 18, BK at 27 — kings only
      const game = makeGame([
        { p: 18, c: 'WHITE', k: true },
        { p: 27, c: 'BLACK', k: true },
      ]);
      // WK 18 → 22 (no capture)
      game.applyMove(makeMove(PlayerColor.WHITE, 18, 22));
      expect(game.reversibleMoveCount).toBe(1);
    });

    it('resets to 0 when a man is still on the board', () => {
      // Board has a man → not kings-only → reset
      const game = makeGame([
        { p: 18, c: 'WHITE', k: false }, // WHITE man
        { p: 27, c: 'BLACK', k: true },
      ]);
      game.applyMove(makeMove(PlayerColor.WHITE, 18, 23));
      expect(game.reversibleMoveCount).toBe(0);
    });
  });

  describe('threeKingsMoveCount (Art 8.5)', () => {
    it('increments when the stronger side (3K vs 1K) makes a non-capture move', () => {
      // 3 WHITE kings vs 1 BLACK king
      const game = makeGame([
        { p: 1, c: 'WHITE', k: true },
        { p: 5, c: 'WHITE', k: true },
        { p: 18, c: 'WHITE', k: true },
        { p: 32, c: 'BLACK', k: true },
      ]);
      // WK 18 → 22 (no capture)
      game.applyMove(makeMove(PlayerColor.WHITE, 18, 22));
      expect(game.threeKingsMoveCount).toBe(1);
    });
  });

  describe('endgameMoveCount (Art 8.4)', () => {
    it('increments in a K vs K endgame position', () => {
      // WK@18, BK@27 — K vs K is an Art 8.4 endgame
      const game = makeGame([
        { p: 18, c: 'WHITE', k: true },
        { p: 27, c: 'BLACK', k: true },
      ]);
      game.applyMove(makeMove(PlayerColor.WHITE, 18, 22));
      expect(game.endgameMoveCount).toBe(1);
    });
  });

  // ─── replayMovesFromHistory ────────────────────────────────────────────────

  describe('replayMovesFromHistory', () => {
    it('reconstructs board state from raw move records', () => {
      const game = new Game('g1', 'white', 'black', GameType.CASUAL);
      game.start();
      // Initial board has WHITE at pos 9 (row 2); move to pos 13 (row 3)
      game.replayMovesFromHistory([
        { fromSquare: 9, toSquare: 13, capturedSquares: [] },
      ]);

      expect(game.board.getPieceAt(pos(9))).toBeNull();
      expect(game.board.getPieceAt(pos(13))).not.toBeNull();
      expect(game.getMoveCount()).toBe(1);
    });
  });

  // ─── restoreFromSnapshot ──────────────────────────────────────────────────

  describe('restoreFromSnapshot', () => {
    it('replaces the board with the snapshot (discards initial 12v12)', () => {
      const game = new Game('g1', 'white', 'black', GameType.CASUAL);
      game.start();
      game.restoreFromSnapshot(
        [
          { p: 18, c: 'WHITE', k: false },
          { p: 27, c: 'BLACK', k: false },
        ],
        [],
      );
      expect(game.board.getAllPieces()).toHaveLength(2);
      expect(game.board.getPieceAt(pos(1))).toBeNull(); // initial white not present
    });

    it('rebuilds draw counters from supplied raw moves', () => {
      const game = new Game('g1', 'white', 'black', GameType.CASUAL);
      game.start();
      // Snapshot after one kings-only non-capture move
      game.restoreFromSnapshot(
        [
          { p: 22, c: 'WHITE', k: true },
          { p: 27, c: 'BLACK', k: true },
        ],
        [{ fromSquare: 18, toSquare: 22, capturedSquares: [] }],
      );
      expect(game.getMoveCount()).toBe(1);
      expect(game.reversibleMoveCount).toBe(1);
    });
  });

  // ─── isPvE / isPvP ────────────────────────────────────────────────────────

  describe('isPvE / isPvP', () => {
    it('isPvE returns true for AI game type', () => {
      const game = new Game('g1', 'white', null, GameType.AI);
      expect(game.isPvE()).toBe(true);
      expect(game.isPvP()).toBe(false);
    });

    it('isPvP returns true for RANKED and CASUAL games', () => {
      const casual = new Game('g1', 'white', 'black', GameType.CASUAL);
      const ranked = new Game('g2', 'white', 'black', GameType.RANKED);
      expect(casual.isPvP()).toBe(true);
      expect(ranked.isPvP()).toBe(true);
    });
  });
});
