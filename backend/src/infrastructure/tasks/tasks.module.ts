import { Module } from '@nestjs/common';
import { CleanupService } from './cleanup.service';
import { DailyReportService } from './daily-report.service';
import { PrismaModule } from '../database/prisma/prisma.module';
import { EmailModule } from '../email/email.module';
import { PuzzleMinerService } from '../../application/puzzle/puzzle-miner.service';
import { AdminModule } from '../../admin/admin.module';
import { LeagueTasksService } from './league-tasks.service';
import { LeagueUseCasesModule } from '../../application/use-cases/league/league-use-cases.module';
import { MessagingModule } from '../messaging/messaging.module';
import { RepositoryModule } from '../repositories/repository.module';

@Module({
  imports: [PrismaModule, EmailModule, AdminModule, LeagueUseCasesModule, MessagingModule, RepositoryModule],
  // MkaguziAdapter is injected from the global EngineModule
  providers: [CleanupService, DailyReportService, PuzzleMinerService, LeagueTasksService],
})
export class TasksModule {}
