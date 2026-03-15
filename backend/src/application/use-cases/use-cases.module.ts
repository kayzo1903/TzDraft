import { Module, forwardRef } from '@nestjs/common';
import { RepositoryModule } from '../../infrastructure/repositories/repository.module';
import { MessagingModule } from '../../infrastructure/messaging/messaging.module';
import { CreateGameUseCase } from './create-game.use-case';
import { MakeMoveUseCase } from './make-move.use-case';
import { GetGameStateUseCase } from './get-game-state.use-case';
import { GetLegalMovesUseCase } from './get-legal-moves.use-case';
import { EndGameUseCase } from './end-game.use-case';
import { JoinQueueUseCase } from './join-queue.use-case';
import { RatingService } from './rating.service';
import { GetGameHistoryUseCase } from './get-game-history.use-case';
import { GetPlayerStatsUseCase } from './get-player-stats.use-case';
import { UserModule } from '../../domain/user/user.module';

/**
 * Use Cases Module
 * Provides all application use cases
 */
@Module({
  imports: [RepositoryModule, forwardRef(() => MessagingModule), UserModule],
  providers: [
    RatingService,
    CreateGameUseCase,
    MakeMoveUseCase,
    GetGameStateUseCase,
    GetLegalMovesUseCase,
    EndGameUseCase,
    JoinQueueUseCase,
    GetGameHistoryUseCase,
    GetPlayerStatsUseCase,
  ],
  exports: [
    RatingService,
    CreateGameUseCase,
    MakeMoveUseCase,
    GetGameStateUseCase,
    GetLegalMovesUseCase,
    EndGameUseCase,
    JoinQueueUseCase,
    GetGameHistoryUseCase,
    GetPlayerStatsUseCase,
  ],
})
export class UseCasesModule {}
