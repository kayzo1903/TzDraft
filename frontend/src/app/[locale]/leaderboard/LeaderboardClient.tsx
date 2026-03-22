'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { Link } from '@/i18n/routing';
import { useAuth } from '@/hooks/useAuth';
import { historyService, LeaderboardEntry } from '@/services/history.service';
import { COUNTRIES } from '@tzdraft/shared-client';
import {
  ChevronLeft,
  ChevronRight,
  Globe,
  Loader2,
  MapPin,
  Medal,
  Sparkles,
  Swords,
  Trophy,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

const PAGE_SIZE = 50;

type Scope = 'global' | 'country' | 'region';

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
}

function rankLabel(rank: number) {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return `#${rank}`;
}

function PodiumCard({
  entry,
  tone,
  userId,
}: {
  entry: LeaderboardEntry;
  tone: 'gold' | 'silver' | 'bronze';
  userId?: string;
}) {
  const palette = {
    gold: 'border-amber-400/30 bg-amber-400/10 text-amber-100',
    silver: 'border-slate-300/20 bg-slate-300/10 text-slate-100',
    bronze: 'border-orange-400/25 bg-orange-400/10 text-orange-100',
  } as const;
  const countryName = COUNTRIES.find((c) => c.code === entry.country)?.name ?? entry.country;
  const isMe = userId === entry.userId;

  return (
    <div className={clsx('rounded-[1.75rem] border p-5 shadow-xl', palette[tone], isMe && 'ring-1 ring-[var(--primary)]/50')}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.28em] opacity-80">Rank {entry.rank}</p>
          <h3 className="mt-3 text-xl font-black">{entry.displayName}</h3>
          <p className="mt-1 text-xs opacity-80">
            @{entry.username}
            {isMe && <span className="ml-2 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.2em]">You</span>}
          </p>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-black/20 text-sm font-black">
          {initials(entry.displayName)}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-2xl bg-black/15 px-3 py-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] opacity-70">Rating</p>
          <p className="mt-1 text-2xl font-black">{entry.rating}</p>
        </div>
        <div className="rounded-2xl bg-black/15 px-3 py-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] opacity-70">Games</p>
          <p className="mt-1 text-2xl font-black">{entry.gamesPlayed}</p>
        </div>
      </div>

      {countryName && (
        <p className="mt-4 inline-flex items-center gap-1.5 text-xs opacity-80">
          <MapPin className="h-3.5 w-3.5" />
          {countryName}
          {entry.region ? `, ${entry.region}` : ''}
        </p>
      )}
    </div>
  );
}

