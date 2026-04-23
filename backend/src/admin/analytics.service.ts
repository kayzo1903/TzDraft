import { Injectable, Logger } from '@nestjs/common';
import { AccountType, GameType, Prisma } from '@prisma/client';
import { PrismaService } from '../infrastructure/database/prisma/prisma.service';

type WindowCountsRow = Record<string, bigint>;
type DailyCountRow = { date: string; count: bigint };
type CommunicationTotalsRow = {
  sent: bigint;
  read: bigint;
  unread: bigint;
  uniqueRecipients: bigint;
  sentLast7Days: bigint;
  readLast7Days: bigint;
  uniqueRecipientsLast7Days: bigint;
  sentLast30Days: bigint;
  readLast30Days: bigint;
  uniqueRecipientsLast30Days: bigint;
};
type CommunicationTypeRow = {
  type: string;
  sent: bigint;
  read: bigint;
  unread: bigint;
  uniqueRecipients: bigint;
};
type CommunicationDailyTrendRow = {
  date: string;
  sent: bigint;
  read: bigint;
  uniqueRecipients: bigint;
};

const ANALYTICS_WINDOWS = [1, 3, 7, 30, 90, 365] as const;

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getAnalytics() {
    const now = new Date();
    const trendDays = 30;
    const matchmakingEnabled = await this.hasMatchmakingSearchesTable();

    const totalUsers = await this.prisma.user.count();
    const totalRegisteredUsers = await this.prisma.user.count({
      where: { accountType: { not: AccountType.GUEST } },
    });
    const activeGames = await this.prisma.game.count({
      where: { status: 'ACTIVE' },
    });
    const totalGames = await this.prisma.game.count();
    const totalTournamentGames = await this.prisma.game.count({
      where: { tournamentMatchGameId: { not: null } },
    });
    const totalTournamentParticipants =
      await this.countDistinctTournamentParticipants();
    const totalMatchmakingSearches = matchmakingEnabled
      ? await this.countMatchmakingSearches()
      : 0;

    // Use a rolling 24-hour window instead of local midnight so stats don't wipe every morning
    const today = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const dailyVisits = await this.countUsersByLastLoginSince(today);
    const dailyGuestUsers = await this.countUsersByLastLoginSince(
      today,
      Prisma.sql`"account_type" = 'GUEST'`,
    );
    const dailyRegisteredRevisits = await this.countUsersByLastLoginSince(
      today,
      Prisma.sql`"account_type" <> 'GUEST' AND "role" <> 'ADMIN' AND "created_at" < ${today}`,
    );
    const dailyAiGames = await this.prisma.aiChallengeSession.count({
      where: {
        startedAt: { gte: today },
      },
    });
    const dailyMatchPairings = matchmakingEnabled
      ? await this.countMatchmakingPairingsSince(today)
      : 0;
    const dailyFriendMatches = await this.prisma.game.count({
      where: {
        inviteCode: { not: null },
        createdAt: { gte: today },
      },
    });
    const dailyMatchmakingSearches = matchmakingEnabled
      ? await this.countMatchmakingSearchesSince(today)
      : 0;

    const [liveRanked, liveCasual, liveAi, liveTournament, liveFriend] =
      await Promise.all([
        this.prisma.game.count({
          where: { status: 'ACTIVE', gameType: 'RANKED' },
        }),
        this.prisma.game.count({
          where: { status: 'ACTIVE', gameType: 'CASUAL' },
        }),
        this.prisma.aiChallengeSession.count({ where: { completedAt: null } }),
        this.prisma.game.count({
          where: { status: 'ACTIVE', gameType: 'TOURNAMENT' },
        }),
        this.prisma.game.count({
          where: { status: 'ACTIVE', inviteCode: { not: null } },
        }),
      ]);

    const [friendGamesActive, friendGamesTotal] = await Promise.all([
      this.prisma.game.count({
        where: { status: 'ACTIVE', inviteCode: { not: null } },
      }),
      this.prisma.game.count({ where: { inviteCode: { not: null } } }),
    ]);

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
        dailyVisits,
        dailyGuestUsers,
        dailyRegisteredRevisits,
        dailyAiGames,
        dailyMatchmakingSearches,
        dailyMatchPairings,
        dailyFriendMatches,
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

  // ─── Tournament Winners ───────────────────────────────────────────────────

  private async getRecentTournamentWinners(limit: number) {
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
    const visits = await this.getWindowCounts('users', 'last_login_at');
    const guestUsers = await this.getWindowCounts(
      'users',
      'last_login_at',
      Prisma.sql`"account_type" = 'GUEST'`,
    );
    const revisitUsers = await this.getWindowRevisitCounts();
    const aiGames = await this.getWindowCounts(
      'ai_challenge_sessions',
      'started_at',
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
          'matched_at',
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

    return ANALYTICS_WINDOWS.map((days) => ({
      days,
      visits: visits[days] ?? 0,
      guestUsers: guestUsers[days] ?? 0,
      revisitUsers: revisitUsers[days] ?? 0,
      aiGames: aiGames[days] ?? 0,
      gamesPlayed: games[days] ?? 0,
      searches: searches[days] ?? 0,
      matchedSearches: matchedSearches[days] ?? 0,
      expiredSearches: expiredSearches[days] ?? 0,
      newRegisteredUsers: newUsers[days] ?? 0,
      tournamentParticipants: tournamentParticipants[days] ?? 0,
      tournamentGamesPlayed: tournamentGames[days] ?? 0,
      friendGamesPlayed: friendGames[days] ?? 0,
      matchPairings: matchedSearches[days] ?? 0,
    }));
  }

  private async buildTrend(days: number, matchmakingEnabled: boolean) {
    const userTrend = await this.getDailyCounts(
      'users',
      'created_at',
      days,
      Prisma.sql`"account_type" <> 'GUEST'`,
    );
    const visitTrend = await this.getDailyCounts(
      'users',
      'last_login_at',
      days,
    );
    const guestTrend = await this.getDailyCounts(
      'users',
      'last_login_at',
      days,
      Prisma.sql`"account_type" = 'GUEST'`,
    );
    const revisitTrend = await this.getDailyRevisitCounts(days);
    const gameTrend = await this.getDailyCounts('games', 'created_at', days);
    const aiGameTrend = await this.getDailyCounts(
      'ai_challenge_sessions',
      'started_at',
      days,
    );
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
          'matched_at',
          days,
          Prisma.sql`"status" = 'MATCHED'`,
        )
      : this.createEmptyDailyCounts(days);

    return userTrend.map((point, index) => ({
      date: point.date,
      newRegisteredUsers: point.count,
      visits: visitTrend[index]?.count ?? 0,
      guestUsers: guestTrend[index]?.count ?? 0,
      revisitUsers: revisitTrend[index]?.count ?? 0,
      aiGames: aiGameTrend[index]?.count ?? 0,
      gamesPlayed: gameTrend[index]?.count ?? 0,
      searches: searchTrend[index]?.count ?? 0,
      matchedSearches: matchedSearchTrend[index]?.count ?? 0,
      tournamentParticipants: tournamentParticipantTrend[index]?.count ?? 0,
      tournamentGamesPlayed: tournamentGameTrend[index]?.count ?? 0,
      friendGamesPlayed: friendGameTrend[index]?.count ?? 0,
      matchPairings: matchedSearchTrend[index]?.count ?? 0,
    }));
  }

  private async getWindowCounts(
    table: string,
    timestampColumn: string,
    extraWhere?: Prisma.Sql,
  ): Promise<Record<number, number>> {
    const tableSql = Prisma.raw(`"${table}"`);
    const columnSql = Prisma.raw(`"${timestampColumn}"`);
    const selects = ANALYTICS_WINDOWS.map(
      (days) =>
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
    const selects = ANALYTICS_WINDOWS.map(
      (days) =>
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

  private async getWindowRevisitCounts(): Promise<Record<number, number>> {
    const result: Record<number, number> = {};

    for (const days of ANALYTICS_WINDOWS) {
      const [row] = await this.prisma.$queryRaw<WindowCountsRow[]>(Prisma.sql`
        SELECT COUNT(*)::bigint AS "count"
        FROM "users"
        WHERE "account_type" <> 'GUEST'
          AND "role" <> 'ADMIN'
          AND "last_login_at" >= NOW() - (${days} * INTERVAL '1 day')
          AND "created_at" < DATE_TRUNC('day', "last_login_at")
      `);

      result[days] = Number(row?.count ?? 0n);
    }

    return result;
  }

  private async getDailyRevisitCounts(
    days: number,
  ): Promise<Array<{ date: string; count: number }>> {
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
          DATE_TRUNC('day', "last_login_at")::date AS day,
          COUNT(*)::bigint AS count
        FROM "users"
        WHERE "last_login_at" >= CURRENT_DATE - ((${days - 1}) * INTERVAL '1 day')
          AND "account_type" <> 'GUEST'
          AND "role" <> 'ADMIN'
          AND "created_at" < DATE_TRUNC('day', "last_login_at")
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

  private async countUsersByLastLoginSince(
    since: Date,
    extraWhere?: Prisma.Sql,
  ): Promise<number> {
    const [row] = await this.prisma.$queryRaw<{ count: bigint }[]>(Prisma.sql`
      SELECT COUNT(*)::bigint AS count
      FROM "users"
      WHERE "last_login_at" >= ${since}
      ${extraWhere ? Prisma.sql`AND ${extraWhere}` : Prisma.empty}
    `);

    return Number(row?.count ?? 0n);
  }

  private async countMatchmakingPairingsSince(since: Date): Promise<number> {
    const [row] = await this.prisma.$queryRaw<{ count: bigint }[]>(Prisma.sql`
      SELECT COUNT(*)::bigint AS count
      FROM "matchmaking_searches"
      WHERE "status" = 'MATCHED'
        AND "matched_at" >= ${since}
    `);

    return Number(row?.count ?? 0n);
  }

  private async countMatchmakingSearchesSince(since: Date): Promise<number> {
    const [row] = await this.prisma.$queryRaw<{ count: bigint }[]>(Prisma.sql`
      SELECT COUNT(*)::bigint AS count
      FROM "matchmaking_searches"
      WHERE "started_at" >= ${since}
    `);

    return Number(row?.count ?? 0n);
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

    for (const days of ANALYTICS_WINDOWS) {
      result[days] = Number(row?.[`d${days}`] ?? 0n);
    }

    return result;
  }

  private createEmptyWindowCounts(): Record<number, number> {
    const result: Record<number, number> = {};

    for (const days of ANALYTICS_WINDOWS) {
      result[days] = 0;
    }

    return result;
  }

  private createEmptyDailyCounts(
    days: number,
  ): Array<{ date: string; count: number }> {
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
    const [row] = await this.prisma.$queryRaw<
      Array<{ exists: string | null }>
    >(Prisma.sql`
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
