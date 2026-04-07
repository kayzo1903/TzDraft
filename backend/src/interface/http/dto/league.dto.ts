import { IsString, IsNotEmpty, IsNumber, Min, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateLeagueDto {
  @ApiProperty({ description: 'The name of the league', example: 'Summer Championship 2026' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Duration of each round in days', minimum: 1, default: 7 })
  @IsNumber()
  @Min(1)
  roundDurationDays: number;
}

export class StartGameDto {
  @ApiProperty({ description: 'Game number to start (1 or 2)', enum: [1, 2] })
  @IsNumber()
  @Min(1)
  gameNumber: number;
}

export class ClaimForfeitDto {
  @ApiPropertyOptional({ description: 'Player ID to forfeit (used by system/admin only)' })
  @IsString()
  @IsOptional()
  forfeitedPlayerId?: string;
}
