'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { Link } from '@/i18n/routing';
import { useAuth } from '@/hooks/useAuth';
import { historyService, LeaderboardEntry } from '@/services/history.service';
import { COUNTRIES } from '@tzdraft/shared-client';
import {
  ChevronDown,
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
import { useTranslations } from 'next-intl';

const PAGE_SIZE = 50;

type Scope = 'global' | 'country' | 'region';

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
}

function rankLabel(rank: number) {
  return `#${rank}`;
}

function winRate(entry: LeaderboardEntry): string {
  if (!entry.gamesPlayed) return '—';
  const wins = (entry as { wins?: number }).wins ?? 0;
  return `${Math.round((wins / entry.gamesPlayed) * 100)}%`;
}


/* ── Custom region dropdown ──────────────────────────────────────────────── */

function RegionDropdown({
  value,
  options,
  placeholder,
  onChange,
}: {
  value: string;
  options: string[];
  placeholder: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const selected = value || null;

  return (
    <div ref={ref} className="relative mt-3 w-full sm:w-72">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={clsx(
          'flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition-all',
          open
            ? 'border-[var(--primary)]/50 bg-[var(--primary)]/10 text-white'
            : 'border-white/10 bg-black/30 text-neutral-300 hover:border-white/20 hover:bg-black/40',
        )}
      >
        <MapPin className="h-4 w-4 shrink-0 text-neutral-500" />
        <span className="flex-1 truncate">
          {selected ?? <span className="text-neutral-500">{placeholder}</span>}
        </span>
        <ChevronDown
          className={clsx('h-4 w-4 shrink-0 text-neutral-500 transition-transform duration-200', open && 'rotate-180')}
        />
      </button>

      {/* Panel */}
      {open && (
        <div className="absolute bottom-full left-0 z-30 mb-2 w-full overflow-hidden rounded-2xl border border-white/10 bg-neutral-950 shadow-2xl shadow-black/60">
          {/* "All regions" option */}
          <button
            type="button"
            onClick={() => { onChange(''); setOpen(false); }}
            className={clsx(
              'flex w-full items-center gap-3 border-b border-white/5 px-4 py-3 text-left text-sm transition-colors',
              !selected
                ? 'bg-[var(--primary)]/10 font-semibold text-amber-300'
                : 'text-neutral-400 hover:bg-white/5 hover:text-white',
            )}
          >
            <Globe className="h-4 w-4 shrink-0" />
            {placeholder}
          </button>

          {/* Region list */}
          <div className="max-h-56 overflow-y-auto">
            {options.length === 0 ? (
              <p className="px-4 py-3 text-sm text-neutral-600">No regions available</p>
            ) : (
              options.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => { onChange(r); setOpen(false); }}
                  className={clsx(
                    'flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors',
                    r === selected
                      ? 'bg-[var(--primary)]/10 font-semibold text-amber-300'
                      : 'text-neutral-300 hover:bg-white/5 hover:text-white',
                  )}
                >
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-neutral-600" />
                  {r}
                  {r === selected && (
                    <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[var(--primary)]" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Main component ──────────────────────────────────────────────────────── */

export default function LeaderboardClient({
  initialEntries,
  initialTotal,
}: {
  initialEntries: LeaderboardEntry[];
  initialTotal: number;
}) {
  const t = useTranslations('leaderboard');
  const { user } = useAuth();
  const [scope, setScope] = useState<Scope>('global');
  const [entries, setEntries] = useState<LeaderboardEntry[]>(initialEntries);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState<string>('');
  const [availableRegions, setAvailableRegions] = useState<string[]>(() =>
    [...new Set(initialEntries.map((e) => e.region).filter(Boolean) as string[])].sort(),
  );

  const userCountry = user?.country ?? null;
  const userCountryName = COUNTRIES.find((c) => c.code === userCountry)?.name ?? userCountry;

  const load = useCallback(
    async (pageNum: number, currentScope: Scope, region = selectedRegion) => {
      setLoading(true);
      setError(null);
      try {
        const filters: { skip: number; take: number; country?: string; region?: string } = {
          skip: pageNum * PAGE_SIZE,
          take: PAGE_SIZE,
        };
        if (currentScope === 'country' && userCountry) filters.country = userCountry;
        if (currentScope === 'region' && region) {
          filters.region = region;
          if (userCountry) filters.country = userCountry;
        }
        const data = await historyService.getLeaderboard(filters);
        setEntries(data.items);
        setTotal(data.total);
        setPage(pageNum);
        // Merge any new regions we discover
        const newRegions = data.items.map((e) => e.region).filter(Boolean) as string[];
        setAvailableRegions((prev) => [...new Set([...prev, ...newRegions])].sort());
      } catch {
        setError(t('loadError'));
      } finally {
        setLoading(false);
      }
    },
    [userCountry, selectedRegion, t],
  );

  useEffect(() => {
    if (!initialized) { setInitialized(true); return; }
    void load(0, scope);
  }, [initialized, load, scope]);

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const leader = entries[0] ?? null;

  const countryTabLabel = userCountryName
    ? `${t('scopeCountry')} · ${userCountryName}`
    : t('scopeCountry');

  const scopeTabs: { key: Scope; label: string; short: string; disabled?: boolean }[] = [
    { key: 'global',  label: t('scopeGlobal'),  short: t('scopeGlobal') },
    { key: 'country', label: countryTabLabel,    short: t('scopeCountry'), disabled: !userCountry },
    { key: 'region',  label: t('scopeRegion'),   short: t('scopeRegion') },
  ];

  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-8 text-[var(--foreground)] sm:py-12 md:px-8">
      <div className="mx-auto max-w-5xl space-y-5 sm:space-y-8">

        {/* Header */}
        <header className="overflow-hidden rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.18),transparent_32%),radial-gradient(circle_at_top_right,rgba(255,255,255,0.07),transparent_28%),rgba(20,20,20,0.72)] p-5 shadow-2xl sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2.5 sm:space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.24em] text-amber-200">
                <Sparkles className="h-3.5 w-3.5" />
                {t('badge')}
              </div>
              <div className="flex items-center gap-3">
                <Trophy className="h-7 w-7 text-amber-400 sm:h-8 sm:w-8" />
                <div>
                  <h1 className="text-2xl font-black tracking-tight text-neutral-100 sm:text-3xl">{t('title')}</h1>
                  <p className="mt-0.5 text-sm text-neutral-400">{t('subtitle')}</p>
                </div>
              </div>
            </div>

            {/* Stats strip */}
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-2.5 sm:px-4 sm:py-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-neutral-500">{t('players')}</p>
                <p className="mt-1.5 text-xl font-black text-white sm:text-2xl">{total}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-2.5 sm:px-4 sm:py-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-neutral-500">{t('scope')}</p>
                <p className="mt-1.5 text-base font-black text-white sm:text-lg">
                  {scope === 'global' ? t('scopeGlobal') : scope === 'country' ? t('scopeCountry') : t('scopeRegion')}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-2.5 sm:px-4 sm:py-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-neutral-500">{t('topRating')}</p>
                <p className="mt-1.5 text-xl font-black text-white sm:text-2xl">{leader?.rating ?? '--'}</p>
              </div>
            </div>
          </div>

          {/* Scope tabs — short labels on mobile */}
          <div className="mt-4 flex gap-2 sm:mt-5">
            {scopeTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => !tab.disabled && setScope(tab.key)}
                disabled={tab.disabled}
                className={clsx(
                  'flex-1 rounded-xl border px-2 py-2 text-xs font-semibold transition-colors sm:flex-none sm:px-4 sm:text-sm',
                  scope === tab.key
                    ? 'border-[var(--primary)]/50 bg-[var(--primary)]/20 text-amber-300'
                    : 'border-white/10 bg-white/5 text-neutral-400 hover:bg-white/10 hover:text-white',
                  tab.disabled && 'cursor-not-allowed opacity-40',
                )}
              >
                {tab.key === 'global'  && <Globe  className="mr-1 inline h-3.5 w-3.5 -mt-0.5" />}
                {tab.key === 'country' && <Medal  className="mr-1 inline h-3.5 w-3.5 -mt-0.5" />}
                {tab.key === 'region'  && <MapPin className="mr-1 inline h-3.5 w-3.5 -mt-0.5" />}
                <span className="sm:hidden">{tab.short}</span>
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Region dropdown — custom, shown only when region scope is active */}
          {scope === 'region' && (
            <RegionDropdown
              value={selectedRegion}
              options={availableRegions}
              placeholder={`${t('scopeRegion')} — ${t('scopeGlobal')}`}
              onChange={(r) => {
                setSelectedRegion(r);
                void load(0, 'region', r);
              }}
            />
          )}
        </header>

        {/* Table */}
        <section className="overflow-hidden rounded-[2rem] border border-neutral-800 bg-neutral-900/40 shadow-2xl">
          {/* Table header */}
          <div className="grid grid-cols-[3rem_1fr_auto] gap-3 border-b border-neutral-800 bg-black/15 px-4 py-3 text-xs font-bold uppercase tracking-[0.2em] text-neutral-500 sm:grid-cols-[4rem_1fr_auto_auto_auto] sm:gap-4 sm:px-5">
            <span>{t('rank')}</span>
            <span>{t('player')}</span>
            <span className="text-right sm:hidden">{t('rating')}</span>
            <span className="hidden text-right sm:block">{t('games')}</span>
            <span className="hidden text-right sm:block">{t('winRate')}</span>
            <span className="hidden text-right sm:block">{t('rating')}</span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-neutral-500" />
            </div>
          ) : error ? (
            <div className="py-12 text-center text-sm text-red-400">{error}</div>
          ) : entries.length === 0 ? (
            <div className="py-12 text-center text-sm text-neutral-500">{t('noPlayers')}</div>
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
                        'grid grid-cols-[3rem_1fr_auto] items-center gap-3 px-4 py-3 transition-colors sm:grid-cols-[4rem_1fr_auto_auto_auto] sm:gap-4 sm:px-5 sm:py-4',
                        isMe ? 'border-l-2 border-[var(--primary)] bg-[var(--primary)]/10' : 'hover:bg-white/[0.03]',
                      )}
                    >
                      {/* Rank */}
                      <div className="text-left text-sm font-black text-neutral-300">
                        {rankLabel(entry.rank)}
                      </div>

                      {/* Player */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2.5 sm:gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-neutral-700 text-xs font-black text-white sm:h-9 sm:w-9 sm:rounded-2xl">
                            {initials(entry.displayName)}
                          </div>
                          <div className="min-w-0">
                            <p className={clsx('flex items-center gap-1.5 truncate text-sm font-semibold', isMe ? 'text-amber-300' : 'text-neutral-100')}>
                              <span className="truncate">{entry.displayName}</span>
                              {entry.rank <= 3 && (
                                <span className="shrink-0 text-base leading-none">
                                  {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : '🥉'}
                                </span>
                              )}
                              {isMe && <span className="ml-0.5 shrink-0 text-xs font-normal text-neutral-500">({t('you')})</span>}
                            </p>
                            {/* Country shown only on sm+ inline; on mobile shown as sub-line */}
                            <p className="truncate text-xs text-neutral-500">
                              @{entry.username}
                              {countryName && (
                                <span className="ml-1.5 hidden text-neutral-600 sm:inline">
                                  · {countryName}{entry.region ? `, ${entry.region}` : ''}
                                </span>
                              )}
                            </p>
                            {/* Mobile-only: games + country as compact sub-row */}
                            {countryName && (
                              <p className="mt-0.5 truncate text-[11px] text-neutral-600 sm:hidden">
                                {countryName}{entry.region ? `, ${entry.region}` : ''} · {entry.gamesPlayed}G · {winRate(entry)}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Mobile: just rating */}
                      <div className="text-right text-sm font-black text-neutral-100 sm:hidden">{entry.rating}</div>

                      {/* Tablet+: games, win rate, rating */}
                      <div className="hidden text-right text-sm text-neutral-400 sm:block">{entry.gamesPlayed}</div>
                      <div className="hidden text-right text-sm text-neutral-400 sm:block">{winRate(entry)}</div>
                      <div className="hidden min-w-[3.5rem] text-right text-sm font-black text-neutral-100 sm:block">{entry.rating}</div>
                    </div>
                  );
                })}
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-neutral-800 px-4 py-3 sm:px-5 sm:py-4">
                  <span className="text-xs text-neutral-500">
                    {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} / {total}
                  </span>
                  <div className="flex gap-2">
                    <Button variant="secondary" size="sm" onClick={() => void load(page - 1, scope)} disabled={page === 0} className="gap-1">
                      <ChevronLeft className="h-4 w-4" />
                      {t('prev')}
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => void load(page + 1, scope)} disabled={page >= totalPages - 1} className="gap-1">
                      {t('next')}
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </section>

        {/* Sign-in CTA */}
        {!user && (
          <div className="space-y-4 rounded-[2rem] border border-neutral-800 bg-[linear-gradient(135deg,rgba(251,191,36,0.08),rgba(255,255,255,0.03))] p-5 text-center sm:p-6">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-400/20 bg-amber-400/10">
              <Swords className="h-6 w-6 text-amber-300" />
            </div>
            <p className="text-sm text-neutral-300">{t('signInCta')}</p>
            <div className="flex justify-center gap-3">
              <Link href="/auth/login">
                <Button variant="secondary" size="sm">{t('logIn')}</Button>
              </Link>
              <Link href="/play">
                <Button size="sm">{t('playNow')}</Button>
              </Link>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}
