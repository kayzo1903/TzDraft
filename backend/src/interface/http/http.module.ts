import { Module } from '@nestjs/common';
import { UseCasesModule } from '../../application/use-cases/use-cases.module';
import { GameController } from './controllers/game.controller';
import { MoveController } from './controllers/move.controller';
import { SupportController } from './controllers/support.controller';
import { EmailModule } from '../../infrastructure/email/email.module';
import { EngineModule } from '../../application/engines/engine.module';
import { SidraController } from './controllers/sidra.controller';
import { FriendController } from './controllers/friend.controller';
import { SystemController } from './controllers/system.controller';
import { FriendlyMatchController } from './controllers/friendly-match.controller';
import { FriendModule } from '../../domain/friend/friend.module';
import { MessagingModule } from '../../infrastructure/messaging/messaging.module';
import { RepositoryModule } from '../../infrastructure/repositories/repository.module';

/**
 * HTTP Module
 * Provides REST API controllers
 */
@Module({
  imports: [
    UseCasesModule,
    EmailModule,
    EngineModule,
    FriendModule,
    MessagingModule,
    RepositoryModule,
  ],
  controllers: [
    GameController,
    MoveController,
    SupportController,
    SidraController,
    FriendController,
    FriendlyMatchController,
    SystemController,
  ],
})
export class HttpModule {}
