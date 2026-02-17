import { Module } from '@nestjs/common';
import { RepositoryModule } from '../../infrastructure/repositories/repository.module';
import { MessagingModule } from '../../infrastructure/messaging/messaging.module';
import { CreateGameUseCase } from './create-game.use-case';
import { MakeMoveUseCase } from './make-move.use-case';
import { GetGameStateUseCase } from './get-game-state.use-case';
import { GetLegalMovesUseCase } from './get-legal-moves.use-case';
import { EndGameUseCase } from './end-game.use-case';
import { SendFriendRequestUseCase } from './send-friend-request.use-case';
import { AcceptFriendRequestUseCase } from './accept-friend-request.use-case';
import { RejectFriendRequestUseCase } from './reject-friend-request.use-case';
import { GetFriendsUseCase } from './get-friends.use-case';
import { GetPendingFriendRequestsUseCase } from './get-pending-friend-requests.use-case';
import { RemoveFriendUseCase } from './remove-friend.use-case';
import { GetSentFriendRequestsUseCase } from './get-sent-friend-requests.use-case';
import { CancelFriendRequestUseCase } from './cancel-friend-request.use-case';

/**
 * Use Cases Module
 * Provides all application use cases
 */
import { UserModule } from '../../domain/user/user.module';
import { FriendModule } from '../../domain/friend/friend.module';

@Module({
  imports: [RepositoryModule, MessagingModule, UserModule, FriendModule],
  providers: [
    CreateGameUseCase,
    MakeMoveUseCase,
    GetGameStateUseCase,
    GetLegalMovesUseCase,
    EndGameUseCase,
    SendFriendRequestUseCase,
    AcceptFriendRequestUseCase,
    RejectFriendRequestUseCase,
    GetFriendsUseCase,
    GetPendingFriendRequestsUseCase,
    RemoveFriendUseCase,
    GetSentFriendRequestsUseCase,
    CancelFriendRequestUseCase,
  ],
  exports: [
    CreateGameUseCase,
    MakeMoveUseCase,
    GetGameStateUseCase,
    GetLegalMovesUseCase,
    EndGameUseCase,
    SendFriendRequestUseCase,
    AcceptFriendRequestUseCase,
    RejectFriendRequestUseCase,
    GetFriendsUseCase,
    GetPendingFriendRequestsUseCase,
    RemoveFriendUseCase,
    GetSentFriendRequestsUseCase,
    CancelFriendRequestUseCase,
  ],
})
export class UseCasesModule {}
