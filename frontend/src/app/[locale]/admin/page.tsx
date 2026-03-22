"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { adminService, AdminStats, GrowthResponse } from "@/services/admin.service";
import { tournamentService, type Tournament } from "@/services/tournament.service";
import {
  Users,
  Gamepad2,
  CalendarDays,
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  Trophy,
  ArrowRight,
} from "lucide-react";

// ── helpers ───────────────────────────────────────────────────────────────────
function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en", { month: "short", day: "numeric" });
}

function trend(points: { newUsers: number; games: number }[], field: "newUsers" | "games") {
  const half = Math.floor(points.length / 2);
  const pick = (p: { newUsers: number; games: number }) =>
    field === "newUsers" ? p.newUsers : p.games;
  const recent = points.slice(-half).reduce((s, p) => s + pick(p), 0);
  const prior = points.slice(0, half).reduce((s, p) => s + pick(p), 0);
  if (prior === 0) return null;
  return Math.round(((recent - prior) / prior) * 100);
}

// ── sub-components ────────────────────────────────────────────────────────────
interface KpiCardProps {
  label: string;
  value: number | string;
  icon: React.ElementType;
  delta?: number | null;
  accent?: string;
}

function KpiCard({ label, value, icon: Icon, delta, accent = "amber" }: KpiCardProps) {
  const DeltaIcon =
    delta == null ? Minus : delta > 0 ? TrendingUp : TrendingDown;
  const deltaColor =
    delta == null ? "text-gray-500" : delta > 0 ? "text-emerald-400" : "text-red-400";

  return (
    <div className="relative bg-gray-900 border border-gray-800 rounded-2xl p-6 overflow-hidden group hover:border-gray-700 transition-colors">
      {/* glow */}
      <div
        className={`absolute -top-6 -right-6 w-24 h-24 rounded-full blur-2xl opacity-20 bg-${accent}-400 group-hover:opacity-30 transition-opacity`}
      />
      <div className="flex items-start justify-between mb-4">
        <div className={`p-2.5 rounded-xl bg-${accent}-400/10 border border-${accent}-400/20`}>
          <Icon className={`w-5 h-5 text-${accent}-400`} />
        </div>
        {delta != null && (
          <span className={`flex items-center gap-1 text-xs font-medium ${deltaColor}`}>
            <DeltaIcon className="w-3.5 h-3.5" />
            {Math.abs(delta)}%
          </span>
        )}
      </div>
      <p className="text-3xl font-bold text-white tracking-tight">{value}</p>
      <p className="text-sm text-gray-500 mt-1">{label}</p>
    </div>
  );
}

// ── Custom tooltip ────────────────────────────────────────────────────────────
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
    <div className="bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 shadow-xl text-xs">
      <p className="text-gray-400 mb-2 font-medium">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }} className="font-semibold">
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
const RANGE_OPTIONS = [
  { label: "7d", value: 7 },
  { label: "14d", value: 14 },
  { label: "30d", value: 30 },
];

const PIE_COLORS = ["#34d399", "#f87171"];

