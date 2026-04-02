"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { tournamentService, type Tournament } from "@/services/tournament.service";
import {
  adminService,
  type AdminAnalyticsResponse,
  type AnalyticsWindow,
  type TournamentWinner,
} from "@/services/admin.service";
import {
  ArrowRight,
  Bot,
  Gamepad2,
  HandshakeIcon,
  RefreshCw,
  Search,
  TimerReset,
  Trophy,
  TrendingUp,
  UserPlus,
  Users,
  Wifi,
  Zap,
} from "lucide-react";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en", { month: "short", day: "numeric" });
}

function fmtDateFull(iso: string) {
  return new Date(iso).toLocaleDateString("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

// ─── Tooltip ─────────────────────────────────────────────────────────────────

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 text-xs shadow-xl">
      <p className="mb-2 font-medium text-gray-400">{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} style={{ color: entry.color }} className="font-semibold">
          {entry.name}: {formatNumber(entry.value)}
        </p>
      ))}
    </div>
  );
}

// ─── KPI Card ────────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  icon: Icon,
  accent = "amber",
  sub,
  live = false,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  accent?: string;
  sub?: string;
  live?: boolean;
}) {
  const colors: Record<string, string> = {
    amber: "from-amber-500/20 to-amber-500/0 border-amber-500/30",
    emerald: "from-emerald-500/20 to-emerald-500/0 border-emerald-500/30",
    sky: "from-sky-500/20 to-sky-500/0 border-sky-500/30",
    violet: "from-violet-500/20 to-violet-500/0 border-violet-500/30",
    rose: "from-rose-500/20 to-rose-500/0 border-rose-500/30",
    orange: "from-orange-500/20 to-orange-500/0 border-orange-500/30",
  };
  const iconColors: Record<string, string> = {
    amber: "text-amber-400 bg-amber-400/10 border-amber-400/20",
    emerald: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
    sky: "text-sky-400 bg-sky-400/10 border-sky-400/20",
    violet: "text-violet-400 bg-violet-400/10 border-violet-400/20",
    rose: "text-rose-400 bg-rose-400/10 border-rose-400/20",
    orange: "text-orange-400 bg-orange-400/10 border-orange-400/20",
  };

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border bg-gradient-to-br ${colors[accent] ?? colors.amber} bg-gray-900 p-5 transition-all hover:scale-[1.01] hover:shadow-lg hover:shadow-black/30`}
    >
      <div className="mb-3 flex items-start justify-between">
        <div className={`rounded-xl border p-2.5 ${iconColors[accent] ?? iconColors.amber}`}>
          <Icon className="h-4 w-4" />
        </div>
        {live && (
          <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
            </span>
            LIVE
          </span>
        )}
      </div>
      <p className="text-2xl font-bold tracking-tight text-white">{value}</p>
      <p className="mt-0.5 text-sm text-gray-500">{label}</p>
      {sub && <p className="mt-1.5 text-xs text-gray-600">{sub}</p>}
    </div>
  );
}

// ─── Stat Row ────────────────────────────────────────────────────────────────

function StatRow({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-gray-800 bg-black/20 px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="rounded-lg border border-white/10 bg-white/5 p-2">
          <Icon className="h-4 w-4 text-amber-300" />
        </div>
        <span className="text-sm text-gray-400">{label}</span>
      </div>
      <span className="text-sm font-semibold text-white">{value}</span>
    </div>
  );
}

// ─── Window Row ──────────────────────────────────────────────────────────────

function WindowRow({ row }: { row: AnalyticsWindow }) {
  const matchRate =
    row.searches > 0 ? Math.round((row.matchedSearches / row.searches) * 100) : 0;

  return (
    <tr className="bg-gray-900/20 hover:bg-gray-900/50 transition-colors">
      <td className="px-4 py-3 font-semibold text-white">
        {row.days === 1 ? "24h" : row.days === 365 ? "1yr" : `${row.days}d`}
      </td>
      <td className="px-4 py-3 text-sky-300">{formatNumber(row.visits)}</td>
      <td className="px-4 py-3 text-indigo-300">{formatNumber(row.guestUsers)}</td>
      <td className="px-4 py-3 text-emerald-300">{formatNumber(row.revisitUsers)}</td>
      <td className="px-4 py-3 text-cyan-300">{formatNumber(row.aiGames)}</td>
      <td className="px-4 py-3 text-gray-300">{formatNumber(row.gamesPlayed)}</td>
      <td className="px-4 py-3 text-orange-300">{formatNumber(row.friendGamesPlayed)}</td>
      <td className="px-4 py-3 text-violet-300">{formatNumber(row.matchPairings)}</td>
      <td className="px-4 py-3 text-sky-300">{formatNumber(row.searches)}</td>
      <td className="px-4 py-3 text-emerald-300">
        {formatNumber(row.matchedSearches)}
        <span className="ml-2 text-xs text-gray-500">{matchRate}%</span>
      </td>
      <td className="px-4 py-3 text-rose-300">{formatNumber(row.expiredSearches)}</td>
      <td className="px-4 py-3 text-gray-300">{formatNumber(row.tournamentParticipants)}</td>
      <td className="px-4 py-3 text-amber-300">{formatNumber(row.tournamentGamesPlayed)}</td>
    </tr>
  );
}

// ─── Tournament Winners ───────────────────────────────────────────────────────

function WinnersSection({ winners }: { winners: TournamentWinner[] }) {
  if (winners.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <Trophy className="mb-3 h-8 w-8 text-gray-700" />
        <p className="text-sm text-gray-500">No completed tournaments yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {winners.map((w, i) => (
        <div
          key={w.tournamentId}
          className="flex items-center gap-4 rounded-xl border border-gray-800 bg-black/20 px-4 py-3"
        >
          <div
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
              i === 0
                ? "bg-amber-400/20 text-amber-300 border border-amber-400/30"
                : i === 1
                ? "bg-gray-400/20 text-gray-300 border border-gray-400/30"
                : "bg-orange-800/20 text-orange-400 border border-orange-800/30"
            }`}
          >
            {i + 1}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">{w.tournamentName}</p>
            <p className="text-xs text-gray-500">
              {w.completedAt ? fmtDateFull(w.completedAt) : "—"}
            </p>
          </div>
          <div className="text-right">
            {w.winnerName ? (
              <div className="flex items-center gap-1.5">
                <Trophy className="h-3.5 w-3.5 text-amber-400" />
                <span className="text-sm font-semibold text-amber-300">{w.winnerName}</span>
              </div>
            ) : (
              <span className="text-xs text-gray-600">No winner data</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Live Breakdown Tooltip ───────────────────────────────────────────────────

function LiveBreakdown({
  breakdown,
}: {
  breakdown: AdminAnalyticsResponse["liveBreakdown"];
}) {
  const items = [
    { label: "Ranked", value: breakdown.ranked, color: "text-violet-400" },
    { label: "Casual", value: breakdown.casual, color: "text-sky-400" },
    { label: "Friend", value: breakdown.friend, color: "text-orange-400" },
    { label: "Tournament", value: breakdown.tournament, color: "text-amber-400" },
    { label: "vs AI", value: breakdown.ai, color: "text-emerald-400" },
  ];
  return (
    <div className="mt-2 space-y-1">
      {items.map((it) => (
        <div key={it.label} className="flex items-center justify-between text-xs">
          <span className="text-gray-500">{it.label}</span>
          <span className={`font-semibold ${it.color}`}>{it.value}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

const REFRESH_INTERVAL_MS = 30_000;

export default function AdminDashboard() {
  const { locale } = useParams<{ locale: string }>();
  const [analytics, setAnalytics] = useState<AdminAnalyticsResponse | null>(null);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [secondsAgo, setSecondsAgo] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const tickRef = useRef<ReturnType<typeof setInterval>>(undefined);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [analyticsResponse, tournamentsResponse] = await Promise.all([
        adminService.getAnalytics(),
        tournamentService.list(),
      ]);
      setAnalytics(analyticsResponse);
      setTournaments(tournamentsResponse);
      const updated = new Date(analyticsResponse.generatedAt);
      setLastUpdated(updated);
      setSecondsAgo(0);
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-refresh every 30s
  useEffect(() => {
    fetchAll();
    intervalRef.current = setInterval(fetchAll, REFRESH_INTERVAL_MS);
    return () => clearInterval(intervalRef.current);
  }, [fetchAll]);

  // Tick counter (seconds since last update)
  useEffect(() => {
    tickRef.current = setInterval(() => {
      setSecondsAgo((s) => s + 1);
    }, 1000);
    return () => clearInterval(tickRef.current);
  }, []);

  const chartData =
    analytics?.trend.map((point) => ({
      ...point,
      date: fmtDate(point.date),
    })) ?? [];

  const activeTournaments = tournaments.filter((t) => t.status === "ACTIVE").length;
  const registrationTournaments = tournaments.filter((t) => t.status === "REGISTRATION").length;
  const draftTournaments = tournaments.filter((t) => t.status === "DRAFT").length;
  const latestTournament = [...tournaments].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )[0];

  const freshness =
    secondsAgo < 10
      ? "Just now"
      : secondsAgo < 60
      ? `${secondsAgo}s ago`
      : `${Math.floor(secondsAgo / 60)}m ago`;

  return (
    <div className="space-y-8">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <div className="mt-1 flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span
                className={`absolute inline-flex h-full w-full rounded-full ${
                  secondsAgo < 35 ? "bg-emerald-400 animate-ping opacity-75" : "bg-gray-600"
                }`}
              />
              <span
                className={`relative inline-flex h-2 w-2 rounded-full ${
                  secondsAgo < 35 ? "bg-emerald-400" : "bg-gray-600"
                }`}
              />
            </span>
            <p className="text-xs text-gray-500">
              {lastUpdated ? `Updated ${freshness} · auto-refreshes every 30s` : "Loading…"}
            </p>
          </div>
        </div>
        <button
          onClick={fetchAll}
          disabled={loading}
          className="rounded-lg border border-gray-800 p-2 text-gray-400 transition-colors hover:border-gray-600 hover:text-white disabled:opacity-40"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* ── KPI Row 1: Users & Total Games ── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          label="Total Users"
          value={analytics ? formatNumber(analytics.overview.totalUsers) : "—"}
          icon={Users}
          accent="amber"
        />
        <KpiCard
          label="Registered Users"
          value={analytics ? formatNumber(analytics.overview.totalRegisteredUsers) : "—"}
          icon={UserPlus}
          accent="emerald"
        />
        <KpiCard
          label="Total Games"
          value={analytics ? formatNumber(analytics.overview.totalGames) : "—"}
          icon={Gamepad2}
          accent="sky"
        />
        <KpiCard
          label="Friend Games Created"
          value={analytics ? formatNumber(analytics.friendGames.total) : "—"}
          icon={HandshakeIcon}
          accent="orange"
          sub={analytics ? `${analytics.friendGames.active} active now` : undefined}
        />
      </div>

      {/* ── KPI Row 1.1: Daily engagement -- */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          label="Daily Visits"
          value={analytics ? formatNumber(analytics.overview.dailyVisits) : "—"}
          icon={Zap}
          accent="violet"
        />
        <KpiCard
          label="Daily Guest Users"
          value={analytics ? formatNumber(analytics.overview.dailyGuestUsers) : "—"}
          icon={Users}
          accent="blue"
        />
        <KpiCard
          label="Daily Registered Revisit"
          value={analytics ? formatNumber(analytics.overview.dailyRegisteredRevisits) : "—"}
          icon={TimerReset}
          accent="emerald"
        />
        <KpiCard
          label="Daily AI Games"
          value={analytics ? formatNumber(analytics.overview.dailyAiGames) : "—"}
          icon={Bot}
          accent="cyan"
        />
      </div>

      {/* ── KPI Row 1.2: Matching -- */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          label="Daily Match Pairings"
          value={analytics ? formatNumber(analytics.overview.dailyMatchPairings) : "—"}
          icon={HandshakeIcon}
          accent="sky"
        />
        <KpiCard
          label="Daily Friend Matches"
          value={analytics ? formatNumber(analytics.overview.dailyFriendMatches) : "—"}
          icon={HandshakeIcon}
          accent="orange"
        />
        <div />
        <div />
      </div>

      {/* ── KPI Row 2: Live ── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          label="Live Games"
          value={analytics ? formatNumber(analytics.overview.activeGames) : "—"}
          icon={Wifi}
          accent="emerald"
          live
        />
        <KpiCard
          label="Live Ranked"
          value={analytics ? formatNumber(analytics.liveBreakdown.ranked) : "—"}
          icon={TrendingUp}
          accent="violet"
          live
        />
        <KpiCard
          label="Live Friend Games"
          value={analytics ? formatNumber(analytics.liveBreakdown.friend) : "—"}
          icon={HandshakeIcon}
          accent="orange"
          live
        />
        <KpiCard
          label="Live vs AI"
          value={analytics ? formatNumber(analytics.liveBreakdown.ai) : "—"}
          icon={Bot}
          accent="sky"
          live
        />
      </div>

      {/* ── Tournament Management + Winners ── */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.4fr_1fr]">
        <section className="rounded-2xl border border-gray-800 bg-gray-900 p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-white">Tournament Management</p>
              <p className="mt-1 text-sm text-gray-400">
                Create tournaments, monitor brackets, and open the latest control room quickly.
              </p>
            </div>
            <div className="rounded-xl border border-amber-400/20 bg-amber-400/10 p-3">
              <Trophy className="h-5 w-5 text-amber-300" />
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-gray-800 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-wide text-gray-500">All tournaments</p>
              <p className="mt-2 text-2xl font-bold text-white">{tournaments.length}</p>
            </div>
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4">
              <p className="text-xs uppercase tracking-wide text-emerald-200/80">Open registration</p>
              <p className="mt-2 text-2xl font-bold text-white">{registrationTournaments}</p>
            </div>
            <div className="rounded-xl border border-sky-500/20 bg-sky-500/10 p-4">
              <p className="text-xs uppercase tracking-wide text-sky-200/80">Active brackets</p>
              <p className="mt-2 text-2xl font-bold text-white">{activeTournaments}</p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href={`/${locale}/admin/tournaments`}
              className="inline-flex items-center gap-2 rounded-xl bg-amber-400 px-4 py-2 text-sm font-semibold text-gray-950 transition hover:bg-amber-300"
            >
              Open tournament admin
              <ArrowRight className="h-4 w-4" />
            </Link>
            {latestTournament && (
              <Link
                href={`/${locale}/admin/tournaments/${latestTournament.id}`}
                className="inline-flex items-center gap-2 rounded-xl border border-gray-700 px-4 py-2 text-sm font-semibold text-gray-200 transition hover:border-gray-500 hover:text-white"
              >
                Latest monitor
                <ArrowRight className="h-4 w-4" />
              </Link>
            )}
          </div>
        </section>

        {/* Tournament Winners */}
        <section className="rounded-2xl border border-gray-800 bg-gray-900 p-6">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-white">Tournament Winners</p>
              <p className="mt-1 text-xs text-gray-500">Most recently completed</p>
            </div>
            <div className="rounded-xl border border-amber-400/20 bg-amber-400/10 p-2.5">
              <Zap className="h-4 w-4 text-amber-300" />
            </div>
          </div>
          <WinnersSection winners={analytics?.recentTournamentWinners ?? []} />
        </section>
      </div>

      {/* ── Lifetime Totals + Live Breakdown ── */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border border-gray-800 bg-gray-900 p-6">
          <p className="mb-5 text-sm font-semibold text-white">Lifetime Totals</p>
          <div className="space-y-3">
            <StatRow
              label="Matchmaking searches"
              value={analytics ? formatNumber(analytics.overview.totalMatchmakingSearches) : "—"}
              icon={Search}
            />
            <StatRow
              label="Tournament participants"
              value={
                analytics ? formatNumber(analytics.overview.totalTournamentParticipants) : "—"
              }
              icon={Users}
            />
            <StatRow
              label="Tournament games played"
              value={analytics ? formatNumber(analytics.overview.totalTournamentGames) : "—"}
              icon={Trophy}
            />
            <StatRow
              label="Draft tournaments"
              value={formatNumber(draftTournaments)}
              icon={TimerReset}
            />
          </div>
        </section>

        <section className="rounded-2xl border border-gray-800 bg-gray-900 p-6">
          <p className="mb-4 text-sm font-semibold text-white">Live Game Breakdown</p>
          {analytics ? (
            <>
              <div className="mb-4 flex items-baseline gap-2">
                <span className="text-4xl font-bold text-white">
                  {analytics.overview.activeGames}
                </span>
                <span className="text-sm text-gray-400">games active right now</span>
                <span className="ml-auto flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  </span>
                  LIVE
                </span>
              </div>
              <LiveBreakdown breakdown={analytics.liveBreakdown} />
            </>
          ) : (
            <p className="text-sm text-gray-500">Loading…</p>
          )}
        </section>
      </div>

      {/* ── Charts ── */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border border-gray-800 bg-gray-900 p-6">
          <p className="mb-5 text-sm font-semibold text-white">
            Daily Registrations & Searches
          </p>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gradUsers" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradVisits" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradAiGames" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#22d3ee" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradSearches" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis
                dataKey="date"
                tick={{ fill: "#6b7280", fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fill: "#6b7280", fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip content={<ChartTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: "11px", paddingTop: "12px" }}
                formatter={(value) => <span style={{ color: "#9ca3af" }}>{value}</span>}
              />
              <Area
                type="monotone"
                dataKey="newRegisteredUsers"
                name="New Users"
                stroke="#f59e0b"
                strokeWidth={2}
                fill="url(#gradUsers)"
                dot={false}
                activeDot={{ r: 4, fill: "#f59e0b" }}
              />
              <Area
                type="monotone"                dataKey="visits"
                name="Visits"
                stroke="#8b5cf6"
                strokeWidth={2}
                fill="url(#gradVisits)"
                dot={false}
                activeDot={{ r: 4, fill: "#8b5cf6" }}
              />
              <Area
                type="monotone"
                dataKey="aiGames"
                name="AI Games"
                stroke="#22d3ee"
                strokeWidth={2}
                fill="url(#gradAiGames)"
                dot={false}
                activeDot={{ r: 4, fill: "#22d3ee" }}
              />
              <Area
                type="monotone"                dataKey="searches"
                name="Match Searches"
                stroke="#38bdf8"
                strokeWidth={2}
                fill="url(#gradSearches)"
                dot={false}
                activeDot={{ r: 4, fill: "#38bdf8" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </section>

        <section className="rounded-2xl border border-gray-800 bg-gray-900 p-6">
          <p className="mb-5 text-sm font-semibold text-white">
            Daily Games — Regular, Friend & Tournament
          </p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fill: "#6b7280", fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fill: "#6b7280", fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip content={<ChartTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: "11px", paddingTop: "12px" }}
                formatter={(value) => <span style={{ color: "#9ca3af" }}>{value}</span>}
              />
              <Bar
                dataKey="gamesPlayed"
                name="All Games"
                fill="#818cf8"
                radius={[4, 4, 0, 0]}
                maxBarSize={22}
              />
              <Bar
                dataKey="friendGamesPlayed"
                name="Friend Games"
                fill="#fb923c"
                radius={[4, 4, 0, 0]}
                maxBarSize={22}
              />
              <Bar
                dataKey="tournamentGamesPlayed"
                name="Tournament Games"
                fill="#f59e0b"
                radius={[4, 4, 0, 0]}
                maxBarSize={22}
              />
            </BarChart>
          </ResponsiveContainer>
        </section>
      </div>

      {/* ── Window Summary ── */}
      <section className="rounded-2xl border border-gray-800 bg-gray-900 p-6">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-white">Window Summary</p>
            <p className="mt-1 text-sm text-gray-400">
              Rolling totals for 24h, 3d, 7d, 30d, 90d and 1yr.
            </p>
          </div>
          <div className="rounded-xl border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-xs font-semibold text-amber-200">
            Timeout searches included
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-gray-800">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-800 bg-black/20 text-gray-400">
              <tr>
                <th className="px-4 py-3">Window</th>
                <th className="px-4 py-3 text-sky-400">Visits</th>
                <th className="px-4 py-3 text-indigo-400">Guest Users</th>
                <th className="px-4 py-3 text-emerald-400">Revisit Users</th>
                <th className="px-4 py-3 text-cyan-400">AI Games</th>
                <th className="px-4 py-3">Games</th>
                <th className="px-4 py-3 text-orange-400">Friend Games</th>
                <th className="px-4 py-3 text-violet-400">Pairings</th>
                <th className="px-4 py-3 text-sky-400">Searches</th>
                <th className="px-4 py-3 text-emerald-400">Matched</th>
                <th className="px-4 py-3 text-rose-400">Expired</th>
                <th className="px-4 py-3">Tournament Users</th>
                <th className="px-4 py-3 text-amber-400">Tournament Games</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {(analytics?.windows ?? []).map((row) => (
                <WindowRow key={row.days} row={row} />
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
