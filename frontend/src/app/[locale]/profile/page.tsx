'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/routing';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { usePlayerStats, usePlayerRank, useGameHistory } from '@/hooks/useGameHistory';
import { COUNTRIES, REGIONS_BY_COUNTRY, hasRegions } from '@tzdraft/shared-client';
import {
  Bot,
  BookOpen,
  History,
  Loader2,
  LifeBuoy,
  LogOut,
  Medal,
  Minus,
  Pencil,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Star,
  Swords,
  Trophy,
  User as UserIcon,
  X,
  X as XIcon,
} from 'lucide-react';

function FieldRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-neutral-800/70 py-3 last:border-b-0">
      <div className="text-sm font-medium text-neutral-400">{label}</div>
      <div className="text-sm text-neutral-100 text-right break-all">{value}</div>
    </div>
  );
}

function RankRow({
  label,
  rank,
  total,
}: {
  label: string;
  rank: number | null;
  total?: number;
}) {
  return (
    <div className="flex items-center justify-between py-3">
      <span className="text-sm font-medium text-neutral-400">{label}</span>
      <div className="flex items-center gap-2">
        {rank !== null ? (
          <>
            <span className="text-lg font-black text-neutral-100">#{rank}</span>
            {total !== undefined && (
              <span className="text-xs text-neutral-600">/ {total}</span>
            )}
          </>
        ) : (
          <span className="text-sm text-neutral-600">—</span>
        )}
      </div>
    </div>
  );
}

function SectionCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-6 shadow-2xl">
      <div className="flex items-center gap-2">
        {icon}
        <h2 className="text-xl font-black text-neutral-100 tracking-tight">
          {title}
        </h2>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default function ProfilePage() {
  const t = useTranslations('profile');
  const router = useRouter();
  const { user, logout, updateProfile } = useAuth();
  const { stats: playerStats } = usePlayerStats();
  const { rank: playerRank, loading: rankLoading } = usePlayerRank();
  const { items: recentGames, loading: recentLoading } = useGameHistory({}, 5);

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState('');
  const [editForm, setEditForm] = useState({
    displayName: '',
    email: '',
    country: 'TZ',
    region: '',
  });

  const hasVerifiedPhone = Boolean(
    user?.phoneNumber &&
    user.phoneNumber.startsWith('+255') &&
    user.isVerified,
  );

  const phoneDisplay =
    user?.phoneNumber && user.phoneNumber.startsWith('+255')
      ? user.phoneNumber
      : '—';

  const ratingValue = React.useMemo(() => {
    if (!user) return null;
    if (typeof user.rating === 'number') return user.rating;
    if (user.rating && typeof user.rating === 'object') return user.rating.rating;
    return null;
  }, [user]);

  const ratingStats = React.useMemo(() => {
    if (!user) return null;
    if (user.rating && typeof user.rating === 'object') return user.rating;
    return null;
  }, [user]);

  const countryName = React.useMemo(() => {
    if (!user?.country) return null;
    return COUNTRIES.find((c) => c.code === user.country)?.name ?? user.country;
  }, [user]);

  const handleStartEdit = () => {
    setEditForm({
      displayName: user?.displayName ?? '',
      email: user?.email ?? '',
      country: user?.country ?? 'TZ',
      region: user?.region ?? '',
    });
    setEditError('');
    setEditing(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setEditError('');
    try {
      // Strip empty strings — don't send fields the user left blank
      const payload: Record<string, string> = {};
      if (editForm.displayName) payload.displayName = editForm.displayName;
      if (editForm.email) payload.email = editForm.email;
      if (editForm.country) payload.country = editForm.country;
      if (editForm.region) payload.region = editForm.region;
      await updateProfile(payload);
      setEditing(false);
    } catch (err: any) {
      // AllExceptionsFilter wraps ValidationPipe errors:
      // err.response.data = { statusCode, message: { message: string[], error, statusCode } }
      // So .message may itself be an object — extract the actual string.
      const raw = err?.response?.data?.message;
      let msg: string;
      if (typeof raw === 'string') {
        msg = raw;
      } else if (raw && typeof raw === 'object') {
        const inner = raw.message;
        msg = Array.isArray(inner) ? inner.join(', ') : (typeof inner === 'string' ? inner : 'Failed to save changes');
      } else {
        msg = 'Failed to save changes';
      }
      setEditError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    await logout();
    router.push('/');
  };

  if (!user) {
    return (
      <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)] px-4 md:px-8 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-8 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-[var(--secondary)] flex items-center justify-center">
                <UserIcon className="h-6 w-6 text-neutral-200" />
              </div>
              <div>
                <h1 className="text-3xl font-black text-neutral-100">
                  {t('signedOut.title')}
                </h1>
                <p className="mt-1 text-neutral-400">{t('signedOut.subtitle')}</p>
              </div>
            </div>

            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Link href="/auth/login" className="w-full sm:w-auto">
                <Button size="lg" className="w-full sm:w-auto">
                  {t('signedOut.actions.login')}
                </Button>
              </Link>
              <Link href="/auth/signup" className="w-full sm:w-auto">
                <Button variant="secondary" size="lg" className="w-full sm:w-auto">
                  {t('signedOut.actions.signup')}
                </Button>
              </Link>
              <Link href="/play" className="w-full sm:w-auto">
                <Button variant="outline" size="lg" className="w-full sm:w-auto">
                  {t('signedOut.actions.play')}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)] px-4 md:px-8 py-12">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <header className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-6 shadow-2xl">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-full bg-[var(--primary)] flex items-center justify-center text-white font-black text-xl">
                {user.username.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-3xl font-black text-neutral-100 tracking-tight">
                    {user.displayName || user.username}
                  </h1>
                  <span
                    className={[
                      'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold border',
                      hasVerifiedPhone
                        ? 'bg-green-500/10 text-green-300 border-green-500/30'
                        : 'bg-amber-500/10 text-amber-300 border-amber-500/30',
                    ].join(' ')}
                  >
                    {hasVerifiedPhone ? (
                      <ShieldCheck className="h-4 w-4" />
                    ) : (
                      <ShieldAlert className="h-4 w-4" />
                    )}
                    {hasVerifiedPhone ? t('verified') : t('notVerified')}
                  </span>
                </div>
                <p className="mt-1 text-neutral-400">
                  @{user.username}
                  {ratingValue !== null && (
                    <>
                      <span className="mx-2 text-neutral-600">•</span>
                      {t('ratingInline', { rating: ratingValue })}
                    </>
                  )}
                  {countryName && (
                    <>
                      <span className="mx-2 text-neutral-600">•</span>
                      {countryName}
                      {user.region && <span className="text-neutral-500">, {user.region}</span>}
                    </>
                  )}
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={handleStartEdit}
                variant="secondary"
                className="w-full sm:w-auto gap-2"
              >
                <Pencil className="h-4 w-4" />
                Edit Profile
              </Button>
              <Link href="/settings" className="w-full sm:w-auto">
                <Button variant="secondary" className="w-full sm:w-auto gap-2">
                  <Settings className="h-4 w-4" />
                  {t('actions.settings')}
                </Button>
              </Link>
              <Button
                onClick={handleSignOut}
                variant="secondary"
                className="w-full sm:w-auto gap-2 text-red-300 hover:text-red-200"
              >
                <LogOut className="h-4 w-4" />
                {t('actions.signOut')}
              </Button>
            </div>
          </div>
        </header>

        {/* Edit Profile Panel */}
        {editing && (
          <section className="rounded-2xl border border-[#81b64c]/40 bg-neutral-900/60 p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-black text-neutral-100">Edit Profile</h2>
              <button
                onClick={() => setEditing(false)}
                className="text-neutral-500 hover:text-neutral-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {editError && (
              <div className="mb-4 rounded-xl bg-red-500/10 border border-red-500/40 p-3 text-sm text-red-400">
                {editError}
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs uppercase tracking-[0.4em] text-neutral-500">Display Name</label>
                <Input
                  value={editForm.displayName}
                  onChange={(e) => setEditForm({ ...editForm, displayName: e.target.value })}
                  className="bg-[#111] border-neutral-700 focus:border-[#81b64c]"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs uppercase tracking-[0.4em] text-neutral-500">Email</label>
                <Input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="bg-[#111] border-neutral-700 focus:border-[#81b64c]"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs uppercase tracking-[0.4em] text-neutral-500">Country</label>
                <select
                  value={editForm.country}
                  onChange={(e) =>
                    setEditForm({ ...editForm, country: e.target.value, region: '' })
                  }
                  className="w-full rounded-lg bg-[#111] border border-neutral-700 focus:border-[#81b64c] px-3 py-2 text-sm text-white"
                >
                  {COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              {hasRegions(editForm.country) && (
                <div className="space-y-1">
                  <label className="text-xs uppercase tracking-[0.4em] text-neutral-500">Region</label>
                  <select
                    value={editForm.region}
                    onChange={(e) => setEditForm({ ...editForm, region: e.target.value })}
                    className="w-full rounded-lg bg-[#111] border border-neutral-700 focus:border-[#81b64c] px-3 py-2 text-sm text-white"
                  >
                    <option value="">— None —</option>
                    {REGIONS_BY_COUNTRY[editForm.country].map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <div className="mt-5 flex gap-3">
              <Button onClick={handleSave} disabled={saving} className="gap-2">
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
              <Button variant="secondary" onClick={() => setEditing(false)}>
                Cancel
              </Button>
            </div>
          </section>
        )}

        {/* Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <SectionCard title={t('sections.account')} icon={<UserIcon className="h-5 w-5 text-neutral-300" />}>
              <div className="divide-y divide-neutral-800/70">
                <FieldRow label="Name" value={user.displayName || user.username} />
                <FieldRow label={t('fields.username')} value={user.username} />
                <FieldRow label="Country" value={countryName || '—'} />
                <FieldRow label="Region" value={user.region || '—'} />
              </div>
            </SectionCard>

            <SectionCard
              title={t('sections.performance')}
              icon={<Star className="h-5 w-5 text-neutral-300" />}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-xl border border-neutral-800 bg-neutral-950/40 p-4">
                  <div className="text-xs font-bold uppercase tracking-[0.2em] text-neutral-500">
                    {t('stats.rating')}
                  </div>
                  <div className="mt-2 text-3xl font-black text-neutral-100">
                    {ratingValue ?? '—'}
                  </div>
                </div>
                <div className="rounded-xl border border-neutral-800 bg-neutral-950/40 p-4">
                  <div className="text-xs font-bold uppercase tracking-[0.2em] text-neutral-500">
                    {t('stats.games')}
                  </div>
                  <div className="mt-2 text-3xl font-black text-neutral-100">
                    {playerStats?.total ?? ratingStats?.gamesPlayed ?? '—'}
                  </div>
                </div>
                <div className="rounded-xl border border-neutral-800 bg-neutral-950/40 p-4">
                  <div className="text-xs font-bold uppercase tracking-[0.2em] text-neutral-500">
                    {t('stats.wins')}
                  </div>
                  <div className="mt-2 text-3xl font-black text-neutral-100">
                    {playerStats?.wins ?? '—'}
                  </div>
                </div>
                <div className="rounded-xl border border-neutral-800 bg-neutral-950/40 p-4">
                  <div className="text-xs font-bold uppercase tracking-[0.2em] text-neutral-500">
                    {t('stats.losses')}
                  </div>
                  <div className="mt-2 text-3xl font-black text-neutral-100">
                    {playerStats?.losses ?? '—'}
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm text-neutral-500">
                  {t('stats.note')}
                </p>
                <Link href="/profile/history">
                  <Button variant="outline" size="sm" className="gap-2 text-xs">
                    <History className="h-3.5 w-3.5" />
                    View Game History
                  </Button>
                </Link>
              </div>
            </SectionCard>

            {/* Rankings */}
            <SectionCard
              title="Rankings"
              icon={<Medal className="h-5 w-5 text-neutral-300" />}
            >
              {rankLoading ? (
                <div className="py-4 text-center text-sm text-neutral-500">Loading ranks…</div>
              ) : playerRank ? (
                <div className="divide-y divide-neutral-800/70">
                  <RankRow
                    label="Global"
                    rank={playerRank.global}
                    total={playerRank.totalPlayers}
                  />
                  {playerRank.country !== null && user.country && (
                    <RankRow
                      label={`Country (${countryName ?? user.country})`}
                      rank={playerRank.country}
                    />
                  )}
                  {playerRank.region !== null && user.region && (
                    <RankRow
                      label={`Region (${user.region})`}
                      rank={playerRank.region}
                    />
                  )}
                </div>
              ) : (
                <p className="text-sm text-neutral-500">Play games to earn a rank.</p>
              )}
            </SectionCard>

            {/* Recent Games */}
            <SectionCard
              title="Recent Games"
              icon={<History className="h-5 w-5 text-neutral-300" />}
            >
              {recentLoading ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin text-neutral-500" />
                </div>
              ) : recentGames.length === 0 ? (
                <p className="text-sm text-neutral-500 py-2">No games played yet.</p>
              ) : (
                <>
                  <div className="divide-y divide-neutral-800/60">
                    {recentGames.map((game) => {
                      const resultStyles = {
                        WIN:  'bg-green-500/15 text-green-300 border-green-500/30',
                        LOSS: 'bg-red-500/15 text-red-300 border-red-500/30',
                        DRAW: 'bg-neutral-500/15 text-neutral-300 border-neutral-500/30',
                      };
                      const ResultIcon = game.result === 'WIN' ? Trophy : game.result === 'LOSS' ? XIcon : Minus;
                      return (
                        <div key={game.id} className="flex items-center gap-3 py-3">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold border shrink-0 ${resultStyles[game.result]}`}>
                            <ResultIcon className="h-3 w-3" />
                            {game.result}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-neutral-200 truncate">
                              {game.opponent ? game.opponent.displayName : 'AI'}
                            </p>
                            <p className="text-xs text-neutral-500">{game.gameType}</p>
                          </div>
                          <Link href={`/game/${game.id}/review`} className="shrink-0">
                            <Button variant="outline" size="sm" className="text-xs px-2 py-1 h-auto">
                              Review
                            </Button>
                          </Link>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-4">
                    <Link href="/profile/history">
                      <Button variant="secondary" size="sm" className="w-full gap-2">
                        <History className="h-4 w-4" />
                        More Games
                      </Button>
                    </Link>
                  </div>
                </>
              )}
            </SectionCard>
          </div>

          <div className="space-y-6">
            <SectionCard
              title={t('sections.quickActions')}
              icon={<Swords className="h-5 w-5 text-neutral-300" />}
            >
              <div className="grid gap-3">
                <Link href="/play">
                  <Button size="md" className="w-full justify-start gap-2">
                    <Swords className="h-4 w-4" />
                    {t('actions.playOnline')}
                  </Button>
                </Link>
                <Link href="/game/setup-ai">
                  <Button variant="secondary" size="md" className="w-full justify-start gap-2">
                    <Bot className="h-4 w-4" />
                    {t('actions.playAi')}
                  </Button>
                </Link>
                <Link href="/profile/history">
                  <Button variant="secondary" size="md" className="w-full justify-start gap-2">
                    <History className="h-4 w-4" />
                    Game History
                  </Button>
                </Link>
                <Link href="/leaderboard">
                  <Button variant="secondary" size="md" className="w-full justify-start gap-2">
                    <Trophy className="h-4 w-4" />
                    Leaderboard
                  </Button>
                </Link>
                <Link href="/rules">
                  <Button variant="outline" size="md" className="w-full justify-start gap-2">
                    <BookOpen className="h-4 w-4" />
                    {t('actions.rules')}
                  </Button>
                </Link>
                <Link href="/support">
                  <Button variant="outline" size="md" className="w-full justify-start gap-2">
                    <LifeBuoy className="h-4 w-4" />
                    {t('actions.support')}
                  </Button>
                </Link>
              </div>
            </SectionCard>

            <SectionCard title={t('sections.tips')}>
              <ul className="space-y-3 text-sm text-neutral-400">
                <li className="flex gap-2">
                  <span className="mt-0.5 text-neutral-600">•</span>
                  <span>{t('tips.one')}</span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-0.5 text-neutral-600">•</span>
                  <span>{t('tips.two')}</span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-0.5 text-neutral-600">•</span>
                  <span>{t('tips.three')}</span>
                </li>
              </ul>
            </SectionCard>
          </div>
        </div>
      </div>
    </main>
  );
}
