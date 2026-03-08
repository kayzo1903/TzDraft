import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { AdminController } from '../interface/http/controllers/admin.controller';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../infrastructure/database/prisma/prisma.module';
import {
  PrismaHealthIndicator,
  RedisHealthIndicator,
} from '../health/health.controller';

@Module({
  imports: [TerminusModule, PrismaModule, AuthModule],
  controllers: [AdminController],
  providers: [PrismaHealthIndicator, RedisHealthIndicator],
})
export class AdminModule {}
