import { Module } from '@nestjs/common';
import { CleanupService } from './cleanup.service';
import { ReportService } from './report.service';
import { PrismaModule } from '../database/prisma/prisma.module';
import { EmailModule } from '../email/email.module';
import { PuzzleMinerService } from '../../application/puzzle/puzzle-miner.service';
import { AdminModule } from '../../admin/admin.module';
import { MessagingModule } from '../messaging/messaging.module';
import { RepositoryModule } from '../repositories/repository.module';
import { TournamentTasksService } from './tournament-tasks.service';
import { UseCasesModule } from '../../application/use-cases/use-cases.module';

@Module({
  imports: [
    PrismaModule,
    EmailModule,
    AdminModule,
    MessagingModule,
    RepositoryModule,
    UseCasesModule,
  ],
  // MkaguziAdapter is injected from the global EngineModule
  providers: [
    CleanupService,
    ReportService,
    PuzzleMinerService,
    TournamentTasksService,
  ],
  exports: [ReportService],
})
export class TasksModule {}
