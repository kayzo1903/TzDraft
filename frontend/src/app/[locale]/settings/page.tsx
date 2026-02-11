'use client';

import React from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Link, usePathname, useRouter } from '@/i18n/routing';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';
import { Globe2, KeyRound, LogOut, ShieldCheck, ShieldAlert, User as UserIcon, FileText, BookOpen } from 'lucide-react';

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

export default function SettingsPage() {
  const t = useTranslations('settings');
  const locale = useLocale();
  const pathname = usePathname();
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

  const toggleLanguage = () => {
    const nextLocale = locale === 'sw' ? 'en' : 'sw';
    router.replace(pathname, { locale: nextLocale });
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
            <h1 className="text-3xl font-black text-neutral-100">{t('signedOut.title')}</h1>
            <p className="mt-2 text-neutral-400">{t('signedOut.subtitle')}</p>
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
              <Link href="/support" className="w-full sm:w-auto">
                <Button variant="outline" size="lg" className="w-full sm:w-auto">
                  {t('signedOut.actions.support')}
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
      <div className="max-w-5xl mx-auto space-y-8">
        <header className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-6 shadow-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-[var(--secondary)] flex items-center justify-center">
                <UserIcon className="h-6 w-6 text-neutral-200" />
              </div>
              <div>
                <h1 className="text-3xl font-black text-neutral-100 tracking-tight">
                  {t('title')}
                </h1>
                <p className="mt-1 text-neutral-400">
                  {t('subtitle', { name: user.displayName || user.username })}
                </p>
                <div className="mt-2">
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
                    {hasVerifiedPhone ? t('security.status.verified') : t('security.status.notVerified')}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Link href="/profile" className="w-full sm:w-auto">
                <Button variant="secondary" className="w-full sm:w-auto">
                  {t('actions.viewProfile')}
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SectionCard title={t('sections.preferences')} icon={<Globe2 className="h-5 w-5 text-neutral-300" />}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <div className="text-sm font-bold text-neutral-200">{t('language.title')}</div>
                <div className="mt-1 text-sm text-neutral-400">{t('language.subtitle')}</div>
              </div>
              <Button variant="secondary" onClick={toggleLanguage} className="gap-2">
                <Globe2 className="h-4 w-4" />
                {t('language.action', { locale: locale.toUpperCase() })}
              </Button>
            </div>
          </SectionCard>

          <SectionCard title={t('sections.security')} icon={<KeyRound className="h-5 w-5 text-neutral-300" />}>
            <div className="rounded-xl border border-neutral-800 bg-neutral-950/40 p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-bold text-neutral-200">{t('security.password.title')}</div>
                  <div className="mt-1 text-sm text-neutral-400">{t('security.password.subtitle')}</div>
                </div>
                <Link href="/auth/forgot-password">
                  <Button variant="secondary" className="gap-2">
                    <KeyRound className="h-4 w-4" />
                    {t('security.password.action')}
                  </Button>
                </Link>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-neutral-800 bg-neutral-950/40 p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-bold text-neutral-200">{t('security.status.title')}</div>
                  <div className="mt-1 text-sm text-neutral-400">{t('security.status.subtitle')}</div>
                </div>
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
                  {hasVerifiedPhone ? t('security.status.verified') : t('security.status.notVerified')}
                </span>
              </div>
            </div>
          </SectionCard>

          <SectionCard title={t('sections.account')} icon={<UserIcon className="h-5 w-5 text-neutral-300" />}>
            <div className="space-y-3 text-sm text-neutral-300">
              <div className="flex items-start justify-between gap-4 border-b border-neutral-800/70 pb-3">
                <span className="text-neutral-400">{t('account.username')}</span>
                <span className="text-neutral-100 text-right break-all">{user.username}</span>
              </div>
              <div className="flex items-start justify-between gap-4 border-b border-neutral-800/70 pb-3">
                <span className="text-neutral-400">{t('account.phone')}</span>
                <span className="text-neutral-100 text-right break-all">{phoneDisplay}</span>
              </div>
              <div className="flex items-start justify-between gap-4">
                <span className="text-neutral-400">{t('account.email')}</span>
                <span className="text-neutral-100 text-right break-all">{user.email || '—'}</span>
              </div>

              <div className="pt-4 flex flex-col sm:flex-row gap-3">
                <Link href="/support" className="w-full sm:w-auto">
                  <Button variant="outline" className="w-full sm:w-auto">
                    {t('account.actions.contactSupport')}
                  </Button>
                </Link>
                <Link href="/profile" className="w-full sm:w-auto">
                  <Button variant="secondary" className="w-full sm:w-auto">
                    {t('account.actions.openProfile')}
                  </Button>
                </Link>
              </div>
            </div>
          </SectionCard>

          <SectionCard title={t('sections.legal')} icon={<FileText className="h-5 w-5 text-neutral-300" />}>
            <div className="grid gap-3">
              <Link href="/policy">
                <Button variant="outline" className="w-full justify-start gap-2">
                  <FileText className="h-4 w-4" />
                  {t('legal.policy')}
                </Button>
              </Link>
              <Link href="/rules">
                <Button variant="outline" className="w-full justify-start gap-2">
                  <BookOpen className="h-4 w-4" />
                  {t('legal.rules')}
                </Button>
              </Link>
            </div>
          </SectionCard>
        </div>
      </div>
    </main>
  );
}
