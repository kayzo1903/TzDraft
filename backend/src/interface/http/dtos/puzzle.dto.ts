import {
  IsInt,
  IsOptional,
  IsString,
  Min,
  Max,
  IsArray,
  ValidateNested,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';

// ── Public endpoints ───────────────────────────────────────────────────────

export class ListPuzzlesQueryDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  @Type(() => Number)
  limit?: number = 20;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  @Type(() => Number)
  difficulty?: number;

  @IsOptional()
  @IsString()
  theme?: string;
}

export class SolveMoveDto {
  @IsInt()
  @Min(1)
  @Max(32)
  from: number;

  @IsInt()
  @Min(1)
  @Max(32)
  to: number;

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  captures?: number[] = [];
}

export class SubmitAttemptDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SolveMoveDto)
  moves: SolveMoveDto[];
}

// ── Admin endpoints ────────────────────────────────────────────────────────

export class ListPendingPuzzlesQueryDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 20;
}

export class ApprovePuzzleDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  @Type(() => Number)
  difficulty?: number;

  @IsOptional()
  @IsString()
  theme?: string;
}

export class TriggerMiningDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(90)
  @Type(() => Number)
  days?: number = 1;

  /**
   * When true, clears the minedForPuzzles flag on all games in the window
   * before running, so previously-scanned games get re-analyzed.
   */
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  force?: boolean = false;
}
