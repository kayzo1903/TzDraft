import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AccountType } from '@prisma/client';
import { AdminGuard } from '../../../auth/guards/admin.guard';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { HealthCheckService } from '@nestjs/terminus';
import { PrismaHealthIndicator, RedisHealthIndicator } from '../../../health/health.controller';
import {
  AdminUsersQueryDto,
  UpdateUserRoleDto,
  UpdateUserBanDto,
  CleanupGuestsQueryDto,
} from '../dtos/admin.dto';

@Controller('admin')
@UseGuards(AdminGuard)
export class AdminController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly health: HealthCheckService,
    private readonly prismaIndicator: PrismaHealthIndicator,
    private readonly redisIndicator: RedisHealthIndicator,
  ) {}

  @Get('stats')
  async getStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalUsers, activeGames, gamesPlayedToday] = await Promise.all([
      this.prisma.user.count({
        where: { accountType: { not: AccountType.GUEST } },
      }),
      this.prisma.game.count({ where: { status: 'ACTIVE' } }),
      this.prisma.game.count({
        where: { createdAt: { gte: today } },
      }),
    ]);

    return { totalUsers, activeGames, gamesPlayedToday };
  }

  @Get('users')
  async getUsers(@Query() query: AdminUsersQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where = {
      accountType: { not: AccountType.GUEST },
      ...(query.search
        ? {
            OR: [
              { username: { contains: query.search, mode: 'insensitive' as const } },
              { email: { contains: query.search, mode: 'insensitive' as const } },
              { phoneNumber: { contains: query.search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          username: true,
          displayName: true,
          email: true,
          phoneNumber: true,
          role: true,
          accountType: true,
          isBanned: true,
          isVerified: true,
          createdAt: true,
          lastLoginAt: true,
          rating: { select: { rating: true } },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  @Patch('users/:id/role')
  async updateRole(@Param('id') id: string, @Body() dto: UpdateUserRoleDto) {
    const user = await this.prisma.user.update({
      where: { id },
      data: { role: dto.role },
      select: { id: true, username: true, role: true },
    });
    return user;
  }

  @Patch('users/:id/ban')
  async updateBan(@Param('id') id: string, @Body() dto: UpdateUserBanDto) {
    const user = await this.prisma.user.update({
      where: { id },
      data: { isBanned: dto.isBanned },
      select: { id: true, username: true, isBanned: true },
    });

    // Invalidate all refresh tokens for banned users
    if (dto.isBanned) {
      await this.prisma.refreshToken.deleteMany({ where: { userId: id } });
    }

    return user;
  }

  /** Dry-run: returns how many guest accounts would be deleted. */
  @Get('guests/preview')
  async previewGuestCleanup(@Query() query: CleanupGuestsQueryDto) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - (query.olderThanDays ?? 7));

    const count = await this.prisma.user.count({
      where: {
        accountType: AccountType.GUEST,
        createdAt: { lt: cutoff },
        gamesAsWhite: { none: {} },
        gamesAsBlack: { none: {} },
      },
    });

    return { count, olderThanDays: query.olderThanDays ?? 7 };
  }

  /** Permanently deletes stale guest accounts that have never played a game. */
  @Delete('guests')
  async cleanupGuests(@Query() query: CleanupGuestsQueryDto) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - (query.olderThanDays ?? 7));

    const { count } = await this.prisma.user.deleteMany({
      where: {
        accountType: AccountType.GUEST,
        createdAt: { lt: cutoff },
        gamesAsWhite: { none: {} },
        gamesAsBlack: { none: {} },
      },
    });

    return { deleted: count, olderThanDays: query.olderThanDays ?? 7 };
  }

  /** Daily new-user registrations + games started for the last N days. */
  @Get('growth')
  async getGrowth(@Query('days') daysParam?: string) {
    const days = Math.min(Math.max(parseInt(daysParam ?? '30', 10) || 30, 7), 90);

    const points: { date: string; newUsers: number; games: number }[] = [];

    for (let i = days - 1; i >= 0; i--) {
      const from = new Date();
      from.setDate(from.getDate() - i);
      from.setHours(0, 0, 0, 0);

      const to = new Date(from);
      to.setHours(23, 59, 59, 999);

      const [newUsers, games] = await Promise.all([
        this.prisma.user.count({
          where: {
            createdAt: { gte: from, lte: to },
            accountType: { not: AccountType.GUEST },
          },
        }),
        this.prisma.game.count({
          where: { createdAt: { gte: from, lte: to } },
        }),
      ]);

      points.push({
        date: from.toISOString().slice(0, 10),
        newUsers,
        games,
      });
    }

    // Aggregate totals + guest count for pie breakdown
    const [totalVerified, totalGuests, totalBanned] = await Promise.all([
      this.prisma.user.count({
        where: {
          accountType: AccountType.REGISTERED,
          isVerified: true,
        },
      }),
      this.prisma.user.count({ where: { accountType: AccountType.GUEST } }),
      this.prisma.user.count({
        where: {
          accountType: { not: AccountType.GUEST },
          isBanned: true,
        },
      }),
    ]);

    return { points, breakdown: { totalVerified, totalGuests, totalBanned } };
  }

  @Get('health')
  async getHealth() {
    return this.health.check([
      () => this.prismaIndicator.isHealthy('database'),
      () => this.redisIndicator.isHealthy('redis'),
    ]);
  }
}
