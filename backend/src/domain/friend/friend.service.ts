import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma/prisma.service';
import { FriendRequest, FriendRequestStatus } from './entities/friend-request.entity';
import { Friendship } from './entities/friendship.entity';

@Injectable()
export class FriendService {
  constructor(private prisma: PrismaService) {}

  /**
   * Send a friend request from requester to requestee
   */
  async sendFriendRequest(requesterId: string, requesteeId: string): Promise<FriendRequest> {
    // Validate users are different
    if (requesterId === requesteeId) {
      throw new BadRequestException('Cannot send friend request to yourself');
    }

    // Check if requestee exists
    const requestee = await this.prisma.user.findUnique({
      where: { id: requesteeId },
    });
    if (!requestee) {
      throw new NotFoundException('User not found');
    }

    // Check if already friends
    const existingFriendship = await this.prisma.friendship.findFirst({
      where: {
        OR: [
          { initiatorId: requesterId, recipientId: requesteeId },
          { initiatorId: requesteeId, recipientId: requesterId },
        ],
      },
    });

    if (existingFriendship) {
      throw new BadRequestException('Already friends with this user');
    }

    // Check if request already exists
    const existingRequest = await this.prisma.friendRequest.findUnique({
      where: {
        requesterId_requesteeId: {
          requesterId,
          requesteeId,
        },
      },
    });

    if (existingRequest && existingRequest.status === FriendRequestStatus.PENDING) {
      throw new BadRequestException('Friend request already sent to this user');
    }

    // Check if reverse request exists
    const reverseRequest = await this.prisma.friendRequest.findUnique({
      where: {
        requesterId_requesteeId: {
          requesterId: requesteeId,
          requesteeId: requesterId,
        },
      },
    });

    if (reverseRequest && reverseRequest.status === FriendRequestStatus.PENDING) {
      // Auto-accept by creating friendship and updating both requests
      return await this.acceptFriendRequest(requesteeId, requesterId);
    }

    // Create new friend request
    const friendRequest = await this.prisma.friendRequest.create({
      data: {
        requesterId,
        requesteeId,
        status: FriendRequestStatus.PENDING,
      },
    });

    return new FriendRequest(
      friendRequest.id,
      friendRequest.requesterId,
      friendRequest.requesteeId,
      friendRequest.status as FriendRequestStatus,
      friendRequest.createdAt,
      friendRequest.respondedAt || undefined,
    );
  }

  /**
   * Accept a friend request
   */
  async acceptFriendRequest(requesterId: string, requesteeId: string): Promise<FriendRequest> {
    const friendRequest = await this.prisma.friendRequest.findUnique({
      where: {
        requesterId_requesteeId: {
          requesterId,
          requesteeId,
        },
      },
    });

    if (!friendRequest) {
      throw new NotFoundException('Friend request not found');
    }

    if (!friendRequest.requesteeId || friendRequest.requesteeId !== requesteeId) {
      throw new BadRequestException('Invalid friend request');
    }

    // Update request status
    const updatedRequest = await this.prisma.friendRequest.update({
      where: { id: friendRequest.id },
      data: {
        status: FriendRequestStatus.ACCEPTED,
        respondedAt: new Date(),
      },
    });

    // Create friendship (initiator is the requester, recipient is the requestee)
    await this.prisma.friendship.create({
      data: {
        initiatorId: requesterId,
        recipientId: requesteeId,
      },
    });

    return new FriendRequest(
      updatedRequest.id,
      updatedRequest.requesterId,
      updatedRequest.requesteeId,
      updatedRequest.status as FriendRequestStatus,
      updatedRequest.createdAt,
      updatedRequest.respondedAt || undefined,
    );
  }

  /**
   * Reject a friend request
   */
  async rejectFriendRequest(requesterId: string, requesteeId: string): Promise<FriendRequest> {
    const friendRequest = await this.prisma.friendRequest.findUnique({
      where: {
        requesterId_requesteeId: {
          requesterId,
          requesteeId,
        },
      },
    });

    if (!friendRequest) {
      throw new NotFoundException('Friend request not found');
    }

    if (!friendRequest.requesteeId || friendRequest.requesteeId !== requesteeId) {
      throw new BadRequestException('Invalid friend request');
    }

    const updatedRequest = await this.prisma.friendRequest.update({
      where: { id: friendRequest.id },
      data: {
        status: FriendRequestStatus.REJECTED,
        respondedAt: new Date(),
      },
    });

    return new FriendRequest(
      updatedRequest.id,
      updatedRequest.requesterId,
      updatedRequest.requesteeId,
      updatedRequest.status as FriendRequestStatus,
      updatedRequest.createdAt,
      updatedRequest.respondedAt || undefined,
    );
  }

  /**
   * Get pending friend requests for a user (where they are the requestee)
   */
  async getPendingRequests(userId: string) {
    const requests = await this.prisma.friendRequest.findMany({
      where: {
        requesteeId: userId,
        status: FriendRequestStatus.PENDING,
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

  /**
   * Get sent friend requests from a user (where they are the requester)
   */
  async getSentRequests(userId: string) {
    const requests = await this.prisma.friendRequest.findMany({
      where: {
        requesterId: userId,
        status: FriendRequestStatus.PENDING,
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

  /**
   * Get all friends of a user
   */
  async getFriends(userId: string) {
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

  /**
   * Check if two users are friends
   */
  async areFriends(userId1: string, userId2: string): Promise<boolean> {
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

  /**
   * Remove a friendship
   */
  async removeFriend(userId: string, friendId: string): Promise<void> {
    const friendship = await this.prisma.friendship.findFirst({
      where: {
        OR: [
          { initiatorId: userId, recipientId: friendId },
          { initiatorId: friendId, recipientId: userId },
        ],
      },
    });

    if (!friendship) {
      throw new NotFoundException('Friendship not found');
    }

    await this.prisma.friendship.delete({
      where: { id: friendship.id },
    });
  }

  /**
   * Cancel a sent friend request
   */
  async cancelFriendRequest(requesterId: string, requesteeId: string): Promise<void> {
    const friendRequest = await this.prisma.friendRequest.findUnique({
      where: {
        requesterId_requesteeId: {
          requesterId,
          requesteeId,
        },
      },
    });

    if (!friendRequest) {
      throw new NotFoundException('Friend request not found');
    }

    if (friendRequest.requesterId !== requesterId) {
      throw new BadRequestException('Cannot cancel someone else\'s friend request');
    }

    await this.prisma.friendRequest.delete({
      where: { id: friendRequest.id },
    });
  }
}
