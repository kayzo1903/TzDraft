"use client";

import React from 'react';
import { Link } from '@/i18n/routing';
import { useTranslations } from 'next-intl';
import { Globe, Bot, Users, Trophy, ArrowRight } from 'lucide-react';
import clsx from 'clsx';

export default function PlayPage() {
    const t = useTranslations('play');
    const hero = useTranslations('hero');

    const gameModes = [
        {
            id: 'online',
            title: t('modes.online.title'),
            description: t('modes.online.description'),
            icon: <Globe className="w-8 h-8 text-blue-400" />,
            href: '/game/online',
            enabled: true,
            comingSoon: false,
            comingSoonLabel: '',
            action: t('modes.online.action'),
            color: 'bg-blue-500/10 border-blue-500/20',
            buttonColor: 'bg-blue-600 hover:bg-blue-500'
        },
        {
            id: 'ai',
            title: t('modes.ai.title'),
            description: t('modes.ai.description'),
            icon: <Bot className="w-8 h-8 text-emerald-400" />,
            href: '/game/setup-ai',
            enabled: true,
            comingSoon: false,
            comingSoonLabel: '',
            action: t('modes.ai.action'),
            color: 'bg-emerald-500/10 border-emerald-500/20 hover:border-emerald-500/50',
            buttonColor: 'bg-emerald-600 hover:bg-emerald-500'
        },
        {
            id: 'friend',
            title: t('modes.friend.title'),
            description: t('modes.friend.description'),
            icon: <Users className="w-8 h-8 text-purple-400" />,
            href: '/play/friend',
            enabled: true,
            comingSoon: false,
            comingSoonLabel: '',
            action: t('modes.friend.action'),
            color: 'bg-purple-500/10 border-purple-500/20 hover:border-purple-500/50',
            buttonColor: 'bg-purple-600 hover:bg-purple-500'
        },
        {
            id: 'tournament',
            title: t('modes.tournament.title'),
            description: t('modes.tournament.description'),
            icon: <Trophy className="w-8 h-8 text-amber-400" />,
            href: '#',
            enabled: false,
            comingSoon: true,
            comingSoonLabel: t('modes.tournament.comingSoon'),
            action: t('modes.tournament.unavailable'),
            color: 'bg-amber-500/10 border-amber-500/20',
            buttonColor: 'bg-neutral-700'
        }
    ];

    const featuredModes = [
        {
            title: hero('landing.featured.cards.ranked.title'),
            description: hero('landing.featured.cards.ranked.description'),
            tag: hero('landing.featured.cards.ranked.tag')
        },
        {
            title: hero('landing.featured.cards.ai.title'),
            description: hero('landing.featured.cards.ai.description'),
            tag: hero('landing.featured.cards.ai.tag')
        },
        {
            title: hero('landing.featured.cards.friends.title'),
            description: hero('landing.featured.cards.friends.description'),
            tag: hero('landing.featured.cards.friends.tag')
        }
    ];

    const featureHighlights = [
        hero('landing.coreFeatures.items.sync'),
        hero('landing.coreFeatures.items.capture'),
        hero('landing.coreFeatures.items.reconnect'),
        hero('landing.coreFeatures.items.mobile')
    ];

    const productIdeas = [
        hero('landing.productIdeas.items.tournaments'),
        hero('landing.productIdeas.items.replay'),
        hero('landing.productIdeas.items.profiles'),
        hero('landing.productIdeas.items.spectator')
    ];

    return (
        <main className="min-h-screen bg-[var(--background)] flex flex-col items-center py-20 px-4">
            <div className="max-w-6xl w-full flex flex-col gap-12">

                {/* Header Section */}
                <div className="text-center space-y-4">
                    <h1 className="text-5xl font-black text-[#EDEDED] tracking-tight">
                        {t('title')}
                    </h1>
                    <p className="text-xl text-neutral-400 max-w-2xl mx-auto">
                        {t('subtitle')}
                    </p>
                </div>

                {/* Game Modes Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {gameModes.map((mode) => (
                        <div key={mode.id} className="group relative">
                            {/* Card Background & Border */}
                            <div className={clsx(
                                "absolute inset-0 rounded-2xl transition-all duration-300",
                                mode.color,
                                mode.enabled ? "opacity-100" : "opacity-50 grayscale"
                            )} />

                            {/* Content */}
                            <div className={clsx(
                                "relative p-8 h-full flex flex-col justify-between rounded-2xl border border-transparent transition-all duration-300",
                                mode.enabled ? "hover:-translate-y-1 hover:shadow-xl bg-neutral-900/40 hover:bg-neutral-900/60" : "bg-neutral-900/20 cursor-not-allowed"
                            )}>
                                <div className="space-y-6">
                                    <div className="flex items-start justify-between">
                                        <div className={clsx("p-4 rounded-xl bg-neutral-900/80 border border-neutral-800", mode.enabled && "group-hover:scale-110 transition-transform duration-300")}>
                                            {mode.icon}
                                        </div>
                                        {mode.comingSoon && (
                                            <span className="px-3 py-1 rounded-full text-xs font-bold bg-neutral-800 text-neutral-400 border border-neutral-700 uppercase tracking-wider">
                                                {mode.comingSoonLabel}
                                            </span>
                                        )}
                                    </div>

                                    <div>
                                        <h3 className="text-2xl font-bold text-white mb-2">{mode.title}</h3>
                                        <p className="text-neutral-400 leading-relaxed">{mode.description}</p>
                                    </div>
                                </div>

                                <div className="mt-8">
                                    {mode.enabled ? (
                                        <Link href={mode.href} className="block w-full">
                                            <button className={clsx(
                                                "w-full py-4 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all",
                                                mode.buttonColor,
                                                "group-hover:shadow-lg group-hover:shadow-blue-500/20" // Generic shadow, could be specific
                                            )}>
                                                {mode.action}
                                                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                            </button>
                                        </Link>
                                    ) : (
                                        <button disabled className="w-full py-4 rounded-xl font-bold text-neutral-500 bg-neutral-800 cursor-not-allowed flex items-center justify-center gap-2">
                                            {mode.action}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer / Stats (Optional) */}
                <section className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-5 sm:p-6">
                    <div className="flex items-center justify-between gap-4 mb-4">
                        <h2 className="text-xl sm:text-2xl font-bold text-neutral-100">
                            {hero('landing.featured.title')}
                        </h2>
                        <Link href="/play" className="text-sm text-orange-400 hover:text-orange-300">
                            {hero('landing.featured.explore')}
                        </Link>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {featuredModes.map((mode) => (
                            <article
                                key={mode.title}
                                className="rounded-xl border border-neutral-800 bg-neutral-950/50 p-4"
                            >
                                <div className="text-[11px] uppercase tracking-wide text-orange-400 mb-2">
                                    {mode.tag}
                                </div>
                                <h3 className="text-base font-semibold text-neutral-100">
                                    {mode.title}
                                </h3>
                                <p className="text-sm text-neutral-400 mt-2 leading-relaxed">
                                    {mode.description}
                                </p>
                            </article>
                        ))}
                    </div>
                </section>

                <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-5 sm:p-6">
                        <h2 className="text-xl font-bold text-neutral-100 mb-3">
                            {hero('landing.coreFeatures.title')}
                        </h2>
                        <ul className="space-y-2">
                            {featureHighlights.map((item) => (
                                <li key={item} className="text-sm text-neutral-300 flex items-start gap-2">
                                    <span className="text-orange-400 mt-[2px]">+</span>
                                    <span>{item}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-5 sm:p-6">
                        <h2 className="text-xl font-bold text-neutral-100 mb-3">
                            {hero('landing.productIdeas.title')}
                        </h2>
                        <div className="flex flex-wrap gap-2">
                            {productIdeas.map((idea) => (
                                <span
                                    key={idea}
                                    className="text-xs sm:text-sm text-neutral-300 bg-neutral-800/80 border border-neutral-700 rounded-lg px-3 py-2"
                                >
                                    {idea}
                                </span>
                            ))}
                        </div>
                        <div className="mt-4">
                            <Link href="/support">
                                <button className="px-4 py-2 rounded-lg border border-neutral-700 bg-neutral-800 text-sm text-neutral-100 hover:bg-neutral-700 transition-colors">
                                    {hero('landing.productIdeas.shareIdea')}
                                </button>
                            </Link>
                        </div>
                    </div>
                </section>

                <div className="flex justify-center gap-12 text-center pt-8 border-t border-neutral-800/50">
                    <div>
                        <div className="text-3xl font-black text-white">1,240</div>
                        <div className="text-sm text-neutral-500 font-medium uppercase tracking-wider">{t('stats.activePlayers')}</div>
                    </div>
                    <div>
                        <div className="text-3xl font-black text-white">54</div>
                        <div className="text-sm text-neutral-500 font-medium uppercase tracking-wider">{t('stats.matchesNow')}</div>
                    </div>
                </div>

            </div>
        </main>
    );
}
