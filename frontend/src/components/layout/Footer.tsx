
"use client";

import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/routing';
import Image from 'next/image';

export const Footer: React.FC = () => {
    const t = useTranslations('footer');
    const pathname = usePathname();
    const currentYear = new Date().getFullYear();




    if (pathname.startsWith('/admin')) return null;

    return (
        <footer className="w-full bg-[var(--background)] border-t border-[var(--secondary)] py-8 mt-auto">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                    <Link href="/" className="flex items-center gap-2">
                        <div className="relative w-8 h-8">
                            <Image
                                src="/logo/tzdraft-logo-transparent.png"
                                alt="TzDraft"
                                fill
                                sizes="32px"
                                className="object-contain"
                            />
                        </div>
                        <span className="text-xl font-bold tracking-tight text-white/90">
                            TzDraft
                        </span>
                    </Link>

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
                            href="/learn"
                            className="text-[#999999] hover:text-[var(--primary)] text-sm transition-colors"
                        >
                            {t('learn')}
                        </Link>
                        <Link
                            href="/privacy"
                            className="text-[#999999] hover:text-[var(--primary)] text-sm transition-colors"
                        >
                            {t('privacyPolicy')}
                        </Link>
                        <Link
                            href="/terms"
                            className="text-[#999999] hover:text-[var(--primary)] text-sm transition-colors"
                        >
                            {t('terms')}
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
