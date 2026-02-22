import { Injectable } from '@nestjs/common';
import { FriendService } from '../../domain/friend/friend.service';

@Injectable()
export class CancelFriendRequestUseCase {
  constructor(private readonly friendService: FriendService) {}

  async execute(requesterId: string, requesteeId: string) {
    return await this.friendService.cancelFriendRequest(
      requesterId,
      requesteeId,
    );
  }
}
