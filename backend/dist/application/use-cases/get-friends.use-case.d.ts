import { FriendService } from '../../domain/friend/friend.service';
export declare class GetFriendsUseCase {
    private friendService;
    constructor(friendService: FriendService);
    execute(userId: string): Promise<{
        id: string;
        username: string;
        displayName: string;
        rating: number;
        friendSince: Date;
    }[]>;
}
