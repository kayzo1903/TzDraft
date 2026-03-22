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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { CreateGameUseCase } from '../../../application/use-cases/create-game.use-case';
import { GetGameStateUseCase } from '../../../application/use-cases/get-game-state.use-case';
import { EndGameUseCase } from '../../../application/use-cases/end-game.use-case';
import {
  CreatePvPGameDto,
  CreatePvEGameDto,
  CreateInviteGameDto,
  StartAiChallengeSessionDto,
  CompleteAiChallengeSessionDto,
} from '../dtos/create-game.dto';
import { JoinQueueDto } from '../dtos/join-queue.dto';
import { PlayerColor } from '../../../shared/constants/game.constants';
import { GamesGateway } from '../../../infrastructure/messaging/games.gateway';
import { JoinQueueUseCase } from '../../../application/use-cases/join-queue.use-case';
import { GetGameHistoryUseCase } from '../../../application/use-cases/get-game-history.use-case';
import { GetPlayerStatsUseCase } from '../../../application/use-cases/get-player-stats.use-case';
import { GameType } from '../../../shared/constants/game.constants';
import { AiProgressionService } from '../../../application/use-cases/ai-progression.service';

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
    private readonly endGameUseCase: EndGameUseCase,
    private readonly gamesGateway: GamesGateway,
    private readonly joinQueueUseCase: JoinQueueUseCase,
    private readonly getGameHistoryUseCase: GetGameHistoryUseCase,
    private readonly getPlayerStatsUseCase: GetPlayerStatsUseCase,
    private readonly aiProgressionService: AiProgressionService,
  ) {}

  /**
   * Create a new PvP game
   */
  @Post('pvp')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new Player vs Player game' })
  @ApiResponse({ status: 201, description: 'Game created successfully' })
  async createPvPGame(@CurrentUser() user: any, @Body() dto: CreatePvPGameDto) {
    const game = await this.createGameUseCase.createPvPGame(
      user.id,
      dto.blackPlayerId,
      user.rating?.rating || 1200,
      dto.blackElo || 1200,
    );

    return {
      success: true,
      data: game,
    };
  }

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

  /**
   * Create an invite game (waiting for second player)
   */
  @Post('invite')
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
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Join an invite game using its code' })
  @ApiResponse({ status: 200, description: 'Joined game successfully' })
  async joinInviteGame(@CurrentUser() user: any, @Param('code') code: string) {
    const game = await this.createGameUseCase.joinInviteGame(
      code.toUpperCase(),
      user.id,
    );

    // Notify host (and any other clients in the room) that opponent joined
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
      // Notify the matched opponent via their current live socket
      this.gamesGateway.emitMatchFound(
        result.opponentUserId,
        result.gameId,
      );
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
   * Get current user's game history (paginated)
   */
  @Get('history')
  @ApiOperation({ summary: 'Get my game history' })
  async getMyHistory(
    @CurrentUser() user: any,
    @Query('skip') skip = '0',
    @Query('take') take = '20',
    @Query('result') result?: 'WIN' | 'LOSS' | 'DRAW',
    @Query('gameType') gameType?: string,
  ) {
    const data = await this.getGameHistoryUseCase.execute(
      user.id,
      parseInt(skip, 10),
      parseInt(take, 10),
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
    await this.endGameUseCase.abort(id, user.id);
    // Emit gameOver (not just gameStateUpdate) so the result card appears
    // on both players' screens with the "Game Aborted" state.
    this.gamesGateway.emitGameOver(id, {
      gameId: id,
      winner: null,
      reason: 'aborted',
    });
    return { success: true };
  }

  /**
   * Get game state with pagination
   */
  @Get(':id/state')
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
  @Get(':id/replay')
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
