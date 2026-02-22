import {
  Injectable,
  Inject,
  BadRequestException,
  forwardRef,
} from '@nestjs/common';
import { Game } from '../../domain/game/entities/game.entity';
import { GamesGateway } from '../../infrastructure/messaging/games.gateway';
import type { IGameRepository } from '../../domain/game/repositories/game.repository.interface';
import { MoveValidationService } from '../../domain/game/services/move-validation.service';
import { GameRulesService } from '../../domain/game/services/game-rules.service';
import { Position } from '../../domain/game/value-objects/position.vo';
import { Move } from '../../domain/game/entities/move.entity';
import { PlayerColor } from '../../shared/constants/game.constants';
import { PrismaService } from '../../infrastructure/database/prisma/prisma.service';
import { RatingService } from '../../domain/game/services/rating.service';
import { GameStateCacheService } from '../services/game-state-cache.service';

/**
 * Make Move Use Case
 * Handles move validation and execution
 */
@Injectable()
export class MakeMoveUseCase {
  private readonly moveValidationService: MoveValidationService;
  private readonly gameRulesService: GameRulesService;

  constructor(
    @Inject('IGameRepository')
    private readonly gameRepository: IGameRepository,
    @Inject(forwardRef(() => GamesGateway))
    private readonly gamesGateway: GamesGateway,
    private readonly prisma: PrismaService,
    private readonly ratingService: RatingService,
    private readonly gameStateCache: GameStateCacheService,
  ) {
    this.moveValidationService = new MoveValidationService();
    this.gameRulesService = new GameRulesService();
  }

  /**
   * Execute a move
   */
  async execute(
    gameId: string,
    playerId: string,
    from: number,
    to: number,
    path?: number[],
  ): Promise<{
    game: Game;
    move: Move;
  }> {
    // 1. Load game — check the in-memory cache first to avoid stale DB reads
    //    during the async write window from the previous move.
    const game =
      this.gameStateCache.get(gameId) ??
      (await this.gameRepository.findById(gameId));
    if (!game) {
      throw new BadRequestException('Game not found');
    }

    // 2. Determine player color
    const playerColor = this.getPlayerColor(game, playerId);

    // 3. Get actual move count from database
    const moveNumber = game.getMoveCount() + 1;

    // 4. Validate move (in-memory, ~0 ms)
    const fromPos = new Position(from);
    const toPos = new Position(to);
    const pathPos = path?.map((p) => new Position(p));

    const moveResult = this.moveValidationService.validateMove(
      game,
      playerColor,
      fromPos,
      toPos,
      pathPos,
    );

    if (!moveResult.isValid || !moveResult.move || !moveResult.newBoardState) {
      throw new BadRequestException(
        moveResult.error?.message || 'Invalid move',
      );
    }

    // Override move number with correct value from database
    const correctedMove = new (moveResult.move.constructor as any)(
      moveResult.move.id,
      moveResult.move.gameId,
      moveNumber, // Use correct move number
      moveResult.move.player,
      moveResult.move.from,
      moveResult.move.to,
      moveResult.move.capturedSquares,
      moveResult.move.isPromotion,
      moveResult.move.notation,
      moveResult.move.createdAt,
    );

    // 5. Update Clock
    if (game.status === 'ACTIVE' && game.clockInfo) {
      const now = Date.now();
      const lastMoveTime =
        game.clockInfo.lastMoveAt instanceof Date
          ? game.clockInfo.lastMoveAt.getTime()
          : new Date(game.clockInfo.lastMoveAt).getTime();
      const elapsed = Math.max(0, now - lastMoveTime);
      game.updateClock(elapsed);
    } else if (game.status === 'ACTIVE' && !game.clockInfo) {
      game.updateClock(0);
    }

    // 6. Apply move to game entity (in-memory)
    game.applyMove(correctedMove);

    // 🔑 Immediately update the in-memory cache so the next makeMove call
    //    (which may arrive before the DB write completes) reads correct state.
    this.gameStateCache.set(game);

    // 7. Evaluate game result
    const evaluation = this.gameRulesService.evaluatePostMove(game);
    if (evaluation.outcome) {
      game.endGame(evaluation.outcome.winner, evaluation.outcome.reason);
    }

    // 8. ✅ OPTIMISTIC BROADCAST — emit to both players immediately,
    //    before any database writes. This eliminates the 150–400 ms DB
    //    write delay that players felt on every move.
    const broadcastPayload = {
      id: game.id,
      status: game.status,
      gameType: game.gameType,
      whitePlayerId: game.whitePlayerId,
      blackPlayerId: game.blackPlayerId,
      whiteGuestName: game.whiteGuestName,
      blackGuestName: game.blackGuestName,
      winner: game.winner,
      endReason: game.endReason,
      currentTurn: game.currentTurn,
      clockInfo: game.clockInfo,
      serverTimeMs: Date.now(),
      board: game.board?.toJSON ? game.board.toJSON() : (game as any).board,
      lastMove: {
        id: correctedMove.id,
        player: correctedMove.player,
        from: correctedMove.from.value,
        to: correctedMove.to.value,
        notation: correctedMove.notation,
        isPromotion: correctedMove.isPromotion,
        capturedSquares: correctedMove.capturedSquares.map((p) => p.value),
        moveNumber: correctedMove.moveNumber,
        createdAt: correctedMove.createdAt,
      },
      drawClaimAvailable: evaluation.drawClaimAvailable,
    };
    this.gamesGateway.emitGameStateUpdate(gameId, broadcastPayload);

    if (game.status === 'FINISHED') {
      this.gamesGateway.emitGameOver(gameId, {
        winner: game.winner,
        reason: game.endReason,
        noMoves: evaluation.outcome?.noMoves === true,
      });
    }

    // 9. Schedule timeout for next player (before DB write so clocks stay
    //    accurate regardless of persistence latency)
    if (game.clockInfo && game.status === 'ACTIVE') {
      const nextPlayer = game.currentTurn;
      const timeForNextPlayer =
        nextPlayer === PlayerColor.WHITE
          ? game.clockInfo.whiteTimeMs
          : game.clockInfo.blackTimeMs;
      const nextPlayerId =
        nextPlayer === PlayerColor.WHITE
          ? game.whitePlayerId
          : game.blackPlayerId;
      if (nextPlayerId) {
        this.gamesGateway.scheduleGameTimeout(
          game.id,
          timeForNextPlayer,
          nextPlayerId,
        );
      }
    }

    // 10. Persist asynchronously — DB writes happen in the background.
    //     If persistence fails, invalidate the cache and emit moveRollback
    //     so clients can recover.
    this.persistMoveAsync(game, correctedMove, evaluation).catch((err) => {
      console.error(`persistMoveAsync failed game=${gameId}:`, err);
      // Invalidate so the next load gets a fresh DB read.
      this.gameStateCache.invalidate(gameId);
      this.gamesGateway.emitMoveRollback(gameId, {
        from: correctedMove.from.value,
        to: correctedMove.to.value,
      });
    });

    // Evict finished games from the cache — no more moves expected.
    if (game.status === 'FINISHED') {
      this.gameStateCache.invalidate(gameId);
    }

    return {
      game,
      move: correctedMove,
    };
  }

