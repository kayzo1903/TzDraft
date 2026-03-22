import {
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  Min,
  Max,
  IsBoolean,
  IsIn,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import {
  PlayerColor,
} from '../../../shared/constants/game.constants';

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
 * Create PvP Game DTO
 */
export class CreatePvPGameDto {
  @ApiProperty({ description: 'White player ID' })
  @IsString()
  whitePlayerId: string;

  @ApiProperty({ description: 'Black player ID' })
  @IsString()
  blackPlayerId: string;

  @ApiProperty({ description: 'White player ELO rating', required: false })
  @IsNumber()
  @IsOptional()
  whiteElo?: number;

  @ApiProperty({ description: 'Black player ELO rating', required: false })
  @IsNumber()
  @IsOptional()
  blackElo?: number;
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
