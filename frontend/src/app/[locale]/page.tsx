"use client";

import React from 'react';
import { Link } from '@/i18n/routing';
import { HeroBoard } from '@/components/hero/HeroBoard';
import { Button } from '@/components/ui/Button';
import { useTranslations } from 'next-intl';
import { Globe, Cpu, Trophy, BarChart3, BookOpen, ScanSearch, Lock, Users, ArrowRight } from 'lucide-react';

export default function Home() {
  const t = useTranslations('hero');

  return (
    <main className="bg-[var(--background)] flex flex-col">

      {/* ── Hero ── */}
      <section className="flex items-center justify-center px-6 py-12 min-h-[calc(100vh-64px)]">
        <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

          {/* Left: CTA */}
          <div className="flex flex-col gap-8 text-center lg:text-left">
            <div className="space-y-4">
              <h1 className="text-5xl lg:text-7xl font-black text-[#EDEDED] leading-tight">
                {t('title')}
              </h1>
              <p className="text-xl text-neutral-400 max-w-lg mx-auto lg:mx-0 leading-relaxed">
                {t('subtitle')}
              </p>
            </div>

            <div className="flex flex-col gap-4 max-w-md mx-auto lg:mx-0 w-full">
              {/* Primary — Play vs Computer */}
              <Link href="/game/setup-ai" className="w-full">
                <Button size="lg" className="w-full gap-3 justify-center">
                  <span className="text-2xl">{"\u{1F916}"}</span>
                  <span className="font-bold">{t('playComputer')}</span>
                </Button>
              </Link>

              {/* Secondary — Play Online (limited) */}
              <Link href="/play" className="w-full">
                <Button variant="secondary" size="lg" className="w-full gap-3 opacity-60 justify-center relative">
                  <span className="text-2xl">{"\u{1F310}"}</span>
                  <span className="font-bold">{t('playOnline')}</span>
                  <span className="absolute right-4 text-[10px] font-black uppercase tracking-wide text-amber-400 border border-amber-500/40 bg-amber-500/10 rounded-full px-2 py-0.5">
                    {t('featureGrid.limited')}
                  </span>
                </Button>
              </Link>
            </div>

            <div className="flex items-center justify-center lg:justify-start gap-8 text-neutral-500 text-sm font-medium">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span>124 Players Online</span>
              </div>
              <div>•</div>
              <div>542 Games Today</div>
            </div>
          </div>

          {/* Right: Animated Board */}
          <div className="relative flex justify-center">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-orange-500/10 blur-[100px] rounded-full pointer-events-none" />
            <div className="relative w-full max-w-[500px] transform lg:rotate-[-2deg] transition-transform hover:scale-[1.02] duration-500">
              <div className="absolute inset-0 bg-black/40 blur-xl rounded-2xl translate-y-8" />
              <HeroBoard />
            </div>
          </div>

        </div>
      </section>

      {/* ── Feature Grid ── */}
      <section className="py-16 px-6 border-t border-white/5">
        <div className="max-w-6xl mx-auto space-y-4">

          <div className="text-center space-y-2 mb-8">
            <h2 className="text-2xl lg:text-3xl font-black text-[#EDEDED]">
              {t('featureGrid.title')}
            </h2>
            <p className="text-neutral-500 text-sm max-w-md mx-auto">
              {t('featureGrid.subtitle')}
            </p>
          </div>

          {/* Row 1 — Single full-width active tile */}
          <Link href="/game/setup-ai">
            <div className="group relative flex items-center gap-6 rounded-2xl border border-white/10 bg-[var(--secondary)] hover:bg-[var(--secondary-hover)] hover:border-[var(--primary)]/30 p-6 transition-all duration-200 hover:scale-[1.005] overflow-hidden cursor-pointer">
              <div className="absolute inset-0 bg-gradient-to-r from-[var(--primary)]/8 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
              <div className="w-16 h-16 rounded-2xl bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center shrink-0">
                <Cpu className="w-8 h-8" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-black text-white text-xl">{t('featureGrid.playComputer.title')}</h3>
                <p className="text-sm text-neutral-400 mt-1">{t('featureGrid.playComputer.desc')}</p>
              </div>
              <ArrowRight className="w-5 h-5 text-neutral-600 group-hover:text-[var(--primary)] group-hover:translate-x-1 transition-all duration-200 shrink-0" />
            </div>
          </Link>

          {/* Row 2 — 6 compact tiles (2 limited/coming-soon + 4 locked) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">

            {/* Play Online — Limited (amber badge, no lock) */}
            <div className="relative flex flex-col gap-3 rounded-xl border border-amber-500/15 bg-[var(--secondary)]/40 p-4 opacity-60 cursor-not-allowed select-none">
              <div className="flex items-start justify-between gap-2">
                <div className="w-9 h-9 rounded-lg bg-white/5 text-neutral-500 flex items-center justify-center shrink-0">
                  <Globe className="w-4 h-4" />
                </div>
                <div className="flex items-center gap-1 rounded-full bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 shrink-0">
                  <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wide">
                    {t('featureGrid.limited')}
                  </span>
                </div>
              </div>
              <div>
                <h3 className="font-bold text-sm text-neutral-400">{t('featureGrid.playOnline.title')}</h3>
                <p className="text-xs text-neutral-600 mt-0.5 leading-relaxed">{t('featureGrid.playOnline.desc')}</p>
              </div>
            </div>

            {/* Play with Friend — Active */}
            <Link href="/game/setup-friend">
              <div className="group relative flex flex-col gap-3 rounded-xl border border-white/10 bg-[var(--secondary)]/40 hover:bg-[var(--secondary)] hover:border-[var(--primary)]/30 p-4 transition-all duration-200 cursor-pointer">
                <div className="absolute inset-0 bg-gradient-to-br from-[var(--primary)]/8 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-xl" />
                <div className="flex items-start justify-between gap-2">
                  <div className="w-9 h-9 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center shrink-0">
                    <Users className="w-4 h-4" />
                  </div>
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">{t('featureGrid.playFriend.title')}</h3>
                  <p className="text-xs text-neutral-500 mt-0.5 leading-relaxed">{t('featureGrid.playFriend.desc')}</p>
                </div>
              </div>
            </Link>

            {/* Remaining locked tiles */}
            {([
              { key: 'tournaments',  Icon: Trophy     },
              { key: 'leaderboard',  Icon: BarChart3  },
              { key: 'learn',        Icon: BookOpen   },
              { key: 'analysis',     Icon: ScanSearch },
            ] as const).map(({ key, Icon }) => (
              <div
                key={key}
                className="relative flex flex-col gap-3 rounded-xl border border-white/5 bg-[var(--secondary)]/40 p-4 opacity-50 cursor-not-allowed select-none"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="w-9 h-9 rounded-lg bg-white/5 text-neutral-600 flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex items-center gap-1 rounded-full bg-white/5 border border-white/10 px-2 py-0.5 shrink-0">
                    <Lock className="w-2.5 h-2.5 text-neutral-500" />
                    <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wide hidden sm:inline">
                      {t('featureGrid.comingSoon')}
                    </span>
                  </div>
                </div>
                <div>
                  <h3 className="font-bold text-sm text-neutral-500">{t(`featureGrid.${key}.title`)}</h3>
                  <p className="text-xs text-neutral-600 mt-0.5 leading-relaxed">{t(`featureGrid.${key}.desc`)}</p>
                </div>
              </div>
            ))}

          </div>

        </div>
      </section>

    </main>
  );
}
