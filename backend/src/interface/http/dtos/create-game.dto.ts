import {
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  Min,
  Max,
  IsBoolean,
  IsIn,
  IsArray,
  ValidateNested,
  IsInt,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { PlayerColor } from '../../../shared/constants/game.constants';

/**
 * Create Invite Game DTO
 */
export class CreateInviteGameDto {
  @ApiProperty({
    description: 'Creator color',
    enum: ['WHITE', 'BLACK', 'RANDOM'],
  })
  @IsIn(['WHITE', 'BLACK', 'RANDOM'])
  color: PlayerColor | 'RANDOM';

  @ApiProperty({
    description: 'Initial time in milliseconds (minimum 60000 = 1 min)',
    required: false,
  })
  @IsNumber()
  @IsOptional()
  @Min(60000)
  timeMs?: number;
}

/**
 * Join Invite Game DTO
 */
export class JoinInviteGameDto {
  // No body needed — code is in URL path
}

/**
 * Create PvE Game DTO
 */
export class CreatePvEGameDto {
  @ApiProperty({ description: 'Player ID' })
  @IsString()
  playerId: string;

  @ApiProperty({ description: 'Player color', enum: PlayerColor })
  @IsEnum(PlayerColor)
  playerColor: PlayerColor;

  @ApiProperty({ description: 'Player ELO rating', required: false })
  @IsNumber()
  @IsOptional()
  playerElo?: number;

  @ApiProperty({
    description: 'AI difficulty level (1-19)',
    minimum: 1,
    maximum: 19,
  })
  @IsNumber()
  @Min(1)
  @Max(19)
  aiLevel: number;

  @ApiProperty({ description: 'Initial time in milliseconds', required: false })
  @IsNumber()
  @IsOptional()
  initialTimeMs?: number;
}

export class StartAiChallengeSessionDto {
  @ApiProperty({
    description: 'AI difficulty level (1-19)',
    minimum: 1,
    maximum: 19,
  })
  @IsNumber()
  @Min(1)
  @Max(19)
  aiLevel: number;

  @ApiProperty({ description: 'Player color', enum: PlayerColor })
  @IsEnum(PlayerColor)
  playerColor: PlayerColor;
}

export class CompleteAiChallengeSessionDto {
  @ApiProperty({ enum: ['WIN', 'LOSS', 'DRAW'] })
  @IsIn(['WIN', 'LOSS', 'DRAW'])
  result: 'WIN' | 'LOSS' | 'DRAW';

  @ApiProperty({ description: 'Whether undo was used during the AI challenge' })
  @IsBoolean()
  undoUsed: boolean;
}

export class SyncAiProgressDto {
  @ApiProperty({
    description:
      'Levels completed locally without undo, to be merged into server progression',
    type: [Number],
  })
  @IsArray()
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(19, { each: true })
  completedLevels: number[];

  @ApiProperty({
    description: 'Highest locally unlocked AI level',
    minimum: 1,
    maximum: 19,
  })
  @IsInt()
  @Min(1)
  @Max(19)
  maxUnlockedAiLevel: number;
}

export class RecordMoveDto {
  @IsInt() @Min(1) @Max(32) fromSquare: number;
  @IsInt() @Min(1) @Max(32) toSquare: number;
  @IsIn(['WHITE', 'BLACK']) player: 'WHITE' | 'BLACK';
  @IsArray() @IsInt({ each: true }) capturedSquares: number[];
  @IsBoolean() isPromotion: boolean;
  @IsString() notation: string;
  @IsOptional() @IsInt() engineEval?: number;
}

export class RecordGameDto {
  @IsIn(['WHITE', 'BLACK', 'DRAW']) winner: 'WHITE' | 'BLACK' | 'DRAW';
  @IsOptional()
  @IsIn(['STALEMATE', 'CHECKMATE', 'RESIGN', 'TIME', 'DISCONNECT', 'DRAW'])
  endReason?: string;
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RecordMoveDto)
  moves: RecordMoveDto[];
}
