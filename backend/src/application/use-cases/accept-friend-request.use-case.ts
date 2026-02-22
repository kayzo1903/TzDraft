import { Injectable } from '@nestjs/common';
import { FriendService } from '../../domain/friend/friend.service';

@Injectable()
export class AcceptFriendRequestUseCase {
  constructor(private friendService: FriendService) {}

  async execute(requesterId: string, requesteeId: string) {
    return await this.friendService.acceptFriendRequest(requesterId, requesteeId);
  }
}