  /**
   * Persist move and updated game state to the database.
   * Called asynchronously after the optimistic broadcast so players
   * never wait for DB writes to see the updated board.
   */
  private async persistMoveAsync(
    game: Game,
    correctedMove: Move,
    evaluation: ReturnType<GameRulesService['evaluatePostMove']>,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.game.update({
        where: { id: game.id },
        data: {
          status: game.status,
          winner: game.winner,
          endReason: game.endReason,
          startedAt: game.startedAt,
          endedAt: game.endedAt,
        },
      });

      if (game.clockInfo) {
        const whiteTimeMs = BigInt(
          Math.max(0, Math.floor(game.clockInfo.whiteTimeMs)),
        );
        const blackTimeMs = BigInt(
          Math.max(0, Math.floor(game.clockInfo.blackTimeMs)),
        );
        const lastMoveAt =
          game.clockInfo.lastMoveAt instanceof Date
            ? game.clockInfo.lastMoveAt
            : new Date(game.clockInfo.lastMoveAt);

        await tx.clock.upsert({
          where: { gameId: game.id },
          create: {
            gameId: game.id,
            whiteTimeMs,
            blackTimeMs,
            lastMoveAt,
          },
          update: {
            whiteTimeMs,
            blackTimeMs,
            lastMoveAt,
          },
        });
      }

      await tx.move.create({
        data: {
          id: correctedMove.id,
          gameId: correctedMove.gameId,
          moveNumber: correctedMove.moveNumber,
          player: correctedMove.player,
          fromSquare: correctedMove.from.value,
          toSquare: correctedMove.to.value,
          capturedSquares: correctedMove.capturedSquares.map((p) => p.value),
          isPromotion: correctedMove.isPromotion,
          isMultiCapture: correctedMove.isMultiCapture(),
          notation: correctedMove.notation,
          createdAt: correctedMove.createdAt,
        },
      });
    });

    // Update ratings after a finished game
    if (game.status === 'FINISHED' && game.winner) {
      try {
        await this.ratingService.updateRatings(game, game.winner);
      } catch (error) {
        console.error('Failed to update ratings:', error);
      }
    }
  }

  /**
   * Get player color from game
   */
  private getPlayerColor(game: Game, playerId: string): PlayerColor {
    if (game.whitePlayerId === playerId) {
      return PlayerColor.WHITE;
    }
    if (game.blackPlayerId === playerId) {
      return PlayerColor.BLACK;
    }
    throw new BadRequestException('Player not in this game');
  }
}
