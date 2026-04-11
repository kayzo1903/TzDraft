import {
  Body,
  Controller,
  Delete,
  Get,
  Logger,
  Param,
  Patch,
  Post,
  Query,
  ServiceUnavailableException,
  BadRequestException,
  UseGuards,
  Req,
  Inject,
  forwardRef,
} from '@nestjs/common';
import type { Request } from 'express';
import { HealthCheckService } from '@nestjs/terminus';
import { AccountType, Prisma } from '@prisma/client';
import { AdminGuard } from '../../../auth/guards/admin.guard';
import { CurrentUser } from '../../../auth/decorators/current-user.decorator';
import {
  PrismaHealthIndicator,
  RedisHealthIndicator,
} from '../../../health/health.controller';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import {
  CleanupGuestsQueryDto,
  AdminUsersQueryDto,
  UpdateUserBanDto,
  UpdateUserRoleDto,
} from '../dtos/admin.dto';
import { AnalyticsService } from '../../../admin/analytics.service';
import { ReportService } from '../../../infrastructure/tasks/report.service';

@Controller('admin')
@UseGuards(AdminGuard)
export class AdminController {
  private readonly logger = new Logger(AdminController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly health: HealthCheckService,
    private readonly prismaIndicator: PrismaHealthIndicator,
    private readonly redisIndicator: RedisHealthIndicator,
    private readonly analyticsService: AnalyticsService,
    @Inject(forwardRef(() => ReportService))
    private readonly reportService: ReportService,
  ) {}

  @Post('analytics/trigger-report')
  async triggerReport(@Body('type') type: 'Daily' | 'Weekly' | 'Monthly') {
    if (!['Daily', 'Weekly', 'Monthly'].includes(type)) {
      throw new BadRequestException(
        'Invalid report type. Expected Daily, Weekly, or Monthly.',
      );
    }

    // Trigger the report asynchronously
    this.reportService.triggerReport(type).catch((err) => {
      this.logger.error(`Manual ${type} report trigger failed:`, err);
    });

    return {
      success: true,
      message: `${type} report generation triggered. The email will be sent to the administrator shortly.`,
    };
  }

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

    const dateFilter =
      query.from || query.to
        ? {
            createdAt: {
              ...(query.from ? { gte: new Date(query.from) } : {}),
              ...(query.to ? { lte: new Date(query.to) } : {}),
            },
          }
        : {};

    const where: Prisma.UserWhereInput = {
      accountType: { not: AccountType.GUEST },
      ...dateFilter,
      ...(query.search
        ? {
            OR: [
              {
                username: {
                  contains: query.search,
                  mode: 'insensitive' as const,
                },
              },
              {
                email: { contains: query.search, mode: 'insensitive' as const },
              },
              {
                phoneNumber: {
                  contains: query.search,
                  mode: 'insensitive' as const,
                },
              },
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
  async updateRole(
    @Param('id') id: string,
    @Body() dto: UpdateUserRoleDto,
    @CurrentUser() admin: any,
    @Req() req: Request,
  ) {
    const result = await this.prisma.user.update({
      where: { id },
      data: { role: dto.role },
      select: { id: true, username: true, role: true },
    });
    this.audit('UPDATE_ROLE', admin, req, {
      targetUserId: id,
      newRole: dto.role,
    });
    return result;
  }

  @Patch('users/:id/ban')
  async updateBan(
    @Param('id') id: string,
    @Body() dto: UpdateUserBanDto,
    @CurrentUser() admin: any,
    @Req() req: Request,
  ) {
    const user = await this.prisma.user.update({
      where: { id },
      data: { isBanned: dto.isBanned },
      select: { id: true, username: true, isBanned: true },
    });

    if (dto.isBanned) {
      await this.prisma.refreshToken.deleteMany({ where: { userId: id } });
    }

    this.audit(dto.isBanned ? 'BAN_USER' : 'UNBAN_USER', admin, req, {
      targetUserId: id,
    });
    return user;
  }

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

  @Delete('guests')
  async cleanupGuests(
    @Query() query: CleanupGuestsQueryDto,
    @CurrentUser() admin: any,
    @Req() req: Request,
  ) {
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

    this.audit('CLEANUP_GUESTS', admin, req, {
      deleted: count,
      olderThanDays: query.olderThanDays ?? 7,
    });
    return { deleted: count, olderThanDays: query.olderThanDays ?? 7 };
  }

  @Get('growth')
  async getGrowth(@Query('days') daysParam?: string) {
    const days = Math.min(
      Math.max(parseInt(daysParam ?? '30', 10) || 30, 7),
      90,
    );

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

  @Get('analytics')
  async getAnalytics() {
    try {
      return await this.analyticsService.getAnalytics();
    } catch (err) {
      this.logger.error('Analytics query failed', err);
      throw new ServiceUnavailableException('Database unavailable');
    }
  }

  @Get('health')
  async getHealth() {
    return this.health.check([
      () => this.prismaIndicator.isHealthy('database'),
      () => this.redisIndicator.isHealthy('redis'),
    ]);
  }

  // ─── Audit Logging ────────────────────────────────────────────────────────

  private audit(
    action: string,
    admin: any,
    req: Request,
    details: Record<string, unknown> = {},
  ): void {
    this.logger.log({
      audit: true,
      action,
      adminId: admin?.id ?? 'unknown',
      adminUsername: admin?.username ?? 'unknown',
      ip:
        (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ??
        req.socket?.remoteAddress,
      timestamp: new Date().toISOString(),
      ...details,
    });
  }

  // ─── Tournament Winners ───────────────────────────────────────────────────

  private async getRecentTournamentWinners(limit: number) {
    // Find recently completed tournaments
    const completedTournaments = await this.prisma.tournament.findMany({
      where: { status: 'COMPLETED' },
      orderBy: { updatedAt: 'desc' },
      take: limit,
      select: {
        id: true,
        name: true,
        updatedAt: true,
        rounds: {
          orderBy: { roundNumber: 'desc' },
          take: 1,
          select: {
            matches: {
              where: { status: 'COMPLETED' },
              orderBy: { completedAt: 'desc' },
              take: 1,
              select: {
                result: true,
                player1Id: true,
                player2Id: true,
                completedAt: true,
              },
            },
          },
        },
      },
    });

    const winners: {
      tournamentId: string;
      tournamentName: string;
      winnerId: string | null;
      winnerName: string | null;
      completedAt: string | null;
    }[] = [];

    for (const t of completedTournaments) {
      const finalMatch = t.rounds[0]?.matches[0];
      if (!finalMatch) {
        winners.push({
          tournamentId: t.id,
          tournamentName: t.name,
          winnerId: null,
          winnerName: null,
          completedAt: t.updatedAt.toISOString(),
        });
        continue;
      }

      const winnerId =
        finalMatch.result === 'PLAYER1_WIN'
          ? finalMatch.player1Id
          : finalMatch.result === 'PLAYER2_WIN'
            ? finalMatch.player2Id
            : null;

      let winnerName: string | null = null;
      if (winnerId) {
        const user = await this.prisma.user.findUnique({
          where: { id: winnerId },
          select: { displayName: true, username: true },
        });
        winnerName = user?.displayName ?? user?.username ?? null;
      }

      winners.push({
        tournamentId: t.id,
        tournamentName: t.name,
        winnerId,
        winnerName,
        completedAt:
          finalMatch.completedAt?.toISOString() ?? t.updatedAt.toISOString(),
      });
    }

    return winners;
  }
}
