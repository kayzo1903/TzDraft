import { Module } from '@nestjs/common';
import { CleanupService } from './cleanup.service';
import { DailyReportService } from './daily-report.service';
import { PrismaModule } from '../database/prisma/prisma.module';
import { EmailModule } from '../email/email.module';
import { PuzzleMinerService } from '../../application/puzzle/puzzle-miner.service';
import { AdminModule } from '../../admin/admin.module';

@Module({
  imports: [PrismaModule, EmailModule, AdminModule],
  // MkaguziAdapter is injected from the global EngineModule
  providers: [CleanupService, DailyReportService, PuzzleMinerService],
})
export class TasksModule {}
