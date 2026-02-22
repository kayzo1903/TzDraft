import { FriendService } from '../../domain/friend/friend.service';
export declare class RemoveFriendUseCase {
    private friendService;
    constructor(friendService: FriendService);
    execute(userId: string, friendId: string): Promise<void>;
}
