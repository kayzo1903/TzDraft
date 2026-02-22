import { CreateGameUseCase } from '../../../application/use-cases/create-game.use-case';
import { FriendlyMatchService } from '../../../domain/friend/friendly-match.service';
import { GamesGateway } from '../../../infrastructure/messaging/games.gateway';
import type { IGameRepository } from '../../../domain/game/repositories/game.repository.interface';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
export declare class FriendlyMatchController {
    private readonly friendlyMatchService;
    private readonly createGameUseCase;
    private readonly gamesGateway;
    private readonly prisma;
    private readonly gameRepository;
    private readonly inviteViewers;
    constructor(friendlyMatchService: FriendlyMatchService, createGameUseCase: CreateGameUseCase, gamesGateway: GamesGateway, prisma: PrismaService, gameRepository: IGameRepository);
    createInvite(user: any, dto: {
        friendId?: string;
        initialTimeMs?: number;
        locale?: 'en' | 'sw';
        roomType?: string;
        rated?: boolean;
        allowSpectators?: boolean;
    }): Promise<any>;
    getInvite(user: any, token: string, guestId?: string, req?: any): Promise<{
        canAccept: boolean;
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
    incoming(user: any): Promise<({
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
    outgoing(user: any): Promise<({
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
    getById(user: any, id: string, guestId?: string): Promise<{
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
    accept(user: any, token: string, req: any, body?: {
        guestId?: string;
        guestName?: string;
    }): Promise<{
        status: string;
        gameId: string;
        inviteId: string;
        playerColor: string | null;
    }>;
    decline(user: any, id: string): Promise<{
        status: string;
    }>;
    cancel(user: any, id: string): Promise<{
        status: string;
    }>;
    private normalizeGuestId;
    private resolveGuestId;
    private resolveActorId;
    private ensureGuestParticipant;
    private hasBlockingActiveGame;
}
