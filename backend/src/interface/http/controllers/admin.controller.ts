import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminGuard } from '../../../auth/guards/admin.guard';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { HealthCheckService } from '@nestjs/terminus';
import { PrismaHealthIndicator, RedisHealthIndicator } from '../../../health/health.controller';
import {
  AdminUsersQueryDto,
  UpdateUserRoleDto,
  UpdateUserBanDto,
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
      this.prisma.user.count(),
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

    const where = query.search
      ? {
          OR: [
            { username: { contains: query.search, mode: 'insensitive' as const } },
            { email: { contains: query.search, mode: 'insensitive' as const } },
            { phoneNumber: { contains: query.search, mode: 'insensitive' as const } },
          ],
        }
      : {};

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

  @Get('health')
  async getHealth() {
    return this.health.check([
      () => this.prismaIndicator.isHealthy('database'),
      () => this.redisIndicator.isHealthy('redis'),
    ]);
  }
}
