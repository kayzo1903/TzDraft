import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import {
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { GetAiMoveUseCase } from '../../../application/use-cases/get-ai-move.use-case';

class BoardPieceDto {
  @IsIn(['MAN', 'KING'])
  type: 'MAN' | 'KING';

  @IsIn(['WHITE', 'BLACK'])
  color: 'WHITE' | 'BLACK';

  @IsInt()
  @Min(1)
  @Max(32)
  position: number;
}

export class AiMoveRequestDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BoardPieceDto)
  boardStatePieces: BoardPieceDto[];

  @IsIn(['WHITE', 'BLACK'])
  currentPlayer: 'WHITE' | 'BLACK';

  @IsInt()
  @Min(1)
  @Max(19)
  aiLevel: number;

  @IsOptional()
  @IsNumber()
  timeLimitMs?: number;

  @IsOptional()
  @IsInt()
  mustContinueFrom?: number | null;
}

/**
 * AI Controller
 * Exposes stateless engine connections (CAKE, SiDra).
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
