/**
 * W3.7 — Full game sequence integration test
 * Exercises the domain layer end-to-end: Game entity + MoveValidationService
 * + GameRulesService working together without any infrastructure.
 */
import { Game } from './entities/game.entity';
import { MoveValidationService } from './services/move-validation.service';
import { GameRulesService } from './services/game-rules.service';
import { Position } from './value-objects/position.vo';
import {
  PlayerColor,
  GameType,
  Winner,
  EndReason,
} from '../../shared/constants/game.constants';

const moveValidation = new MoveValidationService();
const gameRules = new GameRulesService();

function pos(n: number) {
  return new Position(n);
}

/** Active game with a custom snapshot board. Turn starts at WHITE. */
function makeGame(
  pieces: { p: number; c: 'WHITE' | 'BLACK'; k: boolean }[],
): Game {
  const game = new Game('g1', 'white', 'black', GameType.CASUAL);
  game.start();
  game.restoreFromSnapshot(pieces, []);
  return game;
}

describe('Game integration — full sequences', () => {
  it('single capture ends game when BLACK runs out of pieces', () => {
    // Setup: WHITE man at 18, BLACK man at 22 (only 1 black piece)
    // WHITE captures over 22 and lands at 25 → BLACK has 0 pieces → WHITE wins
    const game = makeGame([
      { p: 18, c: 'WHITE', k: false },
      { p: 22, c: 'BLACK', k: false },
    ]);

    const result = moveValidation.validateMove(
      game,
      PlayerColor.WHITE,
      pos(18),
      pos(25),
    );
    expect(result.isValid).toBe(true);
    game.applyMove(result.move!);

    expect(gameRules.isGameOver(game)).toBe(true);
    expect(gameRules.detectWinner(game)).toBe(Winner.WHITE);
  });

  it('alternates turns and tracks board state across two moves', () => {
    const game = new Game('g1', 'white', 'black', GameType.CASUAL);
    game.start();
    // Use initial 12v12 board

    // Move 1: WHITE at pos 9 (2,1) → pos 13 (3,1)
    const r1 = moveValidation.validateMove(
      game,
      PlayerColor.WHITE,
      pos(9),
      pos(13),
    );
    expect(r1.isValid).toBe(true);
    game.applyMove(r1.move!);

    expect(game.currentTurn).toBe(PlayerColor.BLACK);
    expect(game.board.getPieceAt(pos(9))).toBeNull();
    expect(game.board.getPieceAt(pos(13))).not.toBeNull();

    // Move 2: BLACK at pos 24 (5,6) → pos 20 (4,7)
    const r2 = moveValidation.validateMove(
      game,
      PlayerColor.BLACK,
      pos(24),
      pos(20),
    );
    expect(r2.isValid).toBe(true);
    game.applyMove(r2.move!);

    expect(game.currentTurn).toBe(PlayerColor.WHITE);
    expect(game.getMoveCount()).toBe(2);
    expect(game.board.getPieceAt(pos(24))).toBeNull();
    expect(game.board.getPieceAt(pos(20))).not.toBeNull();
  });

  it('MoveValidationService rejects illegal moves while legal ones succeed', () => {
    const game = makeGame([
      { p: 18, c: 'WHITE', k: false },
      { p: 27, c: 'BLACK', k: false },
    ]);

    // Backward move for a man is illegal
    const illegal = moveValidation.validateMove(
      game,
      PlayerColor.WHITE,
      pos(18),
      pos(14), // (3,2): backward (row 3 < row 4)
    );
    expect(illegal.isValid).toBe(false);

    // Legal forward move
    const legal = moveValidation.validateMove(
      game,
      PlayerColor.WHITE,
      pos(18),
      pos(23), // (5,4): forward-right from (4,3)
    );
    expect(legal.isValid).toBe(true);
  });

  it('promotion happens when WHITE man reaches row 7', () => {
    // WHITE man at pos 27 (6,5) moves to pos 31 (7,4) — promotion row
    const game = makeGame([
      { p: 27, c: 'WHITE', k: false },
      { p: 1, c: 'BLACK', k: false }, // BLACK piece elsewhere so game is ongoing
    ]);

    const result = moveValidation.validateMove(
      game,
      PlayerColor.WHITE,
      pos(27),
      pos(31),
    );
    expect(result.isValid).toBe(true);
    expect(result.move!.isPromotion).toBe(true);
    game.applyMove(result.move!);

    const promotedPiece = game.board.getPieceAt(pos(31));
    expect(promotedPiece).not.toBeNull();
    expect(promotedPiece!.isKing()).toBe(true);
  });

  it('draw by insufficient material is detected after board becomes king-only', () => {
    // K vs K — insufficient material for any decisive result
    const game = makeGame([
      { p: 18, c: 'WHITE', k: true },
      { p: 27, c: 'BLACK', k: true },
    ]);

    expect(gameRules.isDrawByInsufficientMaterial(game.board)).toBe(true);

    game.endGame(Winner.DRAW, EndReason.DRAW);
    expect(game.winner).toBe(Winner.DRAW);
    expect(game.isGameOver()).toBe(true);
  });
});
