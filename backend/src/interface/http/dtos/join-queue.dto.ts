import { IsIn, IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** Allowed time controls in milliseconds: 3 / 5 / 10 / 30 minutes */
export const QUEUE_TIME_OPTIONS = [180000, 300000, 600000, 1800000] as const;
export type QueueTimeMs = (typeof QUEUE_TIME_OPTIONS)[number];

export class JoinQueueDto {
  @ApiProperty({
    description:
      'Time control in milliseconds (3min=180000, 5min=300000, 10min=600000, 30min=1800000)',
    enum: QUEUE_TIME_OPTIONS,
  })
  @IsIn(QUEUE_TIME_OPTIONS)
  timeMs: QueueTimeMs;

  @ApiPropertyOptional({
    description: 'Socket.IO socket ID of the requesting client',
  })
  @IsOptional()
  @IsString()
  socketId?: string;
}
