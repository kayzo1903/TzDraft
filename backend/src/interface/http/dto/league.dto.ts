import { IsString, IsNotEmpty, IsNumber, Min, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateLeagueDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  descriptionEn: string;

  @IsString()
  @IsNotEmpty()
  descriptionSw: string;

  @IsOptional()
  @IsString()
  rulesEn?: string | null;

  @IsOptional()
  @IsString()
  rulesSw?: string | null;

  @IsString()
  @IsNotEmpty()
  style: 'BLITZ' | 'RAPID' | 'CLASSICAL' | 'UNLIMITED';

  @IsString()
  @IsNotEmpty()
  scope: 'GLOBAL' | 'COUNTRY' | 'REGION';

  @IsOptional()
  @IsString()
  country?: string | null;

  @IsOptional()
  @IsString()
  region?: string | null;

  @IsOptional()
  @IsNumber()
  minElo?: number | null;

  @IsOptional()
  @IsNumber()
  maxElo?: number | null;

  @IsOptional()
  @IsNumber()
  minMatchmakingWins?: number | null;

  @IsOptional()
  @IsNumber()
  minAiLevelBeaten?: number | null;

  @IsOptional()
  @IsNumber()
  requiredAiLevelPlayed?: number | null;

  @IsNumber()
  @Min(4)
  minPlayers: number;

  @IsNumber()
  @Min(4)
  maxPlayers: number;

  @IsString()
  @IsNotEmpty()
  scheduledStartAt: string;

  @IsOptional()
  @IsString()
  registrationDeadline?: string | null;

  @IsNumber()
  @Min(1)
  roundDurationDays: number;

  @IsOptional()
  prizes?: {
    placement: number;
    amount: number;
    currency: 'TSH' | 'USD';
    label?: string;
  }[];
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
