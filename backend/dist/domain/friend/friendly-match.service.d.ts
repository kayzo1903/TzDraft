import { PrismaService } from '../../infrastructure/database/prisma/prisma.service';
import { FriendService } from './friend.service';
export declare class FriendlyMatchService {
    private readonly prisma;
    private readonly friendService;
    private readonly logger;
    constructor(prisma: PrismaService, friendService: FriendService);
    createInvite(hostId: string, dto: {
        friendId?: string;
        initialTimeMs?: number;
        gameId?: string;
        roomType?: string;
        rated?: boolean;
        allowSpectators?: boolean;
    }): Promise<{
        host: {
            id: string;
            username: string;
            displayName: string;
        };
        invitedFriend: {
            id: string;
            username: string;
            displayName: string;
        } | null;
    } & {
        id: string;
        status: import("@prisma/client").$Enums.FriendlyMatchStatus;
        createdAt: Date;
        gameId: string | null;
        guestId: string | null;
        inviteToken: string;
        initialTimeMs: number;
        roomType: string;
        hostColor: string;
        rated: boolean;
        allowSpectators: boolean;
        expiresAt: Date;
        acceptedAt: Date | null;
        updatedAt: Date;
        hostId: string;
        invitedFriendId: string | null;
    }>;
    getInviteByToken(token: string): Promise<{
        host: {
            id: string;
            username: string;
            displayName: string;
        };
        invitedFriend: {
            id: string;
            username: string;
            displayName: string;
        } | null;
        guest: {
            id: string;
            username: string;
            displayName: string;
        } | null;
    } & {
        id: string;
        status: import("@prisma/client").$Enums.FriendlyMatchStatus;
        createdAt: Date;
        gameId: string | null;
        guestId: string | null;
        inviteToken: string;
        initialTimeMs: number;
        roomType: string;
        hostColor: string;
        rated: boolean;
        allowSpectators: boolean;
        expiresAt: Date;
        acceptedAt: Date | null;
        updatedAt: Date;
        hostId: string;
        invitedFriendId: string | null;
    }>;
    getInviteById(id: string, actorId: string | null): Promise<{
        host: {
            id: string;
            username: string;
            displayName: string;
        };
        invitedFriend: {
            id: string;
            username: string;
            displayName: string;
        } | null;
        guest: {
            id: string;
            username: string;
            displayName: string;
        } | null;
    } & {
        id: string;
        status: import("@prisma/client").$Enums.FriendlyMatchStatus;
        createdAt: Date;
        gameId: string | null;
        guestId: string | null;
        inviteToken: string;
        initialTimeMs: number;
        roomType: string;
        hostColor: string;
        rated: boolean;
        allowSpectators: boolean;
        expiresAt: Date;
        acceptedAt: Date | null;
        updatedAt: Date;
        hostId: string;
        invitedFriendId: string | null;
    }>;
    listIncoming(userId: string): Promise<({
        host: {
            id: string;
            username: string;
            displayName: string;
        };
    } & {
        id: string;
        status: import("@prisma/client").$Enums.FriendlyMatchStatus;
        createdAt: Date;
        gameId: string | null;
        guestId: string | null;
        inviteToken: string;
        initialTimeMs: number;
        roomType: string;
        hostColor: string;
        rated: boolean;
        allowSpectators: boolean;
        expiresAt: Date;
        acceptedAt: Date | null;
        updatedAt: Date;
        hostId: string;
        invitedFriendId: string | null;
    })[]>;
    listOutgoing(hostId: string): Promise<({
        invitedFriend: {
            id: string;
            username: string;
            displayName: string;
        } | null;
        guest: {
            id: string;
            username: string;
            displayName: string;
        } | null;
    } & {
        id: string;
        status: import("@prisma/client").$Enums.FriendlyMatchStatus;
        createdAt: Date;
        gameId: string | null;
        guestId: string | null;
        inviteToken: string;
        initialTimeMs: number;
        roomType: string;
        hostColor: string;
        rated: boolean;
        allowSpectators: boolean;
        expiresAt: Date;
        acceptedAt: Date | null;
        updatedAt: Date;
        hostId: string;
        invitedFriendId: string | null;
    })[]>;
    cancelInvite(inviteId: string, hostId: string): Promise<{
        id: string;
        status: import("@prisma/client").$Enums.FriendlyMatchStatus;
        createdAt: Date;
        gameId: string | null;
        guestId: string | null;
        inviteToken: string;
        initialTimeMs: number;
        roomType: string;
        hostColor: string;
        rated: boolean;
        allowSpectators: boolean;
        expiresAt: Date;
        acceptedAt: Date | null;
        updatedAt: Date;
        hostId: string;
        invitedFriendId: string | null;
    }>;
    declineInvite(inviteId: string, userId: string): Promise<{
        host: {
            id: string;
            username: string;
            displayName: string;
        };
        invitedFriend: {
            id: string;
            username: string;
            displayName: string;
        } | null;
        guest: {
            id: string;
            username: string;
            displayName: string;
        } | null;
    } & {
        id: string;
        status: import("@prisma/client").$Enums.FriendlyMatchStatus;
        createdAt: Date;
        gameId: string | null;
        guestId: string | null;
        inviteToken: string;
        initialTimeMs: number;
        roomType: string;
        hostColor: string;
        rated: boolean;
        allowSpectators: boolean;
        expiresAt: Date;
        acceptedAt: Date | null;
        updatedAt: Date;
        hostId: string;
        invitedFriendId: string | null;
    }>;
    reserveInviteForAccept(token: string, guestId: string): Promise<{
        host: {
            id: string;
            username: string;
            displayName: string;
        };
        guest: {
            id: string;
            username: string;
            displayName: string;
        } | null;
    } & {
        id: string;
        status: import("@prisma/client").$Enums.FriendlyMatchStatus;
        createdAt: Date;
        gameId: string | null;
        guestId: string | null;
        inviteToken: string;
        initialTimeMs: number;
        roomType: string;
        hostColor: string;
        rated: boolean;
        allowSpectators: boolean;
        expiresAt: Date;
        acceptedAt: Date | null;
        updatedAt: Date;
        hostId: string;
        invitedFriendId: string | null;
    }>;
    attachGame(inviteId: string, gameId: string): Promise<{
        id: string;
        status: import("@prisma/client").$Enums.FriendlyMatchStatus;
        createdAt: Date;
        gameId: string | null;
        guestId: string | null;
        inviteToken: string;
        initialTimeMs: number;
        roomType: string;
        hostColor: string;
        rated: boolean;
        allowSpectators: boolean;
        expiresAt: Date;
        acceptedAt: Date | null;
        updatedAt: Date;
        hostId: string;
        invitedFriendId: string | null;
    }>;
    rollbackAcceptance(inviteId: string): Promise<void>;
    private normalizeInitialTime;
    private expireIfNeeded;
    private cleanupLinkedPendingGame;
}