export default function AdminDashboard() {
  const { locale } = useParams<{ locale: string }>();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [growth, setGrowth] = useState<GrowthResponse | null>(null);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [s, g, t] = await Promise.all([
        adminService.getStats(),
        adminService.getGrowth(days),
        tournamentService.list(),
      ]);
      setStats(s);
      setGrowth(g);
      setTournaments(t);
      setLastUpdated(new Date());
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const chartData = growth?.points.map((p) => ({
    ...p,
    date: fmtDate(p.date),
  })) ?? [];

  const pieData = growth
    ? [
        { name: "Verified", value: growth.breakdown.totalVerified },
        { name: "Banned", value: growth.breakdown.totalBanned },
      ]
    : [];

  const userTrend = growth ? trend(growth.points, "newUsers") : null;
  const gameTrend = growth ? trend(growth.points, "games") : null;

  const totalNewUsers = growth?.points.reduce((s, p) => s + p.newUsers, 0) ?? 0;
  const totalGames = growth?.points.reduce((s, p) => s + p.games, 0) ?? 0;
  const activeTournaments = tournaments.filter((t) => t.status === "ACTIVE").length;
  const registrationTournaments = tournaments.filter((t) => t.status === "REGISTRATION").length;
  const draftTournaments = tournaments.filter((t) => t.status === "DRAFT").length;
  const latestTournament = [...tournaments].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )[0];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          {lastUpdated && (
            <p className="text-xs text-gray-500 mt-0.5">
              Updated {lastUpdated.toLocaleTimeString()}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {/* Range selector */}
          <div className="flex rounded-lg border border-gray-800 overflow-hidden text-xs">
            {RANGE_OPTIONS.map((o) => (
              <button
                key={o.value}
                onClick={() => setDays(o.value)}
                className={`px-3 py-1.5 font-medium transition-colors ${
                  days === o.value
                    ? "bg-amber-400 text-gray-900"
                    : "text-gray-400 hover:bg-gray-800 hover:text-white"
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
          <button
            onClick={fetchAll}
            disabled={loading}
            className="p-2 rounded-lg border border-gray-800 text-gray-400 hover:border-gray-600 hover:text-white disabled:opacity-40 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Total Users"
          value={stats?.totalUsers ?? "—"}
          icon={Users}
          accent="amber"
        />
        <KpiCard
          label="Active Games"
          value={stats?.activeGames ?? "—"}
          icon={Gamepad2}
          accent="sky"
        />
        <KpiCard
          label={`New Users (${days}d)`}
          value={totalNewUsers}
          icon={TrendingUp}
          delta={userTrend}
          accent="emerald"
        />
        <KpiCard
          label={`Games (${days}d)`}
          value={totalGames}
          icon={CalendarDays}
          delta={gameTrend}
          accent="violet"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.4fr_1fr] gap-6">
        <section className="rounded-2xl border border-gray-800 bg-gray-900 p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-white">Tournament Management</p>
              <p className="mt-1 text-sm text-gray-400">
                Create tournaments, monitor brackets, and jump straight into the control room.
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
            {latestTournament && (
              <Link
                href={`/${locale}/admin/tournaments/${latestTournament.id}#edit-tournament`}
                className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-200 transition hover:border-emerald-400/50 hover:text-white"
              >
                Edit latest tournament
                <ArrowRight className="h-4 w-4" />
              </Link>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-gray-800 bg-gray-900 p-6">
          <p className="text-sm font-semibold text-white">Tournament Snapshot</p>
          <div className="mt-5 space-y-3">
            <div className="flex items-center justify-between rounded-xl border border-gray-800 bg-black/20 px-4 py-3">
              <span className="text-sm text-gray-400">Draft tournaments</span>
              <span className="text-sm font-semibold text-white">{draftTournaments}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-gray-800 bg-black/20 px-4 py-3">
              <span className="text-sm text-gray-400">Newest tournament</span>
              <span className="max-w-[12rem] truncate text-sm font-semibold text-white">
                {latestTournament?.name ?? "None yet"}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-gray-800 bg-black/20 px-4 py-3">
              <span className="text-sm text-gray-400">Latest status</span>
              <span className="text-sm font-semibold text-white">
                {latestTournament?.status ?? "N/A"}
              </span>
            </div>
          </div>
        </section>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* User growth — area chart */}
        <div className="xl:col-span-2 bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <p className="text-sm font-semibold text-white mb-5">User Registrations</p>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gradUsers" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
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
              <Area
                type="monotone"
                dataKey="newUsers"
                name="New Users"
                stroke="#f59e0b"
                strokeWidth={2}
                fill="url(#gradUsers)"
                dot={false}
                activeDot={{ r: 4, fill: "#f59e0b" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* User breakdown — pie */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 flex flex-col">
          <p className="text-sm font-semibold text-white mb-5">User Breakdown</p>
          <div className="flex-1 flex items-center justify-center">
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={52}
                  outerRadius={78}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "#111827",
                    border: "1px solid #374151",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: 12, color: "#9ca3af" }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Games activity — bar chart */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
        <p className="text-sm font-semibold text-white mb-5">Games Activity</p>
        <ResponsiveContainer width="100%" height={200}>
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
            <Bar
              dataKey="games"
              name="Games"
              fill="#818cf8"
              radius={[4, 4, 0, 0]}
              maxBarSize={32}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
