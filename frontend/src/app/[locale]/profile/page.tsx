'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/routing';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';
import {
  Bot,
  BookOpen,
  LifeBuoy,
  LogOut,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Star,
  Swords,
  User as UserIcon,
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
  const { user, logout } = useAuth();
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
                  {ratingValue !== null ? (
                    <>
                      <span className="mx-2 text-neutral-600">•</span>
                      {t('ratingInline', { rating: ratingValue })}
                    </>
                  ) : null}
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
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

        {/* Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <SectionCard title={t('sections.account')} icon={<UserIcon className="h-5 w-5 text-neutral-300" />}>
              <div className="divide-y divide-neutral-800/70">
                <FieldRow label={t('fields.displayName')} value={user.displayName || '—'} />
                <FieldRow label={t('fields.username')} value={user.username} />
                <FieldRow label={t('fields.phone')} value={phoneDisplay} />
                <FieldRow label={t('fields.email')} value={user.email || '—'} />
                <FieldRow label={t('fields.userId')} value={user.id} />
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
                    {ratingStats?.gamesPlayed ?? '—'}
                  </div>
                </div>
                <div className="rounded-xl border border-neutral-800 bg-neutral-950/40 p-4">
                  <div className="text-xs font-bold uppercase tracking-[0.2em] text-neutral-500">
                    {t('stats.wins')}
                  </div>
                  <div className="mt-2 text-3xl font-black text-neutral-100">
                    {ratingStats?.wins ?? '—'}
                  </div>
                </div>
                <div className="rounded-xl border border-neutral-800 bg-neutral-950/40 p-4">
                  <div className="text-xs font-bold uppercase tracking-[0.2em] text-neutral-500">
                    {t('stats.losses')}
                  </div>
                  <div className="mt-2 text-3xl font-black text-neutral-100">
                    {ratingStats?.losses ?? '—'}
                  </div>
                </div>
              </div>

              <p className="mt-4 text-sm text-neutral-500">
                {t('stats.note')}
              </p>
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
