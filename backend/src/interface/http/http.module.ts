import { Module } from '@nestjs/common';
import { UseCasesModule } from '../../application/use-cases/use-cases.module';
import { GameController } from './controllers/game.controller';
import { MoveController } from './controllers/move.controller';

/**
 * HTTP Module
 * Provides REST API controllers
 */
@Module({
  imports: [UseCasesModule],
  controllers: [GameController, MoveController],
})
export class HttpModule {}
