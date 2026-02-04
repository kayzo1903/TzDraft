import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CreateGameUseCase } from '../../../application/use-cases/create-game.use-case';
import { GetGameStateUseCase } from '../../../application/use-cases/get-game-state.use-case';
import { CreatePvPGameDto, CreatePvEGameDto } from '../dtos/create-game.dto';

/**
 * Game Controller
 * Handles game-related HTTP endpoints
 */
@ApiTags('games')
@Controller('games')
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
  async createPvPGame(@Body() dto: CreatePvPGameDto) {
    const game = await this.createGameUseCase.createPvPGame(
      dto.whitePlayerId,
      dto.blackPlayerId,
      dto.whiteElo || 1200,
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
  async createPvEGame(@Body() dto: CreatePvEGameDto) {
    const game = await this.createGameUseCase.createPvEGame(
      dto.playerId,
      dto.playerColor,
      dto.playerElo || 1200,
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
  @ApiOperation({ summary: 'Get game by ID' })
  @ApiResponse({ status: 200, description: 'Game found' })
  @ApiResponse({ status: 404, description: 'Game not found' })
  async getGame(@Param('id') id: string) {
    const { game, moves } = await this.getGameStateUseCase.execute(id);

    return {
      success: true,
      data: {
        game,
        moves,
      },
    };
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
