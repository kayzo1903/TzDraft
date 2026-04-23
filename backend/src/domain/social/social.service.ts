import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
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
    // A Friend is a mutual follow who has played at least one game
    const mutuals = await this.prisma.follow.findMany({
      where: {
        followerId: userId,
        following: {
          followers: {
            some: {
              followerId: userId,
            },
          },
          following: {
            some: {
              followingId: userId,
            },
          },
        },
      },
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

    // Filtering for those who have played at least one game
    // Note: For performance with many followers, we might want to cache this status
    // or use a more complex query. Given the 100 friend cap, this is manageable.
    const friends = await Promise.all(
      mutuals.map(async (m) => {
        const gameCount = await this.prisma.game.count({
          where: {
            OR: [
              { whitePlayerId: userId, blackPlayerId: m.followingId },
              { whitePlayerId: m.followingId, blackPlayerId: userId },
            ],
            status: 'FINISHED',
          },
        });
        if (gameCount > 0) {
          return {
            ...m.following,
            isRival: gameCount >= 10,
            gameCount,
          };
        }
        return null;
      }),
    );

    return friends.filter((f) => f !== null);
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
