import { Module } from '@nestjs/common';
import { RepositoryModule } from '../../infrastructure/repositories/repository.module';
import { MessagingModule } from '../../infrastructure/messaging/messaging.module';
import { CreateGameUseCase } from './create-game.use-case';
import { MakeMoveUseCase } from './make-move.use-case';
import { GetGameStateUseCase } from './get-game-state.use-case';
import { GetLegalMovesUseCase } from './get-legal-moves.use-case';
import { EndGameUseCase } from './end-game.use-case';

/**
 * Use Cases Module
 * Provides all application use cases
 */
import { UserModule } from '../../domain/user/user.module';

@Module({
  imports: [RepositoryModule, MessagingModule, UserModule],
  providers: [
    CreateGameUseCase,
    MakeMoveUseCase,
    GetGameStateUseCase,
    GetLegalMovesUseCase,
    EndGameUseCase,
  ],
  exports: [
    CreateGameUseCase,
    MakeMoveUseCase,
    GetGameStateUseCase,
    GetLegalMovesUseCase,
    EndGameUseCase,
  ],
})
export class UseCasesModule {}
