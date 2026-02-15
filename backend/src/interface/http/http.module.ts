import { Module } from '@nestjs/common';
import { UseCasesModule } from '../../application/use-cases/use-cases.module';
import { GameController } from './controllers/game.controller';
import { MoveController } from './controllers/move.controller';
import { SupportController } from './controllers/support.controller';
import { EmailModule } from '../../infrastructure/email/email.module';
import { EngineModule } from '../../application/engines/engine.module';
import { SidraController } from './controllers/sidra.controller';

/**
 * HTTP Module
 * Provides REST API controllers
 */
@Module({
  imports: [UseCasesModule, EmailModule, EngineModule],
  controllers: [
    GameController,
    MoveController,
    SupportController,
    SidraController,
  ],
})
export class HttpModule {}
