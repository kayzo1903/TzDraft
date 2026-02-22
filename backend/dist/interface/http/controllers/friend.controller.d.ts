import { SendFriendRequestUseCase, AcceptFriendRequestUseCase, RejectFriendRequestUseCase, GetFriendsUseCase, GetPendingFriendRequestsUseCase, RemoveFriendUseCase, GetSentFriendRequestsUseCase, CancelFriendRequestUseCase } from '../../../application/use-cases';
import { GamesGateway } from '../../../infrastructure/messaging/games.gateway';
import { SendFriendRequestDto } from '../dtos';
export declare class FriendController {
    private readonly sendFriendRequestUseCase;
    private readonly acceptFriendRequestUseCase;
    private readonly rejectFriendRequestUseCase;
    private readonly getFriendsUseCase;
    private readonly getPendingFriendRequestsUseCase;
    private readonly removeFriendUseCase;
    private readonly getSentFriendRequestsUseCase;
    private readonly cancelFriendRequestUseCase;
    private readonly gamesGateway;
    constructor(sendFriendRequestUseCase: SendFriendRequestUseCase, acceptFriendRequestUseCase: AcceptFriendRequestUseCase, rejectFriendRequestUseCase: RejectFriendRequestUseCase, getFriendsUseCase: GetFriendsUseCase, getPendingFriendRequestsUseCase: GetPendingFriendRequestsUseCase, removeFriendUseCase: RemoveFriendUseCase, getSentFriendRequestsUseCase: GetSentFriendRequestsUseCase, cancelFriendRequestUseCase: CancelFriendRequestUseCase, gamesGateway: GamesGateway);
    sendFriendRequest(user: any, dto: SendFriendRequestDto): Promise<import("../../../domain/friend/entities/friend-request.entity").FriendRequest>;
    acceptFriendRequest(user: any, requesterId: string): Promise<import("../../../domain/friend/entities/friend-request.entity").FriendRequest>;
    rejectFriendRequest(user: any, requesterId: string): Promise<import("../../../domain/friend/entities/friend-request.entity").FriendRequest>;
    cancelFriendRequest(user: any, requesteeId: string): Promise<void>;
    getFriends(user: any): Promise<{
        id: string;
        username: string;
        displayName: string;
        rating: number;
        friendSince: Date;
    }[]>;
    getOnlineFriends(user: any): Promise<{
        onlineIds: string[];
        onlineMap: any;
    }>;
    getPendingRequests(user: any): Promise<({
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
    getSentRequests(user: any): Promise<({
        requestee: {
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
    removeFriend(user: any, friendId: string): Promise<void>;
}
