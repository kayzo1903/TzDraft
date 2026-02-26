import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { GetAiMoveUseCase } from '../../../application/use-cases/get-ai-move.use-case';

export class AiMoveRequestDto {
  boardStatePieces: {
    type: 'MAN' | 'KING';
    color: 'WHITE' | 'BLACK';
    position: number;
  }[];
  currentPlayer: 'WHITE' | 'BLACK';
  aiLevel: number;
  timeLimitMs?: number;
  /** Square number (1-32) from which the AI must continue a capture chain. */
  mustContinueFrom?: number | null;
}

/**
 * AI Controller
 * Exposes stateless engine connections (CAKE, SiDra, Kallisto).
 * This endpoint is public for local play.
 */
@ApiTags('ai')
@Controller('ai')
export class AiController {
  constructor(private readonly getAiMoveUseCase: GetAiMoveUseCase) {}

  @Post('move')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Calculate best AI move for a given board state' })
  @ApiResponse({ status: 200, description: 'Move calculated' })
  async getMove(@Body() dto: AiMoveRequestDto) {
    const move = await this.getAiMoveUseCase.execute({
      boardStatePieces: dto.boardStatePieces,
      currentPlayer: dto.currentPlayer,
      aiLevel: dto.aiLevel,
      timeLimitMs: dto.timeLimitMs || 3000,
      mustContinueFrom: dto.mustContinueFrom ?? null,
    });

    return {
      success: true,
      data: move,
    };
  }
}
