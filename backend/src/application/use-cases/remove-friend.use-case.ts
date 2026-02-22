import { Injectable } from '@nestjs/common';
import { FriendService } from '../../domain/friend/friend.service';

@Injectable()
export class RemoveFriendUseCase {
  constructor(private friendService: FriendService) {}

  async execute(userId: string, friendId: string) {
    return await this.friendService.removeFriend(userId, friendId);
  }
}
