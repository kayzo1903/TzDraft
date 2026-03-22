import {
  IsString,
  IsEnum,
  IsOptional,
  IsInt,
  IsDateString,
  Min,
  MinLength,
  ValidateIf,
  IsIn,
} from 'class-validator';
import { TournamentFormat, TournamentStyle, TournamentScope } from '../../../domain/tournament/entities/tournament.entity';
import { TournamentStatus } from '../../../domain/tournament/entities/tournament.entity';

export class CreateTournamentDto {
  @IsString() @MinLength(3)
  name: string;

  @IsString() @MinLength(10)
  descriptionEn: string;

  @IsString() @MinLength(10)
  descriptionSw: string;

  @IsOptional() @IsString()
  rulesEn?: string;

  @IsOptional() @IsString()
  rulesSw?: string;

  @IsEnum(TournamentFormat)
  format: TournamentFormat;

  @IsEnum(TournamentStyle)
  style: TournamentStyle;

  @IsOptional() @IsEnum(TournamentScope)
  scope?: TournamentScope;

  @IsOptional() @IsString()
  country?: string;

  @IsOptional() @IsString()
  region?: string;

  @IsInt() @Min(4)
  maxPlayers: number;

  @IsOptional() @IsInt() @Min(4)
  minPlayers?: number;

  @IsDateString()
  scheduledStartAt: string;

  @IsOptional() @IsDateString()
  registrationDeadline?: string;

  @IsOptional() @IsInt() @Min(0)
  minElo?: number;

  @IsOptional() @IsInt() @Min(0)
  maxElo?: number;

  @IsOptional() @IsInt() @Min(0)
  minMatchmakingWins?: number;

  @IsOptional() @IsInt() @Min(1)
  minAiLevelBeaten?: number;

  @IsOptional() @IsInt() @Min(1)
  requiredAiLevelPlayed?: number;
}

export class ListTournamentsQueryDto {
  @IsOptional() @IsEnum(TournamentStatus)
  status?: TournamentStatus;

  @IsOptional() @IsEnum(TournamentFormat)
  format?: TournamentFormat;

  @IsOptional() @IsEnum(TournamentScope)
  scope?: TournamentScope;

  @IsOptional() @IsString()
  country?: string;

  @IsOptional() @IsString()
  region?: string;
}

export class UpdateTournamentDto {
  @IsOptional() @IsString() @MinLength(3)
  name?: string;

  @IsOptional() @IsString() @MinLength(10)
  descriptionEn?: string;

  @IsOptional() @IsString() @MinLength(10)
  descriptionSw?: string;

  @ValidateIf((_, value) => value !== undefined && value !== null)
  @IsString()
  rulesEn?: string | null;

  @ValidateIf((_, value) => value !== undefined && value !== null)
  @IsString()
  rulesSw?: string | null;

  @IsOptional() @IsEnum(TournamentStyle)
  style?: TournamentStyle;

  @IsOptional() @IsEnum(TournamentScope)
  scope?: TournamentScope;

  @ValidateIf((_, value) => value !== undefined && value !== null)
  @IsString()
  country?: string | null;

  @ValidateIf((_, value) => value !== undefined && value !== null)
  @IsString()
  region?: string | null;

  @IsOptional() @IsInt() @Min(4)
  maxPlayers?: number;

  @IsOptional() @IsInt() @Min(4)
  minPlayers?: number;

  @IsOptional() @IsDateString()
  scheduledStartAt?: string;

  @ValidateIf((_, value) => value !== undefined && value !== null)
  @IsDateString()
  registrationDeadline?: string | null;
}
