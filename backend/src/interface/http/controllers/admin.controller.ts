import {
  Body,
  Controller,
  Delete,
  Get,
  Logger,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { HealthCheckService } from '@nestjs/terminus';
import { AccountType, Prisma } from '@prisma/client';
import { AdminGuard } from '../../../auth/guards/admin.guard';
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

type WindowCountsRow = Record<string, bigint>;
type DailyCountRow = { date: string; count: bigint };

@Controller('admin')
@UseGuards(AdminGuard)
export class AdminController {
  private static readonly ANALYTICS_WINDOWS = [1, 3, 7, 30, 90, 365] as const;
  private readonly logger = new Logger(AdminController.name);

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
    return this.prisma.user.update({
      where: { id },
      data: { role: dto.role },
      select: { id: true, username: true, role: true },
    });
  }

  @Patch('users/:id/ban')
  async updateBan(@Param('id') id: string, @Body() dto: UpdateUserBanDto) {
    const user = await this.prisma.user.update({
      where: { id },
      data: { isBanned: dto.isBanned },
      select: { id: true, username: true, isBanned: true },
    });

    if (dto.isBanned) {
      await this.prisma.refreshToken.deleteMany({ where: { userId: id } });
    }

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
    const now = new Date();
    const trendDays = 30;
    const matchmakingEnabled = await this.hasMatchmakingSearchesTable();

    const totalUsers = await this.prisma.user.count();
    const totalRegisteredUsers = await this.prisma.user.count({
      where: { accountType: { not: AccountType.GUEST } },
    });
    const activeGames = await this.prisma.game.count({ where: { status: 'ACTIVE' } });
    const totalGames = await this.prisma.game.count();
    const totalTournamentGames = await this.prisma.game.count({
      where: { tournamentMatchGameId: { not: null } },
    });
    const totalTournamentParticipants = await this.countDistinctTournamentParticipants();
    const totalMatchmakingSearches = matchmakingEnabled
      ? await this.countMatchmakingSearches()
      : 0;

    // Live game breakdown by type
    const [liveRanked, liveCasual, liveAi, liveTournament, liveFriend] = await Promise.all([
      this.prisma.game.count({ where: { status: 'ACTIVE', gameType: 'RANKED' } }),
      this.prisma.game.count({ where: { status: 'ACTIVE', gameType: 'CASUAL' } }),
      this.prisma.game.count({ where: { status: 'ACTIVE', gameType: 'AI' } }),
      this.prisma.game.count({ where: { status: 'ACTIVE', gameType: 'TOURNAMENT' } }),
      this.prisma.game.count({
        where: { status: 'ACTIVE', inviteCode: { not: null } },
      }),
    ]);

    // Friend (invite) games total
    const [friendGamesActive, friendGamesTotal] = await Promise.all([
      this.prisma.game.count({
        where: { status: 'ACTIVE', inviteCode: { not: null } },
      }),
      this.prisma.game.count({ where: { inviteCode: { not: null } } }),
    ]);

    // Tournament winners — last 5 completed tournaments
    const recentTournamentWinners = await this.getRecentTournamentWinners(5);

    const windows = await this.buildAnalyticsWindows(matchmakingEnabled);
    const trend = await this.buildTrend(trendDays, matchmakingEnabled);

    return {
      generatedAt: now.toISOString(),
      overview: {
        totalUsers,
        totalRegisteredUsers,
        activeGames,
        totalGames,
        totalMatchmakingSearches,
        totalTournamentParticipants,
        totalTournamentGames,
      },
      liveBreakdown: {
        ranked: liveRanked,
        casual: liveCasual,
        ai: liveAi,
        tournament: liveTournament,
        friend: liveFriend,
      },
      friendGames: {
        active: friendGamesActive,
        total: friendGamesTotal,
      },
      recentTournamentWinners,
      windows,
      trend,
    };
  }

  @Get('health')
  async getHealth() {
    return this.health.check([
      () => this.prismaIndicator.isHealthy('database'),
      () => this.redisIndicator.isHealthy('redis'),
    ]);
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
        completedAt: finalMatch.completedAt?.toISOString() ?? t.updatedAt.toISOString(),
      });
    }

    return winners;
  }

  // ─── Analytics Helpers ────────────────────────────────────────────────────

  private async buildAnalyticsWindows(matchmakingEnabled: boolean) {
    const games = await this.getWindowCounts('games', 'created_at');
    const newUsers = await this.getWindowCounts(
      'users',
      'created_at',
      Prisma.sql`"account_type" <> 'GUEST'`,
    );
    const tournamentGames = await this.getWindowCounts(
      'games',
      'created_at',
      Prisma.sql`"tournament_match_game_id" IS NOT NULL`,
    );
    const friendGames = await this.getWindowCounts(
      'games',
      'created_at',
      Prisma.sql`"invite_code" IS NOT NULL`,
    );
    const tournamentParticipants = await this.getWindowDistinctCounts(
      'tournament_participants',
      'registered_at',
      'user_id',
    );
    const searches = matchmakingEnabled
      ? await this.getWindowCounts('matchmaking_searches', 'started_at')
      : this.createEmptyWindowCounts();
    const matchedSearches = matchmakingEnabled
      ? await this.getWindowCounts(
          'matchmaking_searches',
          'started_at',
          Prisma.sql`"status" = 'MATCHED'`,
        )
      : this.createEmptyWindowCounts();
    const expiredSearches = matchmakingEnabled
      ? await this.getWindowCounts(
          'matchmaking_searches',
          'started_at',
          Prisma.sql`"status" = 'EXPIRED'`,
        )
      : this.createEmptyWindowCounts();

    return AdminController.ANALYTICS_WINDOWS.map((days) => ({
      days,
      gamesPlayed: games[days] ?? 0,
      searches: searches[days] ?? 0,
      matchedSearches: matchedSearches[days] ?? 0,
      expiredSearches: expiredSearches[days] ?? 0,
      newRegisteredUsers: newUsers[days] ?? 0,
      tournamentParticipants: tournamentParticipants[days] ?? 0,
      tournamentGamesPlayed: tournamentGames[days] ?? 0,
      friendGamesPlayed: friendGames[days] ?? 0,
    }));
  }

  private async buildTrend(days: number, matchmakingEnabled: boolean) {
    const userTrend = await this.getDailyCounts(
      'users',
      'created_at',
      days,
      Prisma.sql`"account_type" <> 'GUEST'`,
    );
    const gameTrend = await this.getDailyCounts('games', 'created_at', days);
    const tournamentGameTrend = await this.getDailyCounts(
      'games',
      'created_at',
      days,
      Prisma.sql`"tournament_match_game_id" IS NOT NULL`,
    );
    const friendGameTrend = await this.getDailyCounts(
      'games',
      'created_at',
      days,
      Prisma.sql`"invite_code" IS NOT NULL`,
    );
    const tournamentParticipantTrend = await this.getDailyDistinctCounts(
      'tournament_participants',
      'registered_at',
      'user_id',
      days,
    );
    const searchTrend = matchmakingEnabled
      ? await this.getDailyCounts('matchmaking_searches', 'started_at', days)
      : this.createEmptyDailyCounts(days);
    const matchedSearchTrend = matchmakingEnabled
      ? await this.getDailyCounts(
          'matchmaking_searches',
          'started_at',
          days,
          Prisma.sql`"status" = 'MATCHED'`,
        )
      : this.createEmptyDailyCounts(days);

    return userTrend.map((point, index) => ({
      date: point.date,
      newRegisteredUsers: point.count,
      gamesPlayed: gameTrend[index]?.count ?? 0,
      searches: searchTrend[index]?.count ?? 0,
      matchedSearches: matchedSearchTrend[index]?.count ?? 0,
      tournamentParticipants: tournamentParticipantTrend[index]?.count ?? 0,
      tournamentGamesPlayed: tournamentGameTrend[index]?.count ?? 0,
      friendGamesPlayed: friendGameTrend[index]?.count ?? 0,
    }));
  }

  private async getWindowCounts(
    table: string,
    timestampColumn: string,
    extraWhere?: Prisma.Sql,
  ): Promise<Record<number, number>> {
    const tableSql = Prisma.raw(`"${table}"`);
    const columnSql = Prisma.raw(`"${timestampColumn}"`);
    const selects = AdminController.ANALYTICS_WINDOWS.map((days) =>
      Prisma.sql`
        COUNT(*) FILTER (
          WHERE ${columnSql} >= NOW() - (${days} * INTERVAL '1 day')
        )::bigint AS ${Prisma.raw(`"d${days}"`)}
      `,
    );

    const [row] = await this.prisma.$queryRaw<WindowCountsRow[]>(Prisma.sql`
      SELECT ${Prisma.join(selects)}
      FROM ${tableSql}
      ${extraWhere ? Prisma.sql`WHERE ${extraWhere}` : Prisma.empty}
    `);

    return this.parseWindowRow(row);
  }

  private async getWindowDistinctCounts(
    table: string,
    timestampColumn: string,
    distinctColumn: string,
  ): Promise<Record<number, number>> {
    const tableSql = Prisma.raw(`"${table}"`);
    const columnSql = Prisma.raw(`"${timestampColumn}"`);
    const distinctSql = Prisma.raw(`"${distinctColumn}"`);
    const selects = AdminController.ANALYTICS_WINDOWS.map((days) =>
      Prisma.sql`
        COUNT(DISTINCT CASE
          WHEN ${columnSql} >= NOW() - (${days} * INTERVAL '1 day')
          THEN ${distinctSql}
        END)::bigint AS ${Prisma.raw(`"d${days}"`)}
      `,
    );

    const [row] = await this.prisma.$queryRaw<WindowCountsRow[]>(Prisma.sql`
      SELECT ${Prisma.join(selects)}
      FROM ${tableSql}
    `);

    return this.parseWindowRow(row);
  }

  private async getDailyCounts(
    table: string,
    timestampColumn: string,
    days: number,
    extraWhere?: Prisma.Sql,
  ): Promise<Array<{ date: string; count: number }>> {
    const tableSql = Prisma.raw(`"${table}"`);
    const columnSql = Prisma.raw(`"${timestampColumn}"`);

    const rows = await this.prisma.$queryRaw<DailyCountRow[]>(Prisma.sql`
      WITH series AS (
        SELECT generate_series(
          CURRENT_DATE - ((${days - 1}) * INTERVAL '1 day'),
          CURRENT_DATE,
          INTERVAL '1 day'
        )::date AS day
      ),
      counts AS (
        SELECT
          DATE_TRUNC('day', ${columnSql})::date AS day,
          COUNT(*)::bigint AS count
        FROM ${tableSql}
        WHERE ${columnSql} >= CURRENT_DATE - ((${days - 1}) * INTERVAL '1 day')
          ${extraWhere ? Prisma.sql`AND ${extraWhere}` : Prisma.empty}
        GROUP BY 1
      )
      SELECT
        TO_CHAR(series.day, 'YYYY-MM-DD') AS date,
        COALESCE(counts.count, 0)::bigint AS count
      FROM series
      LEFT JOIN counts ON counts.day = series.day
      ORDER BY series.day ASC
    `);

    return rows.map((row) => ({
      date: row.date,
      count: Number(row.count),
    }));
  }

  private async getDailyDistinctCounts(
    table: string,
    timestampColumn: string,
    distinctColumn: string,
    days: number,
  ): Promise<Array<{ date: string; count: number }>> {
    const tableSql = Prisma.raw(`"${table}"`);
    const columnSql = Prisma.raw(`"${timestampColumn}"`);
    const distinctSql = Prisma.raw(`"${distinctColumn}"`);

    const rows = await this.prisma.$queryRaw<DailyCountRow[]>(Prisma.sql`
      WITH series AS (
        SELECT generate_series(
          CURRENT_DATE - ((${days - 1}) * INTERVAL '1 day'),
          CURRENT_DATE,
          INTERVAL '1 day'
        )::date AS day
      ),
      counts AS (
        SELECT
          DATE_TRUNC('day', ${columnSql})::date AS day,
          COUNT(DISTINCT ${distinctSql})::bigint AS count
        FROM ${tableSql}
        WHERE ${columnSql} >= CURRENT_DATE - ((${days - 1}) * INTERVAL '1 day'
        )
        GROUP BY 1
      )
      SELECT
        TO_CHAR(series.day, 'YYYY-MM-DD') AS date,
        COALESCE(counts.count, 0)::bigint AS count
      FROM series
      LEFT JOIN counts ON counts.day = series.day
      ORDER BY series.day ASC
    `);

    return rows.map((row) => ({
      date: row.date,
      count: Number(row.count),
    }));
  }

  private async countDistinctTournamentParticipants(): Promise<number> {
    const [row] = await this.prisma.$queryRaw<{ count: bigint }[]>(Prisma.sql`
      SELECT COUNT(DISTINCT "user_id")::bigint AS count
      FROM "tournament_participants"
    `);

    return Number(row?.count ?? 0n);
  }

  private async countMatchmakingSearches(): Promise<number> {
    const [row] = await this.prisma.$queryRaw<{ count: bigint }[]>(Prisma.sql`
      SELECT COUNT(*)::bigint AS count
      FROM "matchmaking_searches"
    `);

    return Number(row?.count ?? 0n);
  }

  private parseWindowRow(row?: WindowCountsRow): Record<number, number> {
    const result: Record<number, number> = {};

    for (const days of AdminController.ANALYTICS_WINDOWS) {
      result[days] = Number(row?.[`d${days}`] ?? 0n);
    }

    return result;
  }

  private createEmptyWindowCounts(): Record<number, number> {
    const result: Record<number, number> = {};

    for (const days of AdminController.ANALYTICS_WINDOWS) {
      result[days] = 0;
    }

    return result;
  }

  private createEmptyDailyCounts(days: number): Array<{ date: string; count: number }> {
    const points: Array<{ date: string; count: number }> = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      points.push({
        date: date.toISOString().slice(0, 10),
        count: 0,
      });
    }

    return points;
  }

  private async hasMatchmakingSearchesTable(): Promise<boolean> {
    const [row] = await this.prisma.$queryRaw<Array<{ exists: string | null }>>(Prisma.sql`
      SELECT to_regclass('public.matchmaking_searches')::text AS exists
    `);

    const exists = row?.exists != null;
    if (!exists) {
      this.logger.warn(
        'matchmaking_searches table is missing; returning 0 for matchmaking analytics until migrations are applied',
      );
    }

    return exists;
  }
}
