"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var FriendlyMatchService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.FriendlyMatchService = void 0;
const common_1 = require("@nestjs/common");
const crypto_1 = require("crypto");
const prisma_service_1 = require("../../infrastructure/database/prisma/prisma.service");
const friend_service_1 = require("./friend.service");
const INVITE_TTL_MS = 24 * 60 * 60 * 1000;
const FriendlyMatchStatus = {
    PENDING: 'PENDING',
    ACCEPTED: 'ACCEPTED',
    DECLINED: 'DECLINED',
    CANCELED: 'CANCELED',
    EXPIRED: 'EXPIRED',
};
let FriendlyMatchService = FriendlyMatchService_1 = class FriendlyMatchService {
    prisma;
    friendService;
    logger = new common_1.Logger(FriendlyMatchService_1.name);
    constructor(prisma, friendService) {
        this.prisma = prisma;
        this.friendService = friendService;
    }
    async createInvite(hostId, dto) {
        if (dto.friendId && dto.friendId === hostId) {
            throw new common_1.BadRequestException('Cannot invite yourself');
        }
        if (dto.friendId) {
            const areFriends = await this.friendService.areFriends(hostId, dto.friendId);
            if (!areFriends) {
                throw new common_1.BadRequestException('You can only challenge your friends');
            }
        }
        const now = new Date();
        const initialTimeMs = this.normalizeInitialTime(dto.initialTimeMs);
        return this.prisma.friendlyMatch.create({
            data: {
                hostId,
                invitedFriendId: dto.friendId || null,
                inviteToken: (0, crypto_1.randomBytes)(16).toString('hex'),
                status: FriendlyMatchStatus.PENDING,
                gameId: dto.gameId || null,
                initialTimeMs,
                roomType: dto.roomType || 'single',
                hostColor: 'WHITE',
                rated: dto.rated || false,
                allowSpectators: dto.allowSpectators ?? true,
                expiresAt: new Date(now.getTime() + INVITE_TTL_MS),
            },
            include: {
                host: {
                    select: { id: true, username: true, displayName: true },
                },
                invitedFriend: {
                    select: { id: true, username: true, displayName: true },
                },
            },
        });
    }
    async getInviteByToken(token) {
        const invite = await this.prisma.friendlyMatch.findUnique({
            where: { inviteToken: token },
            include: {
                host: {
                    select: { id: true, username: true, displayName: true },
                },
                invitedFriend: {
                    select: { id: true, username: true, displayName: true },
                },
                guest: {
                    select: { id: true, username: true, displayName: true },
                },
            },
        });
        if (!invite) {
            throw new common_1.NotFoundException('Invite not found');
        }
        return this.expireIfNeeded(invite);
    }
    async getInviteById(id, actorId) {
        const invite = await this.prisma.friendlyMatch.findUnique({
            where: { id },
            include: {
                host: {
                    select: { id: true, username: true, displayName: true },
                },
                invitedFriend: {
                    select: { id: true, username: true, displayName: true },
                },
                guest: {
                    select: { id: true, username: true, displayName: true },
                },
            },
        });
        if (!invite) {
            throw new common_1.NotFoundException('Match invite not found');
        }
        return this.expireIfNeeded(invite);
    }
    async listIncoming(userId) {
        const invites = await this.prisma.friendlyMatch.findMany({
            where: {
                invitedFriendId: userId,
                status: FriendlyMatchStatus.PENDING,
            },
            include: {
                host: {
                    select: { id: true, username: true, displayName: true },
                },
            },
            orderBy: { createdAt: 'desc' },
            take: 50,
        });
        return Promise.all(invites.map((invite) => this.expireIfNeeded(invite)));
    }
    async listOutgoing(hostId) {
        const invites = await this.prisma.friendlyMatch.findMany({
            where: {
                hostId,
                status: {
                    in: [FriendlyMatchStatus.PENDING, FriendlyMatchStatus.ACCEPTED],
                },
            },
            include: {
                invitedFriend: {
                    select: { id: true, username: true, displayName: true },
                },
                guest: {
                    select: { id: true, username: true, displayName: true },
                },
            },
            orderBy: { createdAt: 'desc' },
            take: 50,
        });
        return Promise.all(invites.map((invite) => this.expireIfNeeded(invite)));
    }
    async cancelInvite(inviteId, hostId) {
        const invite = await this.getInviteById(inviteId, hostId);
        if (invite.hostId !== hostId) {
            throw new common_1.BadRequestException('Only host can cancel invite');
        }
        if (invite.status !== FriendlyMatchStatus.PENDING) {
            throw new common_1.BadRequestException('Only pending invites can be canceled');
        }
        await this.cleanupLinkedPendingGame(invite.gameId);
        return this.prisma.friendlyMatch.update({
            where: { id: inviteId },
            data: { status: FriendlyMatchStatus.CANCELED },
        });
    }
    async declineInvite(inviteId, userId) {
        const invite = await this.getInviteById(inviteId, userId);
        if (invite.invitedFriendId && invite.invitedFriendId !== userId) {
            throw new common_1.BadRequestException('Only invited friend can decline');
        }
        if (invite.status !== FriendlyMatchStatus.PENDING) {
            throw new common_1.BadRequestException('Only pending invites can be declined');
        }
        await this.cleanupLinkedPendingGame(invite.gameId);
        await this.prisma.friendlyMatch.update({
            where: { id: inviteId },
            data: { status: FriendlyMatchStatus.DECLINED },
        });
        return invite;
    }
    async reserveInviteForAccept(token, guestId) {
        const invite = await this.getInviteByToken(token);
        if (invite.hostId === guestId) {
            throw new common_1.BadRequestException('Host cannot accept own invite');
        }
        if (invite.status !== FriendlyMatchStatus.PENDING) {
            throw new common_1.BadRequestException('Invite is no longer pending');
        }
        if (invite.invitedFriendId && invite.invitedFriendId !== guestId) {
            throw new common_1.BadRequestException('Invite is for a different friend');
        }
        if (invite.invitedFriendId) {
            const areFriends = await this.friendService.areFriends(invite.hostId, guestId);
            if (!areFriends) {
                throw new common_1.BadRequestException('Only friends can accept this direct challenge');
            }
        }
        const updated = await this.prisma.friendlyMatch.updateMany({
            where: {
                id: invite.id,
                status: FriendlyMatchStatus.PENDING,
                expiresAt: { gt: new Date() },
            },
            data: {
                status: FriendlyMatchStatus.ACCEPTED,
                guestId,
                acceptedAt: new Date(),
            },
        });
        if (updated.count !== 1) {
            throw new common_1.BadRequestException('Invite already accepted or expired');
        }
        return this.prisma.friendlyMatch.findUniqueOrThrow({
            where: { id: invite.id },
            include: {
                host: {
                    select: { id: true, username: true, displayName: true },
                },
                guest: {
                    select: { id: true, username: true, displayName: true },
                },
            },
        });
    }
    async attachGame(inviteId, gameId) {
        return this.prisma.friendlyMatch.update({
            where: { id: inviteId },
            data: { gameId },
        });
    }
    async rollbackAcceptance(inviteId) {
        await this.prisma.friendlyMatch.update({
            where: { id: inviteId },
            data: {
                status: FriendlyMatchStatus.PENDING,
                guestId: null,
                acceptedAt: null,
            },
        });
    }
    normalizeInitialTime(initialTimeMs) {
        if (!Number.isFinite(initialTimeMs))
            return 600000;
        return Math.min(60 * 60 * 1000, Math.max(60 * 1000, Math.floor(initialTimeMs)));
    }
    async expireIfNeeded(invite) {
        if (invite.status !== FriendlyMatchStatus.PENDING)
            return invite;
        if (invite.expiresAt.getTime() > Date.now())
            return invite;
        await this.prisma.friendlyMatch.update({
            where: { id: invite.id },
            data: { status: FriendlyMatchStatus.EXPIRED },
        });
        return { ...invite, status: FriendlyMatchStatus.EXPIRED };
    }
    async cleanupLinkedPendingGame(gameId) {
        if (!gameId)
            return;
        await this.prisma.game.deleteMany({
            where: { id: gameId },
        });
    }
};
exports.FriendlyMatchService = FriendlyMatchService;
exports.FriendlyMatchService = FriendlyMatchService = FriendlyMatchService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        friend_service_1.FriendService])
], FriendlyMatchService);
//# sourceMappingURL=friendly-match.service.js.map