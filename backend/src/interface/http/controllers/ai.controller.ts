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
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { GetAiMoveUseCase } from '../../../application/use-cases/get-ai-move.use-case';
import { MkaguziAdapter } from '../../../infrastructure/engine/mkaguzi.adapter';

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

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(40)
  history?: string[];
}

export class AiAnalyzeRequestDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BoardPieceDto)
  pieces: BoardPieceDto[];

  @IsIn(['WHITE', 'BLACK'])
  currentPlayer: 'WHITE' | 'BLACK';
}

/**
 * AI Controller
 * Exposes engine endpoints: CAKE (levels 1-9, frontend-side) and Mkaguzi (levels 10-19, backend).
 * These endpoints are public for local play and analysis.
 */
@ApiTags('ai')
@Controller('ai')
export class AiController {
  constructor(
    private readonly getAiMoveUseCase: GetAiMoveUseCase,
    private readonly mkaguziAdapter: MkaguziAdapter,
  ) {}

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
      history: dto.history ?? [],
    });

    return {
      success: true,
      data: move,
    };
  }

  @Post('analyze')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Return Mkaguzi eval trace (material, mobility, structure, patterns, kingSafety, tempo) for a position' })
  @ApiResponse({ status: 200, description: 'Eval trace returned' })
  async analyzePosition(@Body() dto: AiAnalyzeRequestDto) {
    const result = await this.mkaguziAdapter.analyze(dto.pieces, dto.currentPlayer);
    return {
      success: true,
      data: result,
    };
  }
}
