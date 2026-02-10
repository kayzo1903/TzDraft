
"use client";

import React from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';

export const Footer: React.FC = () => {
    const t = useTranslations('footer');
    const currentYear = new Date().getFullYear();

    return (
        <footer className="w-full bg-[var(--background)] border-t border-[var(--secondary)] py-8 mt-auto">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="text-[#999999] text-sm">
                        © {currentYear} TzDraft. {t('rights')}
                    </div>

                    <div className="flex items-center gap-6">
                        <Link
                            href="/rules"
                            className="text-[#999999] hover:text-[var(--primary)] text-sm transition-colors"
                        >
                            {t('rules')}
                        </Link>
                        <Link
                            href="/policy"
                            className="text-[#999999] hover:text-[var(--primary)] text-sm transition-colors"
                        >
                            {t('privacyPolicy')}
                        </Link>
                    </div>

                    <div className="text-[#999999] text-sm flex items-center gap-1">
                        <span>{t('madeWith')}</span>
                        <span className="text-red-500">♥</span>
                        <span>{t('by')}</span>
                        <span className="text-[var(--foreground)] font-medium">TzDraft Team</span>
                    </div>
                </div>
            </div>
        </footer>
    );
};
