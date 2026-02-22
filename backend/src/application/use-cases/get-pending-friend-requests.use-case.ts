import { Injectable } from '@nestjs/common';
import { FriendService } from '../../domain/friend/friend.service';

@Injectable()
export class GetPendingFriendRequestsUseCase {
  constructor(private friendService: FriendService) {}

  async execute(userId: string) {
    return await this.friendService.getPendingRequests(userId);
  }
}
