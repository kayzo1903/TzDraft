import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateStudyDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

export class SaveStudyDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  /** Full FEN history — one entry per position (including initial FEN). */
  @IsArray()
  @IsString({ each: true })
  fenHistory: string[];

  /** Move records serialized from the mobile hook. */
  @IsArray()
  moveHistory: Array<{
    from: number;
    to: number;
    notation: string;
    player: string;
    captureCount: number;
  }>;

  @IsInt()
  @Min(1)
  moveCount: number;
}
