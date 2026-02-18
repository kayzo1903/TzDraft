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
import { Public } from '../../../auth/decorators/public.decorator';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import { CreateGameUseCase } from '../../../application/use-cases/create-game.use-case';
import { GetGameStateUseCase } from '../../../application/use-cases/get-game-state.use-case';
import { CreatePvPGameDto, CreatePvEGameDto } from '../dtos/create-game.dto';

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
        game: this.serializeGame(game),
        moves,
        players,
      },
    };
  }

  /**
   * Get server-authoritative clock snapshot for a game
   */
  @Get(':id/clock')
  @Public()
  @ApiOperation({ summary: 'Get server-authoritative game clock' })
  @ApiResponse({ status: 200, description: 'Clock retrieved' })
  async getGameClock(@Param('id') id: string) {
    const { game } = await this.getGameStateUseCase.execute(id);
    const serialized = this.serializeGame(game);

    return {
      success: true,
      data: {
        id: serialized.id,
        status: serialized.status,
        currentTurn: serialized.currentTurn,
        clockInfo: serialized.clockInfo,
        serverTimeMs: Date.now(),
      },
    };
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
      data: {
        ...result,
        game: this.serializeGame(result.game),
      },
    };
  }

  private serializeGame(game: any) {
    const clockInfo = this.computeEffectiveClock(game);

    return {
      id: game.id,
      status: game.status,
      gameType: game.gameType,
      ruleVersion: game.ruleVersion,
      whitePlayerId: game.whitePlayerId,
      blackPlayerId: game.blackPlayerId,
      whiteGuestName: game.whiteGuestName,
      blackGuestName: game.blackGuestName,
      whiteElo: game.whiteElo,
      blackElo: game.blackElo,
      aiLevel: game.aiLevel,
      winner: game.winner,
      endReason: game.endReason,
      createdAt: game.createdAt,
      startedAt: game.startedAt,
      endedAt: game.endedAt,
      currentTurn: game.currentTurn,
      clockInfo,
      board: game.board?.toJSON ? game.board.toJSON() : game.board,
    };
  }

  private computeEffectiveClock(game: any) {
    if (!game?.clockInfo) return null;

    const whiteTimeMs = Number(game.clockInfo.whiteTimeMs);
    const blackTimeMs = Number(game.clockInfo.blackTimeMs);
    const lastMoveAt =
      game.clockInfo.lastMoveAt instanceof Date
        ? game.clockInfo.lastMoveAt
        : new Date(game.clockInfo.lastMoveAt);

    if (
      game.status !== 'ACTIVE' ||
      !Number.isFinite(whiteTimeMs) ||
      !Number.isFinite(blackTimeMs) ||
      Number.isNaN(lastMoveAt.getTime())
    ) {
      return {
        whiteTimeMs,
        blackTimeMs,
        lastMoveAt: lastMoveAt.toISOString(),
      };
    }

    const elapsedMs = Math.max(0, Date.now() - lastMoveAt.getTime());
    const turn = game.currentTurn === 'BLACK' ? 'BLACK' : 'WHITE';

    return {
      whiteTimeMs:
        turn === 'WHITE' ? Math.max(0, whiteTimeMs - elapsedMs) : whiteTimeMs,
      blackTimeMs:
        turn === 'BLACK' ? Math.max(0, blackTimeMs - elapsedMs) : blackTimeMs,
      lastMoveAt: lastMoveAt.toISOString(),
    };
  }
}
