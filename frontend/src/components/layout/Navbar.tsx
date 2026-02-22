"use client";

import React, { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link, usePathname, useRouter } from '@/i18n/routing';
import { Button } from '@/components/ui/Button';
import clsx from 'clsx';
import { useLocale } from 'next-intl';
import { useAuth } from '@/hooks/useAuth';
import { User, LogOut, Settings, ChevronDown, Globe, Menu, X } from 'lucide-react';
import Image from 'next/image';

export const Navbar: React.FC = () => {
    const t = useTranslations('nav');
    const pathname = usePathname();
    const router = useRouter();
    const locale = useLocale();
    const { user, logout } = useAuth();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);
    const userMenuRef = useRef<HTMLDivElement | null>(null);

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

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 10);
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        setIsMenuOpen(false);
        setIsUserMenuOpen(false);
    }, [pathname]);

    useEffect(() => {
        if (!isUserMenuOpen) return;

        const onPointerDown = (event: PointerEvent) => {
            const target = event.target as Node | null;
            if (!target) return;
            if (userMenuRef.current?.contains(target)) return;
            setIsUserMenuOpen(false);
        };

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setIsUserMenuOpen(false);
        };

        document.addEventListener('pointerdown', onPointerDown);
        document.addEventListener('keydown', onKeyDown);
        return () => {
            document.removeEventListener('pointerdown', onPointerDown);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [isUserMenuOpen]);

    useEffect(() => {
        if (!isMenuOpen) return;

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setIsMenuOpen(false);
        };

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        document.addEventListener('keydown', onKeyDown);

        return () => {
            document.body.style.overflow = previousOverflow;
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [isMenuOpen]);

    return (
        <nav
            className={clsx(
                'sticky top-0 z-50 w-full transition-all duration-300',
                isScrolled
                    ? 'border-b border-white/5 bg-[rgb(28_25_23/0.78)] backdrop-blur-md supports-[backdrop-filter]:bg-[rgb(28_25_23/0.6)] shadow-[0_12px_40px_rgba(0,0,0,0.35)]'
                    : 'border-b border-transparent bg-transparent'
            )}
        >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    {/* Left: Logo & Desktop Links */}
                    <div className="flex items-center gap-8">
                        <Link href="/" className="flex items-center gap-2">
                            <div className="relative w-9 h-9">
                                <Image
                                    src="/logo/logo.png"
                                    alt="TzDraft"
                                    fill
                                    sizes="36px"
                                    className="object-contain"
                                    priority
                                />
                            </div>
                            <span className="text-2xl font-black tracking-tight bg-gradient-to-r from-[var(--primary)] via-amber-300 to-[var(--primary)] bg-clip-text text-transparent">
                                TzDraft
                            </span>
                        </Link>

                        <div className="hidden md:flex items-center gap-1 rounded-2xl border border-white/5 bg-white/5 p-1">
                            {navLinks.map((link) => (
                                <Link
                                    key={link.name}
                                    href={link.href}
                                    className={clsx(
                                        'relative px-4 py-2 rounded-xl text-sm font-semibold transition-colors',
                                        isActive(link.href)
                                            ? "text-white bg-white/10 after:content-[''] after:absolute after:left-3 after:right-3 after:-bottom-0.5 after:h-0.5 after:bg-[var(--primary)] after:rounded-full"
                                            : 'text-neutral-300/80 hover:text-white hover:bg-white/10'
                                    )}
                                >
                                    {link.name}
                                </Link>
                            ))}

                            {/* Language Toggler */}
                            <button
                                onClick={toggleLanguage}
                                className="ml-1 inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold text-neutral-300/80 hover:text-white hover:bg-white/10 transition-colors"
                            >
                                <Globe className="w-4 h-4" />
                                <span className="tracking-wide">{locale === 'sw' ? 'SW' : 'EN'}</span>
                            </button>
                        </div>
                    </div>

                    {/* Right: Auth Buttons or User Menu */}
                    <div className="hidden md:flex items-center gap-3">
                        {user ? (
                            <div className="relative" ref={userMenuRef}>
                                <button
                                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                                    className={clsx(
                                        'flex items-center gap-2 px-3 py-2 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors',
                                        isUserMenuOpen && 'bg-white/10'
                                    )}
                                >
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--primary)] to-amber-300 flex items-center justify-center text-black font-black shadow-[0_10px_30px_rgba(249,115,22,0.25)] ring-1 ring-white/10">
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
                                    <div className="absolute right-0 mt-3 w-64 overflow-hidden rounded-2xl border border-white/10 bg-[rgb(20_19_18/0.92)] backdrop-blur-md shadow-[0_18px_60px_rgba(0,0,0,0.55)]">
                                        <div className="px-4 py-3 border-b border-white/10">
                                            <p className="text-xs uppercase tracking-[0.4em] text-neutral-400">Account</p>
                                            <div className="flex items-center gap-2">
                                                <p className="text-sm font-medium text-white truncate">{user.username}</p>
                                                <span
                                                    className={clsx(
                                                        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-black border",
                                                        user.isVerified
                                                            ? "bg-green-500/10 text-green-300 border-green-500/30"
                                                            : "bg-amber-500/10 text-amber-300 border-amber-500/30"
                                                    )}
                                                >
                                                    {user.isVerified ? "VERIFIED" : "UNVERIFIED"}
                                                </span>
                                            </div>
                                            <p className="text-xs text-gray-500 mt-1">Rating: {typeof user.rating === 'object' ? user.rating.rating : user.rating}</p>
                                        </div>
                                        <div className="py-1">
                                            <Link
                                                href="/profile"
                                                className="flex items-center gap-2 px-4 py-2.5 text-sm text-neutral-200/90 hover:bg-white/10 hover:text-white transition-colors"
                                                onClick={() => setIsUserMenuOpen(false)}
                                            >
                                                <User className="w-4 h-4" />
                                                Profile
                                            </Link>
                                            <Link
                                                href="/settings"
                                                className="flex items-center gap-2 px-4 py-2.5 text-sm text-neutral-200/90 hover:bg-white/10 hover:text-white transition-colors"
                                                onClick={() => setIsUserMenuOpen(false)}
                                            >
                                                <Settings className="w-4 h-4" />
                                                Settings
                                            </Link>
                                        </div>
                                        <div className="border-t border-white/10">
                                            <button
                                                onClick={handleLogout}
                                                className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-red-300/90 hover:bg-red-500/10 hover:text-red-200 transition-colors"
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
                                    <Button variant="ghost" size="sm" className="text-neutral-300/80 hover:text-white font-semibold">{t('login')}</Button>
                                </Link>
                                <Link href="/auth/signup">
                                    <Button size="sm" className="font-black shadow-[0_18px_50px_rgba(249,115,22,0.22)] border-b-0 active:translate-y-0">{t('signup')}</Button>
                                </Link>
                            </>
                        )}
                    </div>

                    {/* Mobile Menu Button */}
                    <div className="md:hidden">
                        <button
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 p-2 text-neutral-200 transition-colors"
                            aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
                        >
                            {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Menu (Full-page slide-in) */}
            <div
                className={clsx(
                    'md:hidden fixed inset-0 z-[80] transition-opacity duration-500 ease-out',
                    isMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
                )}
                aria-hidden={!isMenuOpen}
            >
                {/* Deep blur backdrop */}
                <button
                    type="button"
                    aria-label="Close menu"
                    onClick={() => setIsMenuOpen(false)}
                    className={clsx(
                        'absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-500 ease-out',
                        isMenuOpen ? 'opacity-100' : 'opacity-0'
                    )}
                />

                {/* Slide panel */}
                <div
                    className={clsx(
                        'absolute inset-y-0 left-0 w-[85%] max-w-sm transform transition-transform duration-500 ease-[cubic-bezier(0.22,0.61,0.36,1)] will-change-transform',
                        isMenuOpen ? 'translate-x-0' : '-translate-x-full'
                    )}
                    role="dialog"
                    aria-modal="true"
                >
                    <div className="h-full w-full border-r border-white/10 bg-[#141312]/95 backdrop-blur-xl shadow-[0_30px_120px_rgba(0,0,0,0.75)]">
                        <div className="px-4 pt-4 pb-3 border-b border-white/10 flex items-center justify-between">
                            <Link href="/" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-2">
                                <div className="relative w-9 h-9">
                                    <Image
                                        src="/logo/logo.png"
                                        alt="TzDraft"
                                        fill
                                        sizes="36px"
                                        className="object-contain"
                                    />
                                </div>
                                <span className="text-xl font-black tracking-tight bg-gradient-to-r from-[var(--primary)] via-amber-300 to-[var(--primary)] bg-clip-text text-transparent">
                                    TzDraft
                                </span>
                            </Link>

                            <button
                                type="button"
                                onClick={() => setIsMenuOpen(false)}
                                className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 p-2 text-neutral-200 transition-colors"
                                aria-label="Close menu"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="px-4 py-5 space-y-5">
                            <div className="space-y-2">
                                {navLinks.map((link) => (
                                    <Link
                                        key={link.name}
                                        href={link.href}
                                        className={clsx(
                                            "block px-4 py-3 rounded-2xl text-lg font-semibold transition-colors",
                                            isActive(link.href)
                                                ? "text-white bg-white/10"
                                                : "text-neutral-200/90 hover:text-white hover:bg-white/10"
                                        )}
                                        onClick={() => setIsMenuOpen(false)}
                                    >
                                        {link.name}
                                    </Link>
                                ))}
                            </div>

                            <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-3">
                                <div className="text-sm font-semibold text-neutral-200">Language</div>
                                <button
                                    onClick={toggleLanguage}
                                    className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-neutral-200 hover:bg-white/10 transition-colors"
                                >
                                    <Globe className="w-4 h-4" />
                                    {locale === 'sw' ? 'EN' : 'SW'}
                                </button>
                            </div>

                            {user ? (
                                <div className="space-y-2">
                                    <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                                        <p className="text-xs uppercase tracking-[0.4em] text-neutral-400">Signed in</p>
                                        <div className="mt-1 flex items-center justify-between gap-2">
                                            <p className="text-sm font-semibold text-white truncate">{user.username}</p>
                                            <span
                                                className={clsx(
                                                    "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-black border",
                                                    user.isVerified
                                                        ? "bg-green-500/10 text-green-300 border-green-500/30"
                                                        : "bg-amber-500/10 text-amber-300 border-amber-500/30"
                                                )}
                                            >
                                                {user.isVerified ? "VERIFIED" : "UNVERIFIED"}
                                            </span>
                                        </div>
                                        <p className="text-xs text-neutral-300/80 mt-1">Rating: {typeof user.rating === 'object' ? user.rating.rating : user.rating}</p>
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
                                        className="w-full justify-start gap-2 text-red-300 hover:text-red-200"
                                    >
                                        <LogOut className="w-4 h-4" />
                                        Sign Out
                                    </Button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-2">
                                    <Link href="/auth/login" onClick={() => setIsMenuOpen(false)}>
                                        <Button variant="secondary" className="w-full justify-center">{t('login')}</Button>
                                    </Link>
                                    <Link href="/auth/signup" onClick={() => setIsMenuOpen(false)}>
                                        <Button className="w-full justify-center">{t('signup')}</Button>
                                    </Link>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </nav>
    );
};