export default function LeaderboardClient({
  initialEntries,
  initialTotal,
}: {
  initialEntries: LeaderboardEntry[];
  initialTotal: number;
}) {
  const { user } = useAuth();
  const [scope, setScope] = useState<Scope>('global');
  const [entries, setEntries] = useState<LeaderboardEntry[]>(initialEntries);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  const userCountry = user?.country ?? null;
  const userRegion = user?.region ?? null;
  const userCountryName = COUNTRIES.find((c) => c.code === userCountry)?.name ?? userCountry;

  const load = useCallback(
    async (pageNum: number, currentScope: Scope) => {
      setLoading(true);
      setError(null);
      try {
        const filters: { skip: number; take: number; country?: string; region?: string } = {
          skip: pageNum * PAGE_SIZE,
          take: PAGE_SIZE,
        };

        if (currentScope === 'country' && userCountry) {
          filters.country = userCountry;
        }

        if (currentScope === 'region' && userCountry && userRegion) {
          filters.country = userCountry;
          filters.region = userRegion;
        }

        const data = await historyService.getLeaderboard(filters);
        setEntries(data.items);
        setTotal(data.total);
        setPage(pageNum);
      } catch {
        setError('Failed to load leaderboard');
      } finally {
        setLoading(false);
      }
    },
    [userCountry, userRegion],
  );

  useEffect(() => {
    if (!initialized) {
      setInitialized(true);
      return;
    }
    void load(0, scope);
  }, [initialized, load, scope]);

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const topThree = useMemo(() => entries.slice(0, 3), [entries]);
  const leader = topThree[0] ?? null;

  const scopeTabs: { key: Scope; label: string; disabled?: boolean }[] = [
    { key: 'global', label: 'Global' },
    { key: 'country', label: userCountryName ? `Country (${userCountryName})` : 'Country', disabled: !userCountry },
    { key: 'region', label: userRegion ? `Region (${userRegion})` : 'Region', disabled: !userRegion },
  ];

  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-12 text-[var(--foreground)] md:px-8">
      <div className="mx-auto max-w-5xl space-y-8">
        <header className="overflow-hidden rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.18),transparent_32%),radial-gradient(circle_at_top_right,rgba(255,255,255,0.07),transparent_28%),rgba(20,20,20,0.72)] p-6 shadow-2xl">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.24em] text-amber-200">
                <Sparkles className="h-3.5 w-3.5" />
                Verified Players Only
              </div>
              <div className="flex items-center gap-3">
                <Trophy className="h-8 w-8 text-amber-400" />
                <div>
                  <h1 className="text-3xl font-black tracking-tight text-neutral-100">Leaderboard</h1>
                  <p className="mt-1 text-sm text-neutral-400">
                    Track the strongest verified TzDraft players by rating and recent grind.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-neutral-500">Players</p>
                <p className="mt-2 text-2xl font-black text-white">{total}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-neutral-500">Scope</p>
                <p className="mt-2 text-lg font-black text-white">
                  {scope === 'global' ? 'Global' : scope === 'country' ? 'Country' : 'Region'}
                </p>
              </div>
              <div className="hidden rounded-2xl border border-white/10 bg-black/20 px-4 py-3 sm:block">
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-neutral-500">Top Rating</p>
                <p className="mt-2 text-2xl font-black text-white">{leader?.rating ?? '--'}</p>
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {scopeTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => !tab.disabled && setScope(tab.key)}
                disabled={tab.disabled}
                className={clsx(
                  'rounded-xl border px-4 py-2 text-sm font-semibold transition-colors',
                  scope === tab.key
                    ? 'border-[var(--primary)]/50 bg-[var(--primary)]/20 text-amber-300'
                    : 'border-white/10 bg-white/5 text-neutral-400 hover:bg-white/10 hover:text-white',
                  tab.disabled && 'cursor-not-allowed opacity-40 hover:bg-white/5 hover:text-neutral-400',
                )}
              >
                {tab.key === 'global' && <Globe className="mr-1.5 inline h-3.5 w-3.5 -mt-0.5" />}
                {tab.key === 'country' && <Medal className="mr-1.5 inline h-3.5 w-3.5 -mt-0.5" />}
                {tab.key === 'region' && <Trophy className="mr-1.5 inline h-3.5 w-3.5 -mt-0.5" />}
                {tab.label}
              </button>
            ))}
          </div>
        </header>

        {topThree.length > 0 && !loading && (
          <section className="grid gap-4 lg:grid-cols-3">
            {topThree[0] && <PodiumCard entry={topThree[0]} tone="gold" userId={user?.id} />}
            {topThree[1] && <PodiumCard entry={topThree[1]} tone="silver" userId={user?.id} />}
            {topThree[2] && <PodiumCard entry={topThree[2]} tone="bronze" userId={user?.id} />}
          </section>
        )}

        <section className="overflow-hidden rounded-[2rem] border border-neutral-800 bg-neutral-900/40 shadow-2xl">
          <div className="grid grid-cols-[4rem_1fr_auto_auto] gap-4 border-b border-neutral-800 bg-black/15 px-5 py-3 text-xs font-bold uppercase tracking-[0.2em] text-neutral-500">
            <span>Rank</span>
            <span>Player</span>
            <span className="text-right">Games</span>
            <span className="pr-1 text-right">Rating</span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-neutral-500" />
            </div>
          ) : error ? (
            <div className="py-12 text-center text-sm text-red-400">{error}</div>
          ) : entries.length === 0 ? (
            <div className="py-12 text-center text-sm text-neutral-500">
              No verified players found for this view yet.
            </div>
          ) : (
            <>
              <div className="divide-y divide-neutral-800/60">
                {entries.map((entry) => {
                  const isMe = user?.id === entry.userId;
                  const countryName = COUNTRIES.find((c) => c.code === entry.country)?.name ?? entry.country;

                  return (
                    <div
                      key={entry.userId}
                      className={clsx(
                        'grid grid-cols-[4rem_1fr_auto_auto] gap-4 px-5 py-4 items-center transition-colors',
                        isMe ? 'border-l-2 border-[var(--primary)] bg-[var(--primary)]/10' : 'hover:bg-white/[0.03]',
                      )}
                    >
                      <div className="flex items-center justify-center text-sm font-black text-neutral-300">
                        {rankLabel(entry.rank)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-neutral-700 text-xs font-black text-white">
                            {initials(entry.displayName)}
                          </div>
                          <div className="min-w-0">
                            <p className={clsx('truncate text-sm font-semibold', isMe ? 'text-amber-300' : 'text-neutral-100')}>
                              {entry.displayName}
                              {isMe && <span className="ml-2 text-xs font-normal text-neutral-500">(you)</span>}
                            </p>
                            <p className="truncate text-xs text-neutral-500">
                              @{entry.username}
                              {countryName && (
                                <span className="ml-1.5 text-neutral-600">
                                  · {countryName}
                                  {entry.region ? `, ${entry.region}` : ''}
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="text-right text-sm text-neutral-400">{entry.gamesPlayed}</div>
                      <div className="min-w-[3.5rem] text-right text-sm font-black text-neutral-100">{entry.rating}</div>
                    </div>
                  );
                })}
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-neutral-800 px-5 py-4">
                  <span className="text-xs text-neutral-500">
                    {page * PAGE_SIZE + 1}-{Math.min((page + 1) * PAGE_SIZE, total)} of {total}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => void load(page - 1, scope)}
                      disabled={page === 0}
                      className="gap-1"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Prev
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => void load(page + 1, scope)}
                      disabled={page >= totalPages - 1}
                      className="gap-1"
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </section>

        {!user && (
          <div className="space-y-4 rounded-[2rem] border border-neutral-800 bg-[linear-gradient(135deg,rgba(251,191,36,0.08),rgba(255,255,255,0.03))] p-6 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-400/20 bg-amber-400/10">
              <Swords className="h-6 w-6 text-amber-300" />
            </div>
            <p className="text-sm text-neutral-300">
              Sign in, play ranked games, and earn a verified place on the ladder.
            </p>
            <div className="flex justify-center gap-3">
              <Link href="/auth/login">
                <Button variant="secondary" size="sm">Log In</Button>
              </Link>
              <Link href="/play">
                <Button size="sm">Play Now</Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
