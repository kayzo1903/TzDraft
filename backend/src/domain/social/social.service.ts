import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma/prisma.service';
import { SocialNotificationService } from '../../application/services/social-notification.service';

@Injectable()
export class SocialService {
  constructor(
    private prisma: PrismaService,
    private readonly socialNotif: SocialNotificationService,
  ) {}

  async follow(followerId: string, followingUsername: string) {
    const following = await this.prisma.user.findUnique({
      where: { username: followingUsername },
    });

    if (!following) {
      throw new NotFoundException('User not found');
    }

    if (followerId === following.id) {
      throw new BadRequestException('You cannot follow yourself');
    }

    const follow = await this.prisma.follow.upsert({
      where: {
        followerId_followingId: {
          followerId,
          followingId: following.id,
        },
      },
      create: {
        followerId,
        followingId: following.id,
      },
      update: {},
    });

    // Handle Notifications
    try {
      const stats = await this.getRelationshipState(followerId, following.id);
      if (stats.isFriend) {
        // Only notify friendship if it just became a friend (we could track this better, but for now this works)
        await this.socialNotif.notifyFriendship(followerId, following.id);
      } else {
        await this.socialNotif.notifyFollow(followerId, following.id);
      }
    } catch (err) {
      console.warn('Social notification failed:', err);
    }

    return follow;
  }

  async unfollow(followerId: string, followingUsername: string) {
    const following = await this.prisma.user.findUnique({
      where: { username: followingUsername },
    });

    if (!following) {
      throw new NotFoundException('User not found');
    }

    return this.prisma.follow.deleteMany({
      where: {
        followerId,
        followingId: following.id,
      },
    });
  }

  async getRelationshipState(userAId: string, userBId: string) {
    const [aFollowsB, bFollowsA] = await Promise.all([
      this.prisma.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: userAId,
            followingId: userBId,
          },
        },
      }),
      this.prisma.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: userBId,
            followingId: userAId,
          },
        },
      }),
    ]);

    const isFollowing = !!aFollowsB;
    const isFollower = !!bFollowsA;
    const isMutual = isFollowing && isFollower;

    let gameCount = 0;
    if (isMutual) {
      gameCount = await this.prisma.game.count({
        where: {
          OR: [
            { whitePlayerId: userAId, blackPlayerId: userBId },
            { whitePlayerId: userBId, blackPlayerId: userAId },
          ],
          status: 'FINISHED',
        },
      });
    }

    const isFriend = isMutual && gameCount > 0;
    const isRival = isFriend && gameCount >= 10;

    return {
      isFollowing,
      isFollower,
      isMutual,
      isFriend,
      isRival,
      gameCount,
    };
  }

  async getFriendsList(userId: string) {
    // 1. Fetch all mutual follows in one query
    const mutuals = await this.prisma.follow.findMany({
      where: {
        followerId: userId,
        following: {
          followers: { some: { followerId: userId } },
          following: { some: { followingId: userId } },
        },
      },
      include: {
        following: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            rating: { select: { rating: true } },
          },
        },
      },
    });

    if (mutuals.length === 0) return [];

    const mutualIds = mutuals.map((m) => m.followingId);

    // 2. Single query for all finished games between userId and any mutual
    const games = await this.prisma.game.findMany({
      where: {
        status: 'FINISHED',
        OR: [
          { whitePlayerId: userId, blackPlayerId: { in: mutualIds } },
          { blackPlayerId: userId, whitePlayerId: { in: mutualIds } },
        ],
      },
      select: { whitePlayerId: true, blackPlayerId: true },
    });

    // 3. Build opponentId → gameCount map in JS
    const gameCountMap = new Map<string, number>();
    for (const g of games) {
      const opponentId = g.whitePlayerId === userId ? g.blackPlayerId! : g.whitePlayerId!;
      gameCountMap.set(opponentId, (gameCountMap.get(opponentId) ?? 0) + 1);
    }

    // 4. Filter to those with ≥1 game and attach counts
    return mutuals
      .filter((m) => (gameCountMap.get(m.followingId) ?? 0) > 0)
      .map((m) => {
        const count = gameCountMap.get(m.followingId)!;
        return { ...m.following, isRival: count >= 10, gameCount: count };
      });
  }

  async getFollowingList(userId: string) {
    return this.prisma.follow.findMany({
      where: { followerId: userId },
      include: {
        following: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            rating: {
              select: {
                rating: true,
              },
            },
          },
        },
      },
    });
  }

  async getFollowersList(userId: string) {
    return this.prisma.follow.findMany({
      where: { followingId: userId },
      include: {
        follower: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            rating: {
              select: {
                rating: true,
              },
            },
          },
        },
      },
    });
  }

  async getSocialStats(userId: string) {
    const [followingCount, followersCount, friends] = await Promise.all([
      this.prisma.follow.count({ where: { followerId: userId } }),
      this.prisma.follow.count({ where: { followingId: userId } }),
      this.getFriendsList(userId),
    ]);

    return {
      followingCount,
      followersCount,
      friendsCount: friends.length,
    };
  }
}
