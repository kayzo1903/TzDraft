import { IsNumber, IsArray, IsOptional, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Make Move DTO
 */
export class MakeMoveDto {
  @ApiProperty({
    description: 'Starting square (1-32)',
    minimum: 1,
    maximum: 32,
  })
  @IsNumber()
  @Min(1)
  @Max(32)
  from: number;

  @ApiProperty({
    description: 'Destination square (1-32)',
    minimum: 1,
    maximum: 32,
  })
  @IsNumber()
  @Min(1)
  @Max(32)
  to: number;

  @ApiProperty({
    description: 'Path for multi-capture (optional)',
    type: [Number],
    required: false,
  })
  @IsArray()
  @IsOptional()
  path?: number[];
}
