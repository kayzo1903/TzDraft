import { PrismaService } from '../../infrastructure/database/prisma/prisma.service';
import { FriendRequest } from './entities/friend-request.entity';
export declare class FriendService {
    private prisma;
    constructor(prisma: PrismaService);
    sendFriendRequest(requesterId: string, requesteeId: string): Promise<FriendRequest>;
    acceptFriendRequest(requesterId: string, requesteeId: string): Promise<FriendRequest>;
    rejectFriendRequest(requesterId: string, requesteeId: string): Promise<FriendRequest>;
    getPendingRequests(userId: string): Promise<({
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
    getSentRequests(userId: string): Promise<({
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
    getFriends(userId: string): Promise<{
        id: string;
        username: string;
        displayName: string;
        rating: number;
        friendSince: Date;
    }[]>;
    areFriends(userId1: string, userId2: string): Promise<boolean>;
    removeFriend(userId: string, friendId: string): Promise<void>;
    cancelFriendRequest(requesterId: string, requesteeId: string): Promise<void>;
}
