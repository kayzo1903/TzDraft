import { CaptureFindingService } from './capture-finding.service';
import { BoardState } from '../value-objects/board-state.vo';
import { Piece } from '../value-objects/piece.vo';
import { Position } from '../value-objects/position.vo';
import {
  PieceType,
  PlayerColor,
} from '../../../shared/constants/game.constants';

describe('CaptureFindingService', () => {
  test('finds multi-capture path for man zigzag sequence (origin preserved)', () => {
    const whiteMan = new Piece(
      PieceType.MAN,
      PlayerColor.WHITE,
      Position.fromRowCol(1, 2),
    );
    const black1 = new Piece(
      PieceType.MAN,
      PlayerColor.BLACK,
      Position.fromRowCol(2, 1),
    );
    const black2 = new Piece(
      PieceType.MAN,
      PlayerColor.BLACK,
      Position.fromRowCol(4, 1),
    );
    const black3 = new Piece(
      PieceType.MAN,
      PlayerColor.BLACK,
      Position.fromRowCol(6, 1),
    );

    const board = new BoardState([whiteMan, black1, black2, black3]);
    const captureService = new CaptureFindingService();
    const captures = captureService.findCapturesForPiece(board, whiteMan);

    const target = Position.fromRowCol(7, 0);
    const match = captures.find((cap) => cap.to.equals(target));

    expect(match).toBeDefined();
    expect(match?.from.equals(whiteMan.position)).toBe(true);
    expect(match?.capturedSquares.length).toBe(3);
    expect(match?.capturedSquares[0].equals(black1.position)).toBe(true);
    expect(match?.capturedSquares[1].equals(black2.position)).toBe(true);
    expect(match?.capturedSquares[2].equals(black3.position)).toBe(true);
  });
});

