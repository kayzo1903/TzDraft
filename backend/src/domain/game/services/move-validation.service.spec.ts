import { Game } from '../entities/game.entity';
import { BoardState } from '../value-objects/board-state.vo';
import { Piece } from '../value-objects/piece.vo';
import { Position } from '../value-objects/position.vo';
import { MoveValidationService } from './move-validation.service';
import {
  GameStatus,
  GameType,
  PieceType,
  PlayerColor,
} from '../../../shared/constants/game.constants';

const makeActiveGame = (board: BoardState, currentTurn: PlayerColor) => {
  const game = new Game(
    'test-game',
    'w',
    'b',
    null,
    null,
    GameType.CASUAL,
  );
  (game as any)._status = GameStatus.ACTIVE;
  (game as any)._currentTurn = currentTurn;
  (game as any)._board = board;
  (game as any)._moves = [];
  return game;
};

describe('MoveValidationService - king simple moves', () => {
  test('allows flying king simple move (e.g. 2 -> 16)', () => {
    const from = Position.fromRowCol(0, 3); // 2
    const to = Position.fromRowCol(3, 6); // 16
    const king = new Piece(PieceType.KING, PlayerColor.WHITE, from);
    const board = new BoardState([king]);
    const game = makeActiveGame(board, PlayerColor.WHITE);

    const service = new MoveValidationService();
    const result = service.validateMove(game, PlayerColor.WHITE, from, to);

    expect(result.isValid).toBe(true);
    expect(result.move?.from.equals(from)).toBe(true);
    expect(result.move?.to.equals(to)).toBe(true);
  });

  test('rejects flying king move if path is blocked', () => {
    const from = Position.fromRowCol(0, 3); // 2
    const to = Position.fromRowCol(3, 6); // 16
    const king = new Piece(PieceType.KING, PlayerColor.WHITE, from);
    const blocker = new Piece(
      PieceType.MAN,
      PlayerColor.WHITE,
      Position.fromRowCol(1, 4),
    );
    const board = new BoardState([king, blocker]);
    const game = makeActiveGame(board, PlayerColor.WHITE);

    const service = new MoveValidationService();
    const result = service.validateMove(game, PlayerColor.WHITE, from, to);

    expect(result.isValid).toBe(false);
  });
});
