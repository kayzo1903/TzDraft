'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Link } from '@/i18n/routing';
import { useAuth } from '@/hooks/useAuth';
import { historyService, LeaderboardEntry } from '@/services/history.service';
import { COUNTRIES } from '@tzdraft/shared-client';
import { Trophy, Medal, Globe, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import clsx from 'clsx';

const PAGE_SIZE = 50;

type Scope = 'global' | 'country' | 'region';

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <span className="text-lg">🥇</span>;
  if (rank === 2) return <span className="text-lg">🥈</span>;
  if (rank === 3) return <span className="text-lg">🥉</span>;
  return <span className="text-sm font-black text-neutral-400">#{rank}</span>;
}

export default function LeaderboardPage() {
  const { user } = useAuth();
  const [scope, setScope] = useState<Scope>('global');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        if (currentScope === 'country' && userCountry) filters.country = userCountry;
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
    load(0, scope);
  }, [scope, load]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const handleScope = (s: Scope) => {
    setScope(s);
    setPage(0);
  };

  const scopeTabs: { key: Scope; label: string; disabled?: boolean }[] = [
    { key: 'global', label: 'Global' },
    { key: 'country', label: userCountryName ? `Country (${userCountryName})` : 'Country', disabled: !userCountry },
    { key: 'region', label: userRegion ? `Region (${userRegion})` : 'Region', disabled: !userRegion },
  ];

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)] px-4 md:px-8 py-12">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <header className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-6 shadow-2xl">
          <div className="flex items-center gap-3">
            <Trophy className="h-8 w-8 text-amber-400" />
            <div>
              <h1 className="text-3xl font-black text-neutral-100 tracking-tight">Leaderboard</h1>
              <p className="text-neutral-400 text-sm mt-0.5">Top ranked TzDraft players</p>
            </div>
          </div>

          {/* Scope tabs */}
          <div className="mt-5 flex gap-2 flex-wrap">
            {scopeTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => !tab.disabled && handleScope(tab.key)}
                disabled={tab.disabled}
                className={clsx(
                  'px-4 py-2 rounded-xl text-sm font-semibold transition-colors border',
                  scope === tab.key
                    ? 'bg-[var(--primary)]/20 border-[var(--primary)]/50 text-amber-300'
                    : 'bg-white/5 border-white/10 text-neutral-400 hover:text-white hover:bg-white/10',
                  tab.disabled && 'opacity-40 cursor-not-allowed hover:bg-white/5 hover:text-neutral-400',
                )}
              >
                {tab.key === 'global' && <Globe className="inline h-3.5 w-3.5 mr-1.5 -mt-0.5" />}
                {tab.key === 'country' && <Medal className="inline h-3.5 w-3.5 mr-1.5 -mt-0.5" />}
                {tab.key === 'region' && <Trophy className="inline h-3.5 w-3.5 mr-1.5 -mt-0.5" />}
                {tab.label}
              </button>
            ))}
          </div>
        </header>

        {/* Table */}
        <section className="rounded-2xl border border-neutral-800 bg-neutral-900/40 shadow-2xl overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-neutral-500" />
            </div>
          ) : error ? (
            <div className="py-12 text-center text-sm text-red-400">{error}</div>
          ) : entries.length === 0 ? (
            <div className="py-12 text-center text-sm text-neutral-500">
              No players found. Play a ranked game to appear here.
            </div>
          ) : (
            <>
              {/* Header row */}
              <div className="grid grid-cols-[4rem_1fr_auto_auto] gap-4 px-5 py-3 border-b border-neutral-800 text-xs font-bold uppercase tracking-[0.2em] text-neutral-500">
                <span>Rank</span>
                <span>Player</span>
                <span className="text-right">Games</span>
                <span className="text-right pr-1">Rating</span>
              </div>

              {/* Rows */}
              <div className="divide-y divide-neutral-800/60">
                {entries.map((entry) => {
                  const isMe = user?.id === entry.userId;
                  const countryName = COUNTRIES.find((c) => c.code === entry.country)?.name ?? entry.country;

                  return (
                    <div
                      key={entry.userId}
                      className={clsx(
                        'grid grid-cols-[4rem_1fr_auto_auto] gap-4 px-5 py-4 items-center transition-colors',
                        isMe ? 'bg-[var(--primary)]/10 border-l-2 border-[var(--primary)]' : 'hover:bg-white/[0.03]',
                      )}
                    >
                      {/* Rank */}
                      <div className="flex items-center justify-center">
                        <RankBadge rank={entry.rank} />
                      </div>

                      {/* Player */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 shrink-0 rounded-full bg-neutral-700 flex items-center justify-center text-xs font-black text-white">
                            {entry.displayName.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className={clsx('text-sm font-semibold truncate', isMe ? 'text-amber-300' : 'text-neutral-100')}>
                              {entry.displayName}
                              {isMe && <span className="ml-2 text-xs font-normal text-neutral-500">(you)</span>}
                            </p>
                            <p className="text-xs text-neutral-500 truncate">
                              @{entry.username}
                              {countryName && <span className="ml-1.5 text-neutral-600">· {countryName}{entry.region ? `, ${entry.region}` : ''}</span>}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Games */}
                      <div className="text-sm text-neutral-400 text-right">{entry.gamesPlayed}</div>

                      {/* Rating */}
                      <div className="text-sm font-black text-neutral-100 text-right min-w-[3.5rem]">
                        {entry.rating}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-5 py-4 border-t border-neutral-800">
                  <span className="text-xs text-neutral-500">
                    {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => load(page - 1, scope)}
                      disabled={page === 0}
                      className="gap-1"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Prev
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => load(page + 1, scope)}
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

        {/* CTA for unranked players */}
        {!user && (
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-6 text-center space-y-3">
            <p className="text-neutral-400 text-sm">Sign in and play ranked games to appear on the leaderboard.</p>
            <div className="flex gap-3 justify-center">
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
