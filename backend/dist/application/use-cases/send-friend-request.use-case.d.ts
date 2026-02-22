import { FriendService } from '../../domain/friend/friend.service';
export declare class SendFriendRequestUseCase {
    private friendService;
    constructor(friendService: FriendService);
    execute(requesterId: string, requesteeId: string): Promise<import("../../domain/friend/entities/friend-request.entity").FriendRequest>;
}
