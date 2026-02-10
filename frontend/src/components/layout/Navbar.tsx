"use client";

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link, usePathname, useRouter } from '@/i18n/routing';
import { Button } from '@/components/ui/Button';
import clsx from 'clsx';
import { useLocale } from 'next-intl';
import { useAuth } from '@/hooks/useAuth';
import { User, LogOut, Settings, ChevronDown } from 'lucide-react';

export const Navbar: React.FC = () => {
    const t = useTranslations('nav');
    const pathname = usePathname();
    const router = useRouter();
    const locale = useLocale();
    const { user, logout } = useAuth();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

    const navLinks = [
        { name: t('home'), href: '/' },
        { name: t('play'), href: '/play' },
        { name: t('support'), href: '/support' },
    ];

    const isActive = (href: string) => {
        if (href === '/' && pathname !== '/') return false;
        return pathname.startsWith(href);
    };

    const toggleLanguage = () => {
        const nextLocale = locale === 'sw' ? 'en' : 'sw';
        router.replace(pathname, { locale: nextLocale });
    };

    const handleLogout = async () => {
        await logout();
        setIsUserMenuOpen(false);
        router.push('/');
    };

    return (
        <nav className="sticky top-0 z-50 w-full bg-[var(--background)] border-b border-[var(--secondary)] shadow-md">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    {/* Left: Logo & Desktop Links */}
                    <div className="flex items-center gap-8">
                        <Link href="/" className="flex items-center gap-2">
                            <span className="text-2xl font-black text-[var(--primary)] tracking-tight">TzDraft</span>
                        </Link>

                        <div className="hidden md:flex items-center gap-1">
                            {navLinks.map((link) => (
                                <Link
                                    key={link.name}
                                    href={link.href}
                                    className={clsx(
                                        'px-3 py-2 rounded-md text-sm font-medium transition-colors',
                                        isActive(link.href)
                                            ? 'text-white bg-[var(--secondary)]'
                                            : 'text-[#999999] hover:text-white hover:bg-[var(--secondary)]/50'
                                    )}
                                >
                                    {link.name}
                                </Link>
                            ))}

                            {/* Language Toggler */}
                            <button
                                onClick={toggleLanguage}
                                className="flex items-center gap-1 px-3 py-2 text-[#999999] hover:text-white transition-colors text-sm font-medium"
                            >
                                <span>{locale === 'sw' ? '🇹🇿 SW' : '🇺🇸 EN'}</span>
                            </button>
                        </div>
                    </div>

                    {/* Right: Auth Buttons or User Menu */}
                    <div className="hidden md:flex items-center gap-3">
                        {user ? (
                            <div className="relative">
                                <button
                                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--secondary)] hover:bg-[var(--secondary)]/80 transition-colors"
                                >
                                    <div className="w-8 h-8 rounded-full bg-[var(--primary)] flex items-center justify-center text-white font-bold">
                                        {user.username.charAt(0).toUpperCase()}
                                    </div>
                                    <span className="text-white font-medium">{user.username}</span>
                                    <ChevronDown className={clsx(
                                        "w-4 h-4 text-gray-400 transition-transform",
                                        isUserMenuOpen && "rotate-180"
                                    )} />
                                </button>

                                {/* Dropdown Menu */}
                                {isUserMenuOpen && (
                                    <div className="absolute right-0 mt-2 w-56 bg-[#2a2a2a] border border-gray-700 rounded-lg shadow-xl overflow-hidden">
                                        <div className="px-4 py-3 border-b border-gray-700">
                                            <p className="text-sm text-gray-400">Signed in as</p>
                                            <p className="text-sm font-medium text-white truncate">{user.username}</p>
                                            <p className="text-xs text-gray-500 mt-1">Rating: {typeof user.rating === 'object' ? user.rating.rating : user.rating}</p>
                                        </div>
                                        <div className="py-1">
                                            <Link
                                                href="/profile"
                                                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-300 hover:bg-[var(--secondary)] hover:text-white transition-colors"
                                                onClick={() => setIsUserMenuOpen(false)}
                                            >
                                                <User className="w-4 h-4" />
                                                Profile
                                            </Link>
                                            <Link
                                                href="/settings"
                                                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-300 hover:bg-[var(--secondary)] hover:text-white transition-colors"
                                                onClick={() => setIsUserMenuOpen(false)}
                                            >
                                                <Settings className="w-4 h-4" />
                                                Settings
                                            </Link>
                                        </div>
                                        <div className="border-t border-gray-700">
                                            <button
                                                onClick={handleLogout}
                                                className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
                                            >
                                                <LogOut className="w-4 h-4" />
                                                Sign Out
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <>
                                <Link href="/auth/login">
                                    <Button variant="ghost" size="sm" className="text-[#bababa] hover:text-white font-semibold">{t('login')}</Button>
                                </Link>
                                <Link href="/auth/signup">
                                    <Button size="sm" className="font-bold shadow-none hover:shadow-lg transition-shadow">{t('signup')}</Button>
                                </Link>
                            </>
                        )}
                    </div>

                    {/* Mobile Menu Button */}
                    <div className="md:hidden">
                        <button
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            className="text-[#999999] hover:text-white p-2"
                        >
                            <span className="text-2xl">☰</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Menu */}
            {isMenuOpen && (
                <div className="md:hidden bg-[#262522] border-t border-[#3d3d3d]">
                    <div className="px-2 pt-2 pb-3 space-y-1">
                        {navLinks.map((link) => (
                            <Link
                                key={link.name}
                                href={link.href}
                                className="block px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:text-white hover:bg-[#3d3d3d]"
                                onClick={() => setIsMenuOpen(false)}
                            >
                                {link.name}
                            </Link>
                        ))}
                        <div className="pt-4 flex flex-col gap-2 p-2">
                            <button
                                onClick={toggleLanguage}
                                className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-gray-300 hover:text-white hover:bg-[var(--secondary)] mb-2"
                            >
                                {locale === 'sw' ? 'Badili Lugha (EN)' : 'Change Language (SW)'}
                            </button>

                            {user ? (
                                <>
                                    <div className="px-3 py-2 border-b border-gray-700 mb-2">
                                        <p className="text-sm text-gray-400">Signed in as</p>
                                        <p className="text-sm font-medium text-white">{user.username}</p>
                                        <p className="text-xs text-gray-500 mt-1">Rating: {typeof user.rating === 'object' ? user.rating.rating : user.rating}</p>
                                    </div>
                                    <Link href="/profile" onClick={() => setIsMenuOpen(false)}>
                                        <Button variant="secondary" className="w-full justify-start gap-2">
                                            <User className="w-4 h-4" />
                                            Profile
                                        </Button>
                                    </Link>
                                    <Link href="/settings" onClick={() => setIsMenuOpen(false)}>
                                        <Button variant="secondary" className="w-full justify-start gap-2">
                                            <Settings className="w-4 h-4" />
                                            Settings
                                        </Button>
                                    </Link>
                                    <Button
                                        onClick={handleLogout}
                                        variant="secondary"
                                        className="w-full justify-start gap-2 text-red-400 hover:text-red-300"
                                    >
                                        <LogOut className="w-4 h-4" />
                                        Sign Out
                                    </Button>
                                </>
                            ) : (
                                <>
                                    <Link href="/auth/login" onClick={() => setIsMenuOpen(false)}>
                                        <Button variant="secondary" className="w-full justify-center">{t('login')}</Button>
                                    </Link>
                                    <Link href="/auth/signup" onClick={() => setIsMenuOpen(false)}>
                                        <Button className="w-full justify-center">{t('signup')}</Button>
                                    </Link>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </nav>
    );
};
