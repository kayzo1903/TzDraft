import {
  Controller,
  Post,
  Get,
  Param,
  Query,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
  BadRequestException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { Public } from '../../../auth/decorators/public.decorator';
import { CreateGameUseCase } from '../../../application/use-cases/create-game.use-case';
import { GetGameStateUseCase } from '../../../application/use-cases/get-game-state.use-case';
import { GetActiveGameUseCase } from '../../../application/use-cases/get-active-game.use-case';
import { EndGameUseCase } from '../../../application/use-cases/end-game.use-case';
import {
  CreatePvEGameDto,
  CreateInviteGameDto,
  StartAiChallengeSessionDto,
  CompleteAiChallengeSessionDto,
  SyncAiProgressDto,
  RecordGameDto,
} from '../dtos/create-game.dto';
import {
  Winner,
  EndReason,
  GameStatus,
} from '../../../shared/constants/game.constants';
import { JoinQueueDto } from '../dtos/join-queue.dto';
import { PlayerColor } from '../../../shared/constants/game.constants';
import { GamesGateway } from '../../../infrastructure/messaging/games.gateway';
import { JoinQueueUseCase } from '../../../application/use-cases/join-queue.use-case';
import { GetGameHistoryUseCase } from '../../../application/use-cases/get-game-history.use-case';
import { GetPlayerStatsUseCase } from '../../../application/use-cases/get-player-stats.use-case';
import { UserService } from '../../../domain/user/user.service';
import { GameType } from '../../../shared/constants/game.constants';
import { AiProgressionService } from '../../../application/use-cases/ai-progression.service';
import { SocialService } from '../../../domain/social/social.service';
import { OptionalJwtAuthGuard } from '../../../auth/guards/optional-jwt.guard';

/**
 * Game Controller
 * Handles game-related HTTP endpoints
 */
@ApiTags('games')
@ApiBearerAuth()
@Controller('games')
@UseGuards(JwtAuthGuard)
export class GameController {
  constructor(
    private readonly createGameUseCase: CreateGameUseCase,
    private readonly getGameStateUseCase: GetGameStateUseCase,
    private readonly getActiveGameUseCase: GetActiveGameUseCase,
    private readonly endGameUseCase: EndGameUseCase,
    private readonly gamesGateway: GamesGateway,
    private readonly joinQueueUseCase: JoinQueueUseCase,
    private readonly getGameHistoryUseCase: GetGameHistoryUseCase,
    private readonly getPlayerStatsUseCase: GetPlayerStatsUseCase,
    private readonly aiProgressionService: AiProgressionService,
    private readonly userService: UserService,
    private readonly socialService: SocialService,
  ) {}

  /**
   * Create a new PvE game
   */
  @Post('pve')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new Player vs AI game' })
  @ApiResponse({ status: 201, description: 'Game created successfully' })
  async createPvEGame(@CurrentUser() user: any, @Body() dto: CreatePvEGameDto) {
    const game = await this.createGameUseCase.createPvEGame(
      user.id,
      dto.playerColor,
      user.rating?.rating || 1200,
      dto.aiLevel,
    );

    return {
      success: true,
      data: game,
    };
  }

  /**
   * Record all moves of a completed AI game for later analysis/replay.
   * Frontend calls this once when the game ends, sending the full move list.
   */
  @Post(':id/record')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Record completed AI game moves for replay' })
  async recordGame(
    @CurrentUser() user: any,
    @Param('id') gameId: string,
    @Body() dto: RecordGameDto,
  ) {
    const game = await this.getGameStateUseCase.getGame(gameId);
    if (!game) return { success: false, error: 'Game not found' };

    // Verify the caller is a participant
    const userId = user.id;
    if (game.whitePlayerId !== userId && game.blackPlayerId !== userId) {
      return { success: false, error: 'Not a participant' };
    }

    // Only record once (skip if already finished)
    if (game.status === GameStatus.FINISHED) {
      return { success: true, data: { gameId } };
    }

    // Save moves + finalise game in one call
    const winner = dto.winner as Winner;
    const endReason = (dto.endReason as EndReason) ?? EndReason.STALEMATE;
    await this.endGameUseCase.finaliseGame(
      gameId,
      winner,
      endReason,
      dto.moves,
    );

    return { success: true, data: { gameId } };
  }

  @Get('ai/progression')
  @ApiOperation({ summary: 'Get my AI progression state' })
  async getAiProgression(@CurrentUser() user: any) {
    const data = await this.aiProgressionService.getProgression(user.id);
    return { success: true, data };
  }

  @Post('ai/sessions')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Start an authenticated AI challenge session' })
  async startAiSession(
    @CurrentUser() user: any,
    @Body() dto: StartAiChallengeSessionDto,
  ) {
    const data = await this.aiProgressionService.startSession(
      user.id,
      dto.aiLevel,
      dto.playerColor,
    );
    return { success: true, data };
  }

  @Post('ai/sessions/:sessionId/complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Complete an authenticated AI challenge session' })
  async completeAiSession(
    @CurrentUser() user: any,
    @Param('sessionId') sessionId: string,
    @Body() dto: CompleteAiChallengeSessionDto,
  ) {
    const data = await this.aiProgressionService.completeSession(
      user.id,
      sessionId,
      dto.result,
      dto.undoUsed,
    );
    return { success: true, data };
  }

  @Post('ai/progression/sync')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Merge local offline AI progression into the authenticated account',
  })
  async syncAiProgression(
    @CurrentUser() user: any,
    @Body() dto: SyncAiProgressDto,
  ) {
    const data = await this.aiProgressionService.syncLocalProgress(
      user.id,
      dto.completedLevels,
      dto.maxUnlockedAiLevel,
    );
    return { success: true, data };
  }

  /**
   * Create an invite game (waiting for second player)
   */
  @Post('invite')
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create an invite game and get invite code' })
  @ApiResponse({ status: 201, description: 'Invite game created' })
  async createInviteGame(
    @CurrentUser() user: any,
    @Body() dto: CreateInviteGameDto,
  ) {
    // Resolve RANDOM to an actual color before handing to the use case
    const resolvedColor: PlayerColor =
      dto.color === 'RANDOM'
        ? Math.random() < 0.5
          ? PlayerColor.WHITE
          : PlayerColor.BLACK
        : dto.color;

    const { game, inviteCode } = await this.createGameUseCase.createInviteGame(
      user.id,
      resolvedColor,
      user.rating?.rating || 1200,
      dto.timeMs ?? 600000,
    );

    return {
      success: true,
      data: { gameId: game.id, inviteCode },
    };
  }

  /**
   * Join an invite game via code
   */
  @Post('invite/:code/join')
  @Throttle({ default: { ttl: 60_000, limit: 20 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Join an invite game using its code' })
  @ApiResponse({ status: 200, description: 'Joined game successfully' })
  async joinInviteGame(@CurrentUser() user: any, @Param('code') code: string) {
    const upperCode = code.toUpperCase();

    // Pre-join checks: verify neither player is already in an active match.
    const pendingGame =
      await this.createGameUseCase.findByInviteCode(upperCode);

    if (pendingGame && pendingGame.status === GameStatus.WAITING) {
      // Resolve who created this invite
      const creatorId =
        pendingGame.creatorColor === PlayerColor.WHITE
          ? pendingGame.whitePlayerId
          : pendingGame.blackPlayerId;

      // Check if the creator is already in a different active match
      if (creatorId && creatorId !== user.id) {
        const creatorBusy =
          await this.createGameUseCase.findActiveNonWaitingGame(creatorId);
        if (creatorBusy) {
          const creator = await this.userService.findById(creatorId);
          const name =
            creator?.displayName || creator?.username || 'That player';
          throw new BadRequestException(
            `${name} is already in another match. Try again later.`,
          );
        }
      }

      // Check if the joiner themselves is already in an active match
      const joinerBusy = await this.createGameUseCase.findActiveNonWaitingGame(
        user.id,
      );
      if (joinerBusy) {
        throw new BadRequestException(
          'You are already in an active match. Finish it first.',
        );
      }
    }

    const game = await this.createGameUseCase.joinInviteGame(
      upperCode,
      user.id,
    );

    // Identify the challenger (the player who created the game, not the joiner)
    const challengerId =
      game.whitePlayerId === user.id ? game.blackPlayerId : game.whitePlayerId;

    // Notify the challenger their challenge was accepted so they navigate to the game
    if (challengerId) {
      this.gamesGateway.emitChallengeAccepted(challengerId, game.id);
    }

    // Broadcast full state update to the game room
    this.gamesGateway.emitGameStateUpdate(game.id, { gameId: game.id });

    return {
      success: true,
      data: { gameId: game.id },
    };
  }

  /**
   * Host starts the game (both players must be present)
   */
  @Post(':id/start')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Host starts the game after both players joined' })
  @ApiResponse({ status: 200, description: 'Game started' })
  async startGame(@CurrentUser() user: any, @Param('id') id: string) {
    await this.createGameUseCase.startGame(id, user.id);
    // Notify both clients that the game is now ACTIVE
    this.gamesGateway.emitGameStateUpdate(id, { gameId: id });
    return { success: true };
  }

  /**
   * Join the matchmaking queue
   * If a match is found immediately, returns { status: "matched", gameId }.
   * Otherwise returns { status: "waiting" } and the client listens for the
   * "matchFound" WebSocket event.
   */
  @Post('queue/join')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Join the matchmaking queue' })
  @ApiResponse({ status: 200, description: 'Queued or matched' })
  async joinQueue(@CurrentUser() user: any, @Body() dto: JoinQueueDto) {
    const result = await this.joinQueueUseCase.execute(
      user.id,
      dto.timeMs,
      dto.socketId ?? '',
      user.rating?.rating ?? null,
    );

    if (result.status === 'matched') {
      // Notify both players via WS so the game starts even if the HTTP
      // response is dropped (e.g. mobile network hiccup / request abort).
      this.gamesGateway.emitMatchFound(result.opponentUserId, result.gameId);
      this.gamesGateway.emitMatchFound(user.id, result.gameId);
    }

    return {
      success: true,
      data: {
        status: result.status,
        ...(result.status === 'matched' ? { gameId: result.gameId } : {}),
      },
    };
  }

  /**
   * Cancel the matchmaking queue entry for the current user
   */
  @Post('queue/cancel')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Leave the matchmaking queue' })
  @ApiResponse({ status: 204, description: 'Removed from queue' })
  async cancelQueue(@CurrentUser() user: any) {
    await this.joinQueueUseCase.cancelQueue(user.id);
  }

  /**
   * Get current active game for the user, if any
   */
  @Get('active')
  @ApiOperation({ summary: 'Get current active game' })
  @ApiResponse({ status: 200, description: 'Returns active game ID if exists' })
  async getActiveGame(@CurrentUser() user: any) {
    const game = await this.getActiveGameUseCase.execute(user.id);
    return {
      success: true,
      data: game ? { id: game.id, gameType: game.gameType } : null,
    };
  }

  /**
   * Get current user's game history (paginated)
   */
  @Get('history')
  @ApiOperation({ summary: 'Get my game history' })
  async getMyHistory(
    @CurrentUser() user: any,
    @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip: number,
    @Query('take', new DefaultValuePipe(20), ParseIntPipe) take: number,
    @Query('result') result?: 'WIN' | 'LOSS' | 'DRAW',
    @Query('gameType') gameType?: string,
  ) {
    const safeSkip = Math.max(0, skip);
    const safeTake = Math.min(Math.max(1, take), 100);
    const data = await this.getGameHistoryUseCase.execute(
      user.id,
      safeSkip,
      safeTake,
      {
        result,
        gameType: gameType as GameType | undefined,
      },
    );
    return { success: true, data };
  }

  /**
   * Get current user's win/loss/draw stats
   */
  @Get('stats')
  @ApiOperation({ summary: 'Get my game stats' })
  async getMyStats(@CurrentUser() user: any) {
    const data = await this.getPlayerStatsUseCase.execute(user.id);
    return { success: true, data };
  }

  /**
   * Get game by ID
   */
  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get game by ID' })
  @ApiResponse({ status: 200, description: 'Game found' })
  @ApiResponse({ status: 404, description: 'Game not found' })
  async getGame(@Param('id') id: string) {
    const { game, moves, players } = await this.getGameStateUseCase.execute(id);

    return {
      success: true,
      data: {
        game,
        moves,
        players,
      },
    };
  }

  /**
   * Resign from a game
   */
  @Post(':id/resign')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resign from a game' })
  async resignGame(@CurrentUser() user: any, @Param('id') id: string) {
    const { winner } = await this.endGameUseCase.resign(id, user.id);
    this.gamesGateway.emitGameOver(id, {
      gameId: id,
      winner: winner.toString(),
      reason: 'resign',
    });
    return { success: true };
  }

  /**
   * Offer / accept a draw (immediate mutual draw for friendly games)
   */
  @Post(':id/draw')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'End game as a draw' })
  async drawGame(@CurrentUser() user: any, @Param('id') id: string) {
    await this.endGameUseCase.drawByAgreement(id, user.id);
    this.gamesGateway.emitGameOver(id, {
      gameId: id,
      winner: 'DRAW',
      reason: 'draw',
    });
    return { success: true };
  }

  /**
   * Abort a game that has not yet started
   */
  @Post(':id/abort')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Abort a game before it starts' })
  async abortGame(@CurrentUser() user: any, @Param('id') id: string) {
    // Capture game state before aborting so we can notify the other player
    const game = await this.createGameUseCase.findGameById(id);
    const wasWaiting = game.status === GameStatus.WAITING;

    // Track whether the recipient explicitly declined vs the challenger cancelling.
    let cancelReason: 'declined' | 'cancelled' = 'cancelled';

    try {
      await this.endGameUseCase.abort(id, user.id);
    } catch (err) {
      // If it's a WAITING invite game, allow the "invitee" (who isn't a participant yet) to decline it.
      // They have the ID because it was sent to them via WebSocket.
      if (
        wasWaiting &&
        game.inviteCode &&
        err instanceof BadRequestException &&
        err.message === 'Player not in this game'
      ) {
        await this.endGameUseCase.forceAbort(id, 'declined');
        cancelReason = 'declined';
      } else {
        throw err;
      }
    }

    if (wasWaiting) {
      // Notify the other player that the challenge was cancelled/declined.
      // We search for any participant that is NOT the current user.
      const otherId = [game.whitePlayerId, game.blackPlayerId].find(
        (pid) => pid && pid !== user.id,
      );
      if (otherId) {
        this.gamesGateway.emitChallengeCancelled(otherId, id, cancelReason);
      }
    } else {
      // Emit gameOver so the result card appears on both players' screens
      this.gamesGateway.emitGameOver(id, {
        gameId: id,
        winner: null,
        reason: 'aborted',
      });
    }
    return { success: true };
  }

  /**
   * Get game state with pagination
   */
  @Get(':id/state')
  @Public()
  @ApiOperation({ summary: 'Get game state with paginated moves' })
  @ApiResponse({ status: 200, description: 'Game state retrieved' })
  async getGameState(
    @Param('id') id: string,
    @Param('skip') skip: number = 0,
    @Param('take') take: number = 50,
  ) {
    const result = await this.getGameStateUseCase.executeWithPagination(
      id,
      skip,
      take,
    );

    return {
      success: true,
      data: result,
    };
  }

  /**
   * Get all moves for a game (for replay)
   */
  // ── Public player profile ────────────────────────────────────────────────

  @Get('players/:userId/profile')
  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Get public profile of a player' })
  async getPlayerProfile(
    @Param('userId') userId: string,
    @CurrentUser() viewer: any,
  ) {
    const user = await this.userService.findById(userId);
    if (!user) return { success: false, data: null };

    const [stats, rank] = await Promise.all([
      this.getPlayerStatsUseCase.execute(userId),
      this.userService.getPlayerRank(userId),
    ]);

    let relationship: {
      isFollowing: boolean;
      isFollower: boolean;
      isMutual: boolean;
      isFriend: boolean;
      isRival: boolean;
      gameCount: number;
    } | null = null;

    if (viewer?.id && viewer.id !== userId) {
      relationship = await this.socialService.getRelationshipState(
        viewer.id,
        userId,
      );
    }

    return {
      success: true,
      data: {
        id: user.id,
        displayName: user.displayName,
        username: user.username,
        avatarUrl: user.avatarUrl ?? null,
        country: user.country,
        region: user.region,
        rating: user.rating?.rating ?? 1200,
        gamesPlayed: user.rating?.gamesPlayed ?? 0,
        wins: stats.wins,
        losses: stats.losses,
        draws: stats.draws,
        winRate: stats.winRate,
        rank: rank.global,
        totalPlayers: rank.totalPlayers,
        relationship,
      },
    };
  }

  @Get('players/:userId/games')
  @Public()
  @ApiOperation({ summary: 'Get public game history of a player' })
  async getPlayerGames(
    @Param('userId') userId: string,
    @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip: number,
    @Query('take', new DefaultValuePipe(20), ParseIntPipe) take: number,
  ) {
    const data = await this.getGameHistoryUseCase.execute(
      userId,
      Math.max(0, skip),
      Math.min(Math.max(1, take), 50),
      {},
    );
    return { success: true, data };
  }

  @Get(':id/replay')
  @Public()
  @ApiOperation({ summary: 'Get all moves for game replay' })
  async getGameReplay(@Param('id') id: string) {
    const { game, moves, players } = await this.getGameStateUseCase.execute(id);
    return {
      success: true,
      data: {
        game,
        players,
        moves: moves.map((m) => ({
          id: m.id,
          moveNumber: m.moveNumber,
          player: m.player,
          fromSquare: m.from.value,
          toSquare: m.to.value,
          capturedSquares: m.capturedSquares.map((p) => p.value),
          isPromotion: m.isPromotion,
          notation: m.notation,
          createdAt: m.createdAt,
        })),
      },
    };
  }
}
