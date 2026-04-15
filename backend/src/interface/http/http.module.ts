import { Module } from '@nestjs/common';
import { UseCasesModule } from '../../application/use-cases/use-cases.module';
import { MessagingModule } from '../../infrastructure/messaging/messaging.module';
import { GameController } from './controllers/game.controller';
import { MoveController } from './controllers/move.controller';
import { SupportController } from './controllers/support.controller';
import { AiController } from './controllers/ai.controller';
import { EmailModule } from '../../infrastructure/email/email.module';
import { GetAiMoveUseCase } from '../../application/use-cases/get-ai-move.use-case';
import { TournamentController } from './controllers/tournament.controller';
import { NotificationController } from './controllers/notification.controller';
import { RepositoryModule } from '../../infrastructure/repositories/repository.module';
import {
  PuzzleController,
  AdminPuzzleController,
} from './controllers/puzzle.controller';
import {
  StudyController,
  AdminStudyController,
} from './controllers/study.controller';
import { PrismaModule } from '../../infrastructure/database/prisma/prisma.module';
import { PuzzleMinerService } from '../../application/puzzle/puzzle-miner.service';

/**
 * HTTP Module
 * Provides REST API controllers
 */
@Module({
  imports: [
    UseCasesModule,
    MessagingModule,
    EmailModule,
    RepositoryModule,
    PrismaModule,
  ],
  controllers: [
    GameController,
    MoveController,
    SupportController,
    AiController,
    TournamentController,
    NotificationController,
    PuzzleController,
    AdminPuzzleController,
    StudyController,
    AdminStudyController,
  ],
  providers: [GetAiMoveUseCase, PuzzleMinerService],
})
export class HttpModule {}
