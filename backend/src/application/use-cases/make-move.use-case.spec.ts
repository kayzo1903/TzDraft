import { BadRequestException } from '@nestjs/common';
import { MakeMoveUseCase } from './make-move.use-case';
import { Game } from '../../domain/game/entities/game.entity';
import { BoardState } from '../../domain/game/value-objects/board-state.vo';
import { Piece } from '../../domain/game/value-objects/piece.vo';
import { Position } from '../../domain/game/value-objects/position.vo';
import {
  PlayerColor,
  PieceType,
  GameType,
  Winner,
  EndReason,
} from '../../shared/constants/game.constants';

function wp(pos: number) {
  return new Piece(PieceType.MAN, PlayerColor.WHITE, new Position(pos));
}
function bp(pos: number) {
  return new Piece(PieceType.MAN, PlayerColor.BLACK, new Position(pos));
}

function makeGameWithBoard(b: BoardState): Game {
  const game = new Game('game1', 'white-player', 'black-player', GameType.CASUAL);
  game.start();
  game.restoreFromSnapshot(b.serialize(), []);
  return game;
}

const mockGameRepository = {
  findById: jest.fn(),
  update: jest.fn().mockResolvedValue(undefined),
  updateClock: jest.fn().mockResolvedValue(undefined),
};

const mockMoveRepository = {
  findByGameId: jest.fn().mockResolvedValue([]),
  create: jest.fn().mockResolvedValue(undefined),
};

const mockGamesGateway = {
  emitGameStateUpdate: jest.fn(),
  emitGameOver: jest.fn(),
};

const mockRatingService = {
  updateRatings: jest.fn().mockResolvedValue(undefined),
};

describe('MakeMoveUseCase', () => {
  let useCase: MakeMoveUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new MakeMoveUseCase(
      mockGameRepository as any,
      mockMoveRepository as any,
      mockGamesGateway as any,
      mockRatingService as any,
    );
  });

  describe('happy path – valid move', () => {
    it('returns the updated game and move on a valid capture', async () => {
      // WHITE at 18 captures BLACK at 22, lands at 25; BLACK at 30 survives
      const game = makeGameWithBoard(new BoardState([wp(18), bp(22), bp(30)]));
      mockGameRepository.findById.mockResolvedValue(game);

      const result = await useCase.execute('game1', 'white-player', 18, 25);

      expect(result.move.from.value).toBe(18);
      expect(result.move.to.value).toBe(25);
      expect(result.move.capturedSquares).toHaveLength(1);
      expect(result.move.capturedSquares[0].value).toBe(22);
      expect(result.game).toBe(game);
    });

    it('persists the move and updates the game in the repository', async () => {
      const game = makeGameWithBoard(new BoardState([wp(18), bp(22), bp(30)]));
      mockGameRepository.findById.mockResolvedValue(game);

      const result = await useCase.execute('game1', 'white-player', 18, 25);

      expect(mockMoveRepository.create).toHaveBeenCalledWith(result.move);
      expect(mockGameRepository.update).toHaveBeenCalledWith(game);
    });

    it('emits a gameStateUpdate WebSocket event', async () => {
      const game = makeGameWithBoard(new BoardState([wp(18), bp(22), bp(30)]));
      mockGameRepository.findById.mockResolvedValue(game);

      const result = await useCase.execute('game1', 'white-player', 18, 25);

      expect(mockGamesGateway.emitGameStateUpdate).toHaveBeenCalledWith(
        'game1',
        expect.objectContaining({ lastMove: result.move }),
      );
    });

    it('assigns move number as existingMoves.length + 1', async () => {
      // Simulate 2 prior moves → next move is #3
      mockMoveRepository.findByGameId.mockResolvedValue([
        { id: 'm1' },
        { id: 'm2' },
      ]);
      const game = makeGameWithBoard(new BoardState([wp(18), bp(22), bp(30)]));
      mockGameRepository.findById.mockResolvedValue(game);

      const result = await useCase.execute('game1', 'white-player', 18, 25);

      expect(result.move.moveNumber).toBe(3);
    });
  });

  describe('error cases', () => {
    it('throws BadRequestException when game is not found', async () => {
      mockGameRepository.findById.mockResolvedValue(null);

      await expect(
        useCase.execute('game1', 'white-player', 18, 25),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when player is not in the game', async () => {
      const game = makeGameWithBoard(new BoardState([wp(18), bp(22), bp(30)]));
      mockGameRepository.findById.mockResolvedValue(game);

      await expect(
        useCase.execute('game1', 'intruder-id', 18, 25),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException for an invalid move', async () => {
      // WHITE at 18 cannot move backward to 14 (TZD: men move forward only)
      const game = makeGameWithBoard(new BoardState([wp(18)]));
      mockGameRepository.findById.mockResolvedValue(game);

      await expect(
        useCase.execute('game1', 'white-player', 18, 14),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when capture is mandatory but not performed', async () => {
      // WHITE at 18 can capture BLACK at 22, so simple move to 23 is illegal
      const game = makeGameWithBoard(new BoardState([wp(18), bp(22)]));
      mockGameRepository.findById.mockResolvedValue(game);

      await expect(
        useCase.execute('game1', 'white-player', 18, 23),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('game end detection', () => {
    it('ends the game when the last opponent piece is captured', async () => {
      // WHITE at 18 captures the only BLACK piece at 22 → BLACK has no pieces
      const game = makeGameWithBoard(new BoardState([wp(18), bp(22)]));
      mockGameRepository.findById.mockResolvedValue(game);

      const result = await useCase.execute('game1', 'white-player', 18, 25);

      expect(result.game.isGameOver()).toBe(true);
      expect(result.game.winner).toBe(Winner.WHITE);
      expect(result.game.endReason).toBe(EndReason.STALEMATE);
    });

    it('emits gameOver and updates ratings when game ends', async () => {
      const game = makeGameWithBoard(new BoardState([wp(18), bp(22)]));
      mockGameRepository.findById.mockResolvedValue(game);

      await useCase.execute('game1', 'white-player', 18, 25);

      expect(mockGamesGateway.emitGameOver).toHaveBeenCalledWith(
        'game1',
        expect.objectContaining({ winner: 'WHITE' }),
      );
      expect(mockRatingService.updateRatings).toHaveBeenCalled();
    });

    it('does not emit gameOver when the game continues', async () => {
      // BLACK at 30 survives — game continues after WHITE's capture
      const game = makeGameWithBoard(new BoardState([wp(18), bp(22), bp(30)]));
      mockGameRepository.findById.mockResolvedValue(game);

      await useCase.execute('game1', 'white-player', 18, 25);

      expect(game.isGameOver()).toBe(false);
      expect(mockGamesGateway.emitGameOver).not.toHaveBeenCalled();
    });
  });
});
