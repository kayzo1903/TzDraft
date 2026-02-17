import { Injectable } from '@nestjs/common';
import { FriendService } from '../../domain/friend/friend.service';

@Injectable()
export class GetSentFriendRequestsUseCase {
  constructor(private readonly friendService: FriendService) {}

  async execute(userId: string) {
    return await this.friendService.getSentRequests(userId);
  }
}
