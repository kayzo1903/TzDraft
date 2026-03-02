import {
  Controller,
  Post,
  Get,
  Param,
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
} from '../dtos/create-game.dto';
import { PlayerColor } from '../../../shared/constants/game.constants';
import { GamesGateway } from '../../../infrastructure/messaging/games.gateway';

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
}
