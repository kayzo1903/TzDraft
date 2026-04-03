import {
  Injectable,
  Inject,
  BadRequestException,
  forwardRef,
} from '@nestjs/common';
import type { IGameRepository } from '../../domain/game/repositories/game.repository.interface';
import type { IMoveRepository } from '../../domain/game/repositories/move.repository.interface';
import { Move } from '../../domain/game/entities/move.entity';
import { Position } from '../../domain/game/value-objects/position.vo';
import { randomUUID } from 'crypto';
import {
  Winner,
  EndReason,
  GameStatus,
} from '../../shared/constants/game.constants';
import { RatingService } from './rating.service';
import { ReportTournamentResultUseCase } from './tournament/report-tournament-result.use-case';

/**
 * End Game Use Case
 * Handles game termination (resignation, timeout, etc.)
 * Rating updates are delegated to RatingService and wrapped in a DB transaction.
 */
@Injectable()
export class EndGameUseCase {
  constructor(
    @Inject('IGameRepository')
    private readonly gameRepository: IGameRepository,
    @Inject('IMoveRepository')
    private readonly moveRepository: IMoveRepository,
    private readonly ratingService: RatingService,
    @Inject(forwardRef(() => ReportTournamentResultUseCase))
    private readonly reportTournamentResult: ReportTournamentResultUseCase,
  ) {}

  /**
   * End game by resignation
   */
  async resign(gameId: string, playerId: string): Promise<{ winner: Winner }> {
    const game = await this.gameRepository.findById(gameId);
    if (!game) {
      throw new BadRequestException('Game not found');
    }
    if (game.status !== GameStatus.ACTIVE) {
      throw new BadRequestException('Game is already finished');
    }
    this.ensureParticipant(game, playerId);

    const winner =
      game.whitePlayerId === playerId ? Winner.BLACK : Winner.WHITE;

    game.endGame(winner, EndReason.RESIGN);
    await this.gameRepository.update(game);
    await this.ratingService.updateRatings(
      game.whitePlayerId,
      game.blackPlayerId,
      winner,
      game.gameType,
    );
    this.reportTournamentResult
      .execute(gameId, winner, game.whitePlayerId, game.blackPlayerId)
      .catch(() => {});
    return { winner };
  }

  /**
   * End game by timeout
   */
  async timeout(gameId: string, playerId: string): Promise<void> {
    const game = await this.gameRepository.findById(gameId);
    if (!game) {
      throw new BadRequestException('Game not found');
    }
    if (game.status !== GameStatus.ACTIVE) return;
    this.ensureParticipant(game, playerId);

    const winner =
      game.whitePlayerId === playerId ? Winner.BLACK : Winner.WHITE;

    game.endGame(winner, EndReason.TIME);
    await this.gameRepository.update(game);
    await this.ratingService.updateRatings(
      game.whitePlayerId,
      game.blackPlayerId,
      winner,
      game.gameType,
    );
    this.reportTournamentResult
      .execute(gameId, winner, game.whitePlayerId, game.blackPlayerId)
      .catch(() => {});
  }

  /**
   * End game by agreement (draw)
   */
  async drawByAgreement(gameId: string, playerId: string): Promise<void> {
    const game = await this.gameRepository.findById(gameId);
    if (!game) {
      throw new BadRequestException('Game not found');
    }
    if (game.status !== GameStatus.ACTIVE) {
      throw new BadRequestException('Game is already finished');
    }
    this.ensureParticipant(game, playerId);

    game.endGame(Winner.DRAW, EndReason.DRAW);
    await this.gameRepository.update(game);
    await this.ratingService.updateRatings(
      game.whitePlayerId,
      game.blackPlayerId,
      Winner.DRAW,
      game.gameType,
    );
    this.reportTournamentResult
      .execute(gameId, Winner.DRAW, game.whitePlayerId, game.blackPlayerId)
      .catch(() => {});
  }

  /**
   * Abort game (before the requesting player has made their first move).
   * WHITE can abort until they make move #1 (moveCount < 1).
   * BLACK can abort until they make move #2 (moveCount < 2).
   */
  async abort(gameId: string, playerId: string): Promise<void> {
    const game = await this.gameRepository.findById(gameId);
    if (!game) {
      throw new BadRequestException('Game not found');
    }
    this.ensureParticipant(game, playerId);

    const moveCount = game.getMoveCount();
    const isWhite = game.whitePlayerId === playerId;
    const hasMoved = isWhite ? moveCount >= 1 : moveCount >= 2;

    if (hasMoved) {
      throw new BadRequestException('Cannot abort after you have made a move');
    }

    game.abort();
    await this.gameRepository.update(game);
    // No rating change on abort — game was never played
  }

  /**
   * Finalise an AI game: save all moves + set winner/endReason/FINISHED.
   * No Elo update (AI games don't affect ratings).
   */
  async finaliseGame(
    gameId: string,
    winner: Winner,
    endReason: EndReason,
    moveDtos: Array<{
      player: 'WHITE' | 'BLACK';
      fromSquare: number;
      toSquare: number;
      capturedSquares: number[];
      isPromotion: boolean;
      notation: string;
    }>,
  ): Promise<void> {
    const game = await this.gameRepository.findById(gameId);
    if (!game) throw new BadRequestException('Game not found');
    if (game.status === GameStatus.FINISHED) return;

    for (let i = 0; i < moveDtos.length; i++) {
      const m = moveDtos[i];
      const move = new Move(
        randomUUID(),
        gameId,
        i + 1,
        m.player as any,
        new Position(m.fromSquare),
        new Position(m.toSquare),
        m.capturedSquares.map((sq) => new Position(sq)),
        m.isPromotion,
        m.notation,
      );
      await this.moveRepository.create(move);
    }

    game.endGame(winner, endReason);
    await this.gameRepository.update(game);
  }

  private ensureParticipant(
    game: { whitePlayerId: string; blackPlayerId: string | null },
    playerId: string,
  ): void {
    if (game.whitePlayerId !== playerId && game.blackPlayerId !== playerId) {
      throw new BadRequestException('Player not in this game');
    }
  }
}
