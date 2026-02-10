import { IsString, IsNumber, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import {
  GameType,
  PlayerColor,
} from '../../../shared/constants/game.constants';

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
    description: 'AI difficulty level (1-7)',
    minimum: 1,
    maximum: 7,
  })
  @IsNumber()
  aiLevel: number;

  @ApiProperty({ description: 'Initial time in milliseconds', required: false })
  @IsNumber()
  @IsOptional()
  initialTimeMs?: number;
}
