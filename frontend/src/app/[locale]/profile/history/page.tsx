'use client';

import React, { useState } from 'react';
import { Link } from '@/i18n/routing';
import { Button } from '@/components/ui/Button';
import { useGameHistory, usePlayerStats } from '@/hooks/useGameHistory';
import { HistoryFilters } from '@/services/history.service';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Trophy,
  Minus,
  X as XIcon,
} from 'lucide-react';

function ResultBadge({ result }: { result: 'WIN' | 'LOSS' | 'DRAW' }) {
  const styles = {
    WIN: 'bg-green-500/15 text-green-300 border-green-500/30',
    LOSS: 'bg-red-500/15 text-red-300 border-red-500/30',
    DRAW: 'bg-neutral-500/15 text-neutral-300 border-neutral-500/30',
  };
  const icons = {
    WIN: <Trophy className="h-3 w-3" />,
    LOSS: <XIcon className="h-3 w-3" />,
    DRAW: <Minus className="h-3 w-3" />,
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold border ${styles[result]}`}>
      {icons[result]}
      {result}
    </span>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-4 text-center">
      <div className="text-xs uppercase tracking-[0.3em] text-neutral-500">{label}</div>
      <div className="mt-1 text-3xl font-black text-neutral-100">{value}</div>
      {sub && <div className="text-xs text-neutral-500 mt-0.5">{sub}</div>}
    </div>
  );
}

function formatDuration(ms: number | null): string {
  if (!ms) return '—';
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}m`;
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

const RESULT_OPTIONS = ['ALL', 'WIN', 'LOSS', 'DRAW'] as const;
const TYPE_OPTIONS = ['ALL', 'AI', 'RANKED', 'CASUAL'] as const;

export default function GameHistoryPage() {
  const [filters, setFilters] = useState<HistoryFilters>({});
  const { items, total, page, totalPages, loading, error, goToPage } =
    useGameHistory(filters);
  const { stats, loading: statsLoading } = usePlayerStats();

  const handleResultFilter = (r: typeof RESULT_OPTIONS[number]) => {
    setFilters((f) => ({ ...f, result: r === 'ALL' ? undefined : r }));
  };

  const handleTypeFilter = (t: typeof TYPE_OPTIONS[number]) => {
    setFilters((f) => ({ ...f, gameType: t === 'ALL' ? undefined : t }));
  };

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)] px-4 md:px-8 py-12">
      <div className="max-w-5xl mx-auto space-y-8">

        {/* Back + Title */}
        <div className="flex items-center gap-4">
          <Link href="/profile">
            <Button variant="secondary" size="sm" className="gap-1.5">
              <ArrowLeft className="h-4 w-4" />
              Profile
            </Button>
          </Link>
          <h1 className="text-3xl font-black text-neutral-100">Game History</h1>
        </div>

        {/* Stats Row */}
        {statsLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-neutral-500" />
          </div>
        ) : stats ? (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <StatCard label="Total" value={stats.total} />
            <StatCard label="Win Rate" value={`${stats.winRate}%`} />
            <StatCard label="Wins" value={stats.wins} />
            <StatCard label="Losses" value={stats.losses} />
            <StatCard label="Draws" value={stats.draws} />
          </div>
        ) : null}

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-[0.3em] text-neutral-500">Result:</span>
            {RESULT_OPTIONS.map((r) => {
              const active = (filters.result ?? 'ALL') === r || (!filters.result && r === 'ALL');
              return (
                <button
                  key={r}
                  onClick={() => handleResultFilter(r)}
                  className={`rounded-lg px-3 py-1 text-xs font-semibold border transition-colors ${
                    active
                      ? 'bg-[#81b64c]/20 border-[#81b64c]/50 text-[#81b64c]'
                      : 'border-neutral-700 text-neutral-400 hover:border-neutral-500'
                  }`}
                >
                  {r}
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-[0.3em] text-neutral-500">Type:</span>
            {TYPE_OPTIONS.map((t) => {
              const active = (filters.gameType ?? 'ALL') === t || (!filters.gameType && t === 'ALL');
              return (
                <button
                  key={t}
                  onClick={() => handleTypeFilter(t)}
                  className={`rounded-lg px-3 py-1 text-xs font-semibold border transition-colors ${
                    active
                      ? 'bg-[#81b64c]/20 border-[#81b64c]/50 text-[#81b64c]'
                      : 'border-neutral-700 text-neutral-400 hover:border-neutral-500'
                  }`}
                >
                  {t}
                </button>
              );
            })}
          </div>
        </div>

        {/* Games Table */}
        <section className="rounded-2xl border border-neutral-800 bg-neutral-900/40 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-neutral-500" />
            </div>
          ) : error ? (
            <div className="py-12 text-center text-red-400">{error}</div>
          ) : items.length === 0 ? (
            <div className="py-12 text-center text-neutral-500">No games found</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-800 text-xs uppercase tracking-[0.3em] text-neutral-500">
                  <th className="px-4 py-3 text-left">Result</th>
                  <th className="px-4 py-3 text-left">Opponent</th>
                  <th className="px-4 py-3 text-left hidden sm:table-cell">Type</th>
                  <th className="px-4 py-3 text-left hidden md:table-cell">Moves</th>
                  <th className="px-4 py-3 text-left hidden md:table-cell">Duration</th>
                  <th className="px-4 py-3 text-left hidden lg:table-cell">Date</th>
                  <th className="px-4 py-3 text-right">Review</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => (
                  <tr
                    key={item.id}
                    className={`border-b border-neutral-800/50 hover:bg-neutral-800/20 transition-colors ${
                      i % 2 === 0 ? '' : 'bg-neutral-900/20'
                    }`}
                  >
                    <td className="px-4 py-3">
                      <ResultBadge result={item.result} />
                    </td>
                    <td className="px-4 py-3 text-neutral-200">
                      {item.opponent ? (
                        <span>
                          {item.opponent.displayName}
                          {item.opponent.elo && (
                            <span className="ml-1 text-neutral-500">({item.opponent.elo})</span>
                          )}
                        </span>
                      ) : (
                        <span className="text-neutral-500">AI</span>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className="rounded-md bg-neutral-800 px-2 py-0.5 text-xs text-neutral-400">
                        {item.gameType}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-neutral-400">
                      {item.moveCount}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-neutral-400">
                      {formatDuration(item.durationMs)}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-neutral-500">
                      {formatDate(item.playedAt)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/game/${item.id}/review`}>
                        <Button variant="outline" size="sm" className="text-xs">
                          Review
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-neutral-500">
              {total} game{total !== 1 ? 's' : ''} total
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => goToPage(page - 1)}
                disabled={page === 0 || loading}
                className="gap-1"
              >
                <ChevronLeft className="h-4 w-4" />
                Prev
              </Button>
              <span className="text-sm text-neutral-400">
                {page + 1} / {totalPages}
              </span>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => goToPage(page + 1)}
                disabled={page >= totalPages - 1 || loading}
                className="gap-1"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
