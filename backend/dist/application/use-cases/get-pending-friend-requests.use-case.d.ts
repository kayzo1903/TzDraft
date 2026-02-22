import { FriendService } from '../../domain/friend/friend.service';
export declare class GetPendingFriendRequestsUseCase {
    private friendService;
    constructor(friendService: FriendService);
    execute(userId: string): Promise<({
        requester: {
            rating: {
                rating: number;
                gamesPlayed: number;
                lastUpdated: Date;
                userId: string;
            } | null;
            id: string;
            username: string;
            displayName: string;
        };
    } & {
        id: string;
        status: import("@prisma/client").$Enums.FriendRequestStatus;
        createdAt: Date;
        requesterId: string;
        requesteeId: string;
        respondedAt: Date | null;
    })[]>;
}
