import { Injectable } from '@nestjs/common';
import { AccountType, UserRole } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { User } from '@prisma/client';
import { normalizePhoneNumber } from '../../shared/utils/phone.util';
import { RedisService } from '../../infrastructure/cache/redis.service';

@Injectable()
export class UserService {
  constructor(
    private prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  private getCacheKey(id: string): string {
    return `user:profile:${id}`;
  }

  /**
   * Find user by phone number
   */
  async findByPhoneNumber(phoneNumber: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { phoneNumber },
      include: { rating: true },
    });
  }

  /**
   * Find user by identifier (phone number or username)
   */
  async findByIdentifier(identifier: string): Promise<User | null> {
    // Check if identifier looks like a phone number
    const isPhone =
      identifier.startsWith('+') ||
      identifier.startsWith('0') ||
      /^\d+$/.test(identifier);

    if (isPhone) {
      // Normalize and search by phone
      const normalized = normalizePhoneNumber(identifier);

      return this.prisma.user.findFirst({
        where: { phoneNumber: normalized },
        include: { rating: true },
      });
    } else {
      // Search by username
      return this.prisma.user.findFirst({
        where: { username: identifier },
        include: { rating: true },
      });
    }
  }

  async updateProfile(
    userId: string,
    data: {
      displayName?: string;
      email?: string;
      country?: string;
      region?: string;
      avatarUrl?: string;
    },
  ): Promise<any> {
    const updateData: Record<string, any> = {};
    if (data.displayName !== undefined)
      updateData.displayName = data.displayName;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.country !== undefined) {
      updateData.country = data.country;
      // Clear region when country changes; will be re-set below if also provided
      updateData.region = null;
    }
    if (data.region !== undefined) updateData.region = data.region;
    if (data.avatarUrl !== undefined) updateData.avatarUrl = data.avatarUrl;

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
      include: { rating: true },
    });

    const result = {
      ...user,
      rating: user.rating?.rating ?? 1200,
    };

    // Update cache
    await this.redis.setex(
      this.getCacheKey(userId),
      3600,
      JSON.stringify(result),
    );

    return result;
  }

  async savePushToken(userId: string, token: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { pushToken: token, pushTokenUpdatedAt: new Date() },
    });
  }

  async clearPushToken(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { pushToken: null, pushTokenUpdatedAt: null },
    });
  }

  async getPlayerRank(userId: string): Promise<{
    global: number | null;
    country: number | null;
    region: number | null;
    totalPlayers: number;
  }> {
    const myRating = await this.prisma.rating.findUnique({ where: { userId } });
    if (!myRating)
      return { global: null, country: null, region: null, totalPlayers: 0 };

    const myUser = await this.prisma.user.findUnique({ where: { id: userId } });
    if (
      !myUser ||
      myUser.accountType === AccountType.GUEST ||
      myUser.role === UserRole.ADMIN
    ) {
      return { global: null, country: null, region: null, totalPlayers: 0 };
    }

    const registeredWhere = {
      user: {
        accountType: { notIn: [AccountType.GUEST] },
        role: UserRole.USER,
      },
    };

    const [globalRank, totalPlayers] = await Promise.all([
      this.prisma.rating.count({
        where: {
          ...registeredWhere,
          rating: { gt: myRating.rating },
        },
      }),
      this.prisma.rating.count({ where: registeredWhere }),
    ]);

    let countryRank: number | null = null;
    if (myUser?.country) {
      countryRank =
        (await this.prisma.rating.count({
          where: {
            rating: { gt: myRating.rating },
            user: {
              accountType: { notIn: [AccountType.GUEST] },
              role: UserRole.USER,
              country: myUser.country,
            },
          },
        })) + 1;
    }

    let regionRank: number | null = null;
    if (myUser?.country && myUser?.region) {
      regionRank =
        (await this.prisma.rating.count({
          where: {
            rating: { gt: myRating.rating },
            user: {
              accountType: { notIn: [AccountType.GUEST] },
              role: UserRole.USER,
              country: myUser.country,
              region: myUser.region,
            },
          },
        })) + 1;
    }

    return {
      global: globalRank + 1,
      country: countryRank,
      region: regionRank,
      totalPlayers,
    };
  }

  async getLeaderboard(options: {
    skip?: number;
    take?: number;
    country?: string;
    region?: string;
    search?: string;
  }): Promise<{
    items: Array<{
      rank: number;
      userId: string;
      displayName: string;
      username: string;
      avatarUrl?: string | null;
      country: string | null;
      region: string | null;
      rating: number;
      gamesPlayed: number;
    }>;
    total: number;
  }> {
    const { skip = 0, take = 50, country, region, search } = options;

    const cacheKey = `leaderboard:${skip}:${take}:${country ?? ''}:${region ?? ''}:${search ?? ''}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {
        /* invalid cache — fall through to DB */
      }
    }

    const EXCLUDED_USERNAMES = ['admin', 'teste', 'tester01'];

    const userFilter: Record<string, any> = {
      accountType: { notIn: [AccountType.GUEST] },
      role: UserRole.USER,
      username: { notIn: EXCLUDED_USERNAMES },
    };
    if (country) userFilter.country = country;
    if (region) userFilter.region = region;
    if (search) {
      userFilter.OR = [
        { displayName: { contains: search, mode: 'insensitive' } },
        { username: { contains: search, mode: 'insensitive' } },
      ];
    }
    const where =
      Object.keys(userFilter).length > 0 ? { user: userFilter } : {};

    const [entries, total] = await Promise.all([
      this.prisma.rating.findMany({
        where,
        orderBy: { rating: 'desc' },
        skip,
        take,
        include: {
          user: {
            select: {
              displayName: true,
              username: true,
              avatarUrl: true,
              country: true,
              region: true,
            },
          },
        },
      }),
      this.prisma.rating.count({ where }),
    ]);

    const result = {
      items: entries.map((e, idx) => ({
        rank: skip + idx + 1,
        userId: e.userId,
        displayName: e.user.displayName,
        username: e.user.username,
        avatarUrl: e.user.avatarUrl,
        country: e.user.country,
        region: e.user.region,
        rating: e.rating,
        gamesPlayed: e.gamesPlayed,
      })),
      total,
    };

    await this.redis.setex(cacheKey, 60, JSON.stringify(result));

    return result;
  }

  async findById(id: string) {
    const cacheKey = this.getCacheKey(id);
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {
        /* invalid cache */
      }
    }

    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { rating: true },
    });

    if (user) {
      await this.redis.setex(cacheKey, 3600, JSON.stringify(user)); // 1 hour TTL
    }
    return user;
  }

  async findManyByIds(ids: string[]) {
    if (ids.length === 0) return [];

    // Try to get as many as possible from cache
    const results: User[] = [];
    const missingIds: string[] = [];

    await Promise.all(
      ids.map(async (id) => {
        const cached = await this.redis.get(this.getCacheKey(id));
        if (cached) {
          try {
            results.push(JSON.parse(cached));
          } catch {
            missingIds.push(id);
          }
        } else {
          missingIds.push(id);
        }
      }),
    );

    if (missingIds.length > 0) {
      const dbUsers = await this.prisma.user.findMany({
        where: { id: { in: missingIds } },
        include: { rating: true },
      });

      for (const user of dbUsers) {
        results.push(user);
        await this.redis.setex(
          this.getCacheKey(user.id),
          3600,
          JSON.stringify(user),
        );
      }
    }

    return results;
  }

  /**
   * Create a new user with automatic Rating initialization
   */
  async create(data: {
    phoneNumber: string;
    email?: string;
    username: string;
    password: string;
    displayName?: string;
    country?: string;
    region?: string;
  }): Promise<User> {
    const hashedPassword = await bcrypt.hash(data.password, 10);

    const user = await this.prisma.user.create({
      data: {
        phoneNumber: data.phoneNumber,
        email: data.email,
        username: data.username,
        passwordHash: hashedPassword,
        displayName: data.displayName || data.username,
        country: data.country || 'TZ',
        region: data.region,
        rating: {
          create: {
            rating: 1200,
            gamesPlayed: 0,
          },
        },
      },
      include: {
        rating: true,
      },
    });

    return user;
  }
}
