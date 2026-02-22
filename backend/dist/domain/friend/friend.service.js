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
Object.defineProperty(exports, "__esModule", { value: true });
exports.FriendService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../infrastructure/database/prisma/prisma.service");
const friend_request_entity_1 = require("./entities/friend-request.entity");
let FriendService = class FriendService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async sendFriendRequest(requesterId, requesteeId) {
        if (requesterId === requesteeId) {
            throw new common_1.BadRequestException('Cannot send friend request to yourself');
        }
        const requestee = await this.prisma.user.findUnique({
            where: { id: requesteeId },
        });
        if (!requestee) {
            throw new common_1.NotFoundException('User not found');
        }
        const existingFriendship = await this.prisma.friendship.findFirst({
            where: {
                OR: [
                    { initiatorId: requesterId, recipientId: requesteeId },
                    { initiatorId: requesteeId, recipientId: requesterId },
                ],
            },
        });
        if (existingFriendship) {
            throw new common_1.BadRequestException('Already friends with this user');
        }
        const existingRequest = await this.prisma.friendRequest.findUnique({
            where: {
                requesterId_requesteeId: {
                    requesterId,
                    requesteeId,
                },
            },
        });
        if (existingRequest && existingRequest.status === friend_request_entity_1.FriendRequestStatus.PENDING) {
            throw new common_1.BadRequestException('Friend request already sent to this user');
        }
        const reverseRequest = await this.prisma.friendRequest.findUnique({
            where: {
                requesterId_requesteeId: {
                    requesterId: requesteeId,
                    requesteeId: requesterId,
                },
            },
        });
        if (reverseRequest && reverseRequest.status === friend_request_entity_1.FriendRequestStatus.PENDING) {
            return await this.acceptFriendRequest(requesteeId, requesterId);
        }
        const friendRequest = await this.prisma.friendRequest.create({
            data: {
                requesterId,
                requesteeId,
                status: friend_request_entity_1.FriendRequestStatus.PENDING,
            },
        });
        return new friend_request_entity_1.FriendRequest(friendRequest.id, friendRequest.requesterId, friendRequest.requesteeId, friendRequest.status, friendRequest.createdAt, friendRequest.respondedAt || undefined);
    }
    async acceptFriendRequest(requesterId, requesteeId) {
        const friendRequest = await this.prisma.friendRequest.findUnique({
            where: {
                requesterId_requesteeId: {
                    requesterId,
                    requesteeId,
                },
            },
        });
        if (!friendRequest) {
            throw new common_1.NotFoundException('Friend request not found');
        }
        if (!friendRequest.requesteeId || friendRequest.requesteeId !== requesteeId) {
            throw new common_1.BadRequestException('Invalid friend request');
        }
        const updatedRequest = await this.prisma.friendRequest.update({
            where: { id: friendRequest.id },
            data: {
                status: friend_request_entity_1.FriendRequestStatus.ACCEPTED,
                respondedAt: new Date(),
            },
        });
        await this.prisma.friendship.create({
            data: {
                initiatorId: requesterId,
                recipientId: requesteeId,
            },
        });
        return new friend_request_entity_1.FriendRequest(updatedRequest.id, updatedRequest.requesterId, updatedRequest.requesteeId, updatedRequest.status, updatedRequest.createdAt, updatedRequest.respondedAt || undefined);
    }
    async rejectFriendRequest(requesterId, requesteeId) {
        const friendRequest = await this.prisma.friendRequest.findUnique({
            where: {
                requesterId_requesteeId: {
                    requesterId,
                    requesteeId,
                },
            },
        });
        if (!friendRequest) {
            throw new common_1.NotFoundException('Friend request not found');
        }
        if (!friendRequest.requesteeId || friendRequest.requesteeId !== requesteeId) {
            throw new common_1.BadRequestException('Invalid friend request');
        }
        const updatedRequest = await this.prisma.friendRequest.update({
            where: { id: friendRequest.id },
            data: {
                status: friend_request_entity_1.FriendRequestStatus.REJECTED,
                respondedAt: new Date(),
            },
        });
        return new friend_request_entity_1.FriendRequest(updatedRequest.id, updatedRequest.requesterId, updatedRequest.requesteeId, updatedRequest.status, updatedRequest.createdAt, updatedRequest.respondedAt || undefined);
    }
    async getPendingRequests(userId) {
        const requests = await this.prisma.friendRequest.findMany({
            where: {
                requesteeId: userId,
                status: friend_request_entity_1.FriendRequestStatus.PENDING,
            },
            include: {
                requester: {
                    select: {
                        id: true,
                        username: true,
                        displayName: true,
                        rating: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
        return requests;
    }
    async getSentRequests(userId) {
        const requests = await this.prisma.friendRequest.findMany({
            where: {
                requesterId: userId,
                status: friend_request_entity_1.FriendRequestStatus.PENDING,
            },
            include: {
                requestee: {
                    select: {
                        id: true,
                        username: true,
                        displayName: true,
                        rating: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
        return requests;
    }
    async getFriends(userId) {
        const friendships = await this.prisma.friendship.findMany({
            where: {
                OR: [
                    { initiatorId: userId },
                    { recipientId: userId },
                ],
            },
            include: {
                initiator: {
                    select: {
                        id: true,
                        username: true,
                        displayName: true,
                        rating: true,
                        createdAt: true,
                    },
                },
                recipient: {
                    select: {
                        id: true,
                        username: true,
                        displayName: true,
                        rating: true,
                        createdAt: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
        return friendships.map(friendship => {
            const friend = friendship.initiatorId === userId ? friendship.recipient : friendship.initiator;
            return {
                id: friend.id,
                username: friend.username,
                displayName: friend.displayName,
                rating: friend.rating?.rating || 1200,
                friendSince: friendship.createdAt,
            };
        });
    }
    async areFriends(userId1, userId2) {
        const friendship = await this.prisma.friendship.findFirst({
            where: {
                OR: [
                    { initiatorId: userId1, recipientId: userId2 },
                    { initiatorId: userId2, recipientId: userId1 },
                ],
            },
        });
        return !!friendship;
    }
    async removeFriend(userId, friendId) {
        const friendship = await this.prisma.friendship.findFirst({
            where: {
                OR: [
                    { initiatorId: userId, recipientId: friendId },
                    { initiatorId: friendId, recipientId: userId },
                ],
            },
        });
        if (!friendship) {
            throw new common_1.NotFoundException('Friendship not found');
        }
        await this.prisma.friendship.delete({
            where: { id: friendship.id },
        });
    }
    async cancelFriendRequest(requesterId, requesteeId) {
        const friendRequest = await this.prisma.friendRequest.findUnique({
            where: {
                requesterId_requesteeId: {
                    requesterId,
                    requesteeId,
                },
            },
        });
        if (!friendRequest) {
            throw new common_1.NotFoundException('Friend request not found');
        }
        if (friendRequest.requesterId !== requesterId) {
            throw new common_1.BadRequestException('Cannot cancel someone else\'s friend request');
        }
        await this.prisma.friendRequest.delete({
            where: { id: friendRequest.id },
        });
    }
};
exports.FriendService = FriendService;
exports.FriendService = FriendService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], FriendService);
//# sourceMappingURL=friend.service.js.map