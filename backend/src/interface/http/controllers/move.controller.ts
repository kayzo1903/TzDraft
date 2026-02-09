import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  Query,
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
import { MakeMoveUseCase } from '../../../application/use-cases/make-move.use-case';
import { GetLegalMovesUseCase } from '../../../application/use-cases/get-legal-moves.use-case';
import { EndGameUseCase } from '../../../application/use-cases/end-game.use-case';
import { MakeMoveDto } from '../dtos/make-move.dto';

/**
 * Move Controller
 * Handles move-related HTTP endpoints
 */
@ApiTags('moves')
@ApiBearerAuth()
@Controller('games/:gameId/moves')
@UseGuards(JwtAuthGuard)
export class MoveController {
  constructor(
    private readonly makeMoveUseCase: MakeMoveUseCase,
    private readonly getLegalMovesUseCase: GetLegalMovesUseCase,
    private readonly endGameUseCase: EndGameUseCase,
  ) {}

  /**
   * Make a move
   */
  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Make a move in the game' })
  @ApiResponse({ status: 200, description: 'Move executed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid move' })
  async makeMove(
    @CurrentUser() user: any,
    @Param('gameId') gameId: string,
    @Body() dto: MakeMoveDto,
  ) {
    const result = await this.makeMoveUseCase.execute(
      gameId,
      user.id,
      dto.from,
      dto.to,
      dto.path,
    );

    return {
      success: true,
      data: result,
    };
  }

  /**
   * Get legal moves
   */
  @Get('legal')
  @ApiOperation({ summary: 'Get all legal moves for current player' })
  @ApiResponse({ status: 200, description: 'Legal moves retrieved' })
  async getLegalMoves(@Param('gameId') gameId: string) {
    const moves = await this.getLegalMovesUseCase.execute(gameId);

    return {
      success: true,
      data: moves,
    };
  }

  /**
   * Get legal moves for a specific piece
   */
  @Get('legal/:position')
  @ApiOperation({ summary: 'Get legal moves for a specific piece' })
  @ApiResponse({ status: 200, description: 'Legal moves retrieved' })
  async getLegalMovesForPiece(
    @Param('gameId') gameId: string,
    @Param('position') position: number,
  ) {
    const moves = await this.getLegalMovesUseCase.executeForPiece(
      gameId,
      position,
    );

    return {
      success: true,
      data: moves,
    };
  }

  /**
   * Resign game
   */
  @Post('resign')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resign from the game' })
  @ApiResponse({ status: 200, description: 'Game resigned' })
  async resign(@CurrentUser() user: any, @Param('gameId') gameId: string) {
    await this.endGameUseCase.resign(gameId, user.id);

    return {
      success: true,
      message: 'Game resigned successfully',
    };
  }

  /**
   * Offer/Accept draw
   */
  @Post('draw')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'End game by draw agreement' })
  @ApiResponse({ status: 200, description: 'Draw accepted' })
  async draw(@Param('gameId') gameId: string) {
    await this.endGameUseCase.drawByAgreement(gameId);

    return {
      success: true,
      message: 'Game ended in draw',
    };
  }

  /**
   * Abort game
   */
  @Post('abort')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Abort the game' })
  @ApiResponse({ status: 200, description: 'Game aborted' })
  @ApiResponse({ status: 400, description: 'Cannot abort game after moves' })
  async abort(@Param('gameId') gameId: string) {
    await this.endGameUseCase.abort(gameId);

    return {
      success: true,
      message: 'Game aborted successfully',
    };
  }
}
