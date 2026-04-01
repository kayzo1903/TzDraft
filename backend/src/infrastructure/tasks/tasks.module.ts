import { Module } from '@nestjs/common';
import { CleanupService } from './cleanup.service';
import { PrismaModule } from '../database/prisma/prisma.module';
import { PuzzleMinerService } from '../../application/puzzle/puzzle-miner.service';

@Module({
  imports: [PrismaModule],
  // MkaguziAdapter is injected from the global EngineModule
  providers: [CleanupService, PuzzleMinerService],
})
export class TasksModule {}
