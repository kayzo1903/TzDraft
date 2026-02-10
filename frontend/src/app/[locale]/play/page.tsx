"use client";

import React from 'react';
import { Link } from '@/i18n/routing';
import { useTranslations } from 'next-intl';
import { Globe, Bot, Users, Trophy, ArrowRight } from 'lucide-react';
import clsx from 'clsx';

export default function PlayPage() {
    const t = useTranslations('play');

    const gameModes = [
        {
            id: 'online',
            title: t('modes.online.title'),
            description: t('modes.online.description'),
            icon: <Globe className="w-8 h-8 text-blue-400" />,
            href: '#',
            enabled: false,
            comingSoon: true,
            comingSoonLabel: t('modes.online.comingSoon'),
            action: t('modes.online.unavailable'),
            color: 'bg-blue-500/10 border-blue-500/20',
            buttonColor: 'bg-neutral-700'
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
            href: '#',
            enabled: false,
            comingSoon: true,
            comingSoonLabel: t('modes.friend.comingSoon'),
            action: t('modes.friend.unavailable'),
            color: 'bg-purple-500/10 border-purple-500/20',
            buttonColor: 'bg-neutral-700'
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
