import { FriendService } from '../../domain/friend/friend.service';
export declare class CancelFriendRequestUseCase {
    private readonly friendService;
    constructor(friendService: FriendService);
    execute(requesterId: string, requesteeId: string): Promise<void>;
}
