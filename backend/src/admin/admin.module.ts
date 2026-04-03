import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { AdminController } from '../interface/http/controllers/admin.controller';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../infrastructure/database/prisma/prisma.module';
import { RedisModule } from '../infrastructure/cache/redis.module';
import {
  PrismaHealthIndicator,
  RedisHealthIndicator,
} from '../health/health.controller';
import { AnalyticsService } from './analytics.service';

@Module({
  imports: [TerminusModule, PrismaModule, RedisModule, AuthModule],
  controllers: [AdminController],
  providers: [PrismaHealthIndicator, RedisHealthIndicator, AnalyticsService],
  exports: [AnalyticsService],
})
export class AdminModule {}

