"use client";

import React, { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link, usePathname, useRouter } from '@/i18n/routing';
import { Button } from '@/components/ui/Button';
import clsx from 'clsx';
import { useLocale } from 'next-intl';
import { useAuth } from '@/hooks/useAuth';
import { 
  User, 
  LogOut, 
  Settings, 
  ChevronDown, 
  Globe, 
  Menu, 
  X, 
  LayoutDashboard, 
  Trophy, 
  Bell, 
  FileText, 
  ShieldCheck,
  History,
  Medal,
  BookOpen,
  HelpCircle,
  ScrollText,
  Home,
  Gamepad2,
  Puzzle,
  Users
} from 'lucide-react';
import Image from 'next/image';
import { useTournamentNotifications } from '@/hooks/useTournamentNotifications';

export const Navbar: React.FC = () => {
    const t = useTranslations('nav');
    const pathname = usePathname();
    const router = useRouter();
    const locale = useLocale();
    const { user, logout } = useAuth();
    const isGuest =
        user?.accountType === 'GUEST' ||
        (user?.phoneNumber?.startsWith('GUEST_') ?? false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const [isBellOpen, setIsBellOpen] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);
    const userMenuRef = useRef<HTMLDivElement | null>(null);
    const bellRef = useRef<HTMLDivElement | null>(null);

    const { notifications, unreadCount, markRead, markAllRead } =
        useTournamentNotifications();

    if (pathname.startsWith('/admin')) return null;

    const navLinks = [
        { name: t('home'), href: '/', icon: Home },
        { name: t('play'), href: '/game/setup-online', icon: Gamepad2 },
        { name: t('history'), href: '/profile/history', icon: History },
        { name: t('leaderboard'), href: '/leaderboard', icon: Medal },
        { name: t('tournaments'), href: '/community/tournament', icon: Trophy },
        { name: t('puzzles'), href: '/puzzles', icon: Puzzle },
        { name: t('community'), href: '/community', icon: Users },
        { name: t('learn'), href: '/learn', icon: BookOpen },
        { name: t('support'), href: '/support', icon: HelpCircle },
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
        setIsBellOpen(false);
    }, [pathname]);

    useEffect(() => {
        if (!isBellOpen) return;
        const onPointerDown = (event: PointerEvent) => {
            const target = event.target as Node | null;
            if (!target) return;
            if (bellRef.current?.contains(target)) return;
            setIsBellOpen(false);
        };
        document.addEventListener('pointerdown', onPointerDown);
        return () => document.removeEventListener('pointerdown', onPointerDown);
    }, [isBellOpen]);

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
                'sticky top-0 z-50 w-full transition-all duration-300 lg:hidden',
                isScrolled
                    ? 'border-b border-white/5 bg-[var(--background)] shadow-[0_12px_40px_rgba(0,0,0,0.35)]'
                    : 'border-b border-white/5 bg-[var(--background)]'
            )}
        >
            <div className="mx-auto px-4">
                <div className="flex items-center justify-between h-16 relative">
                    {/* Left: Profile / Login */}
                    <div className="flex-1 flex items-center justify-start">
                        {user && !isGuest ? (
                            <Link href="/profile" className="flex items-center justify-center w-11 h-11 rounded-xl border border-white/10 bg-surface hover:bg-surface-elevated transition-colors">
                                <User className="w-6 h-6 text-[var(--primary)]" />
                            </Link>
                        ) : (
                            <Link href="/auth/login" className="flex items-center justify-center px-4 h-11 rounded-xl border border-white/10 bg-surface text-sm font-bold text-foreground">
                                {t('login')}
                            </Link>
                        )}
                    </div>

                    {/* Center: Branding */}
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                        <Link href="/" className="flex items-center pointer-events-auto">
                            <div className="relative w-32 h-10">
                                <Image
                                    src="/logo/tzdraft-logo-transparent.png"
                                    alt="TzDraft"
                                    fill
                                    className="object-contain"
                                    priority
                                />
                            </div>
                        </Link>
                    </div>

                    {/* Right: Notifications & Menu */}
                    <div className="flex-1 flex items-center justify-end gap-2">
                        {user && !isGuest && (
                            <div className="relative" ref={bellRef}>
                                <button
                                    onClick={() => { setIsBellOpen((v) => !v); }}
                                    className="relative flex items-center justify-center w-11 h-11 rounded-xl border border-white/10 bg-surface hover:bg-surface-elevated transition-colors text-[var(--primary)]"
                                    aria-label="Notifications"
                                >
                                    <Bell className="w-6 h-6" />
                                    {unreadCount > 0 && (
                                        <span className="absolute top-1.5 right-1.5 min-w-[16px] h-[16px] flex items-center justify-center rounded-full bg-danger text-white text-[9px] font-black border-2 border-surface">
                                            {unreadCount > 9 ? '9+' : unreadCount}
                                        </span>
                                    )}
                                </button>

                                {isBellOpen && (
                                    <div className="absolute right-0 mt-3 w-80 rounded-2xl border border-white/10 bg-[var(--background)]/95 backdrop-blur-md shadow-[0_18px_60px_rgba(0,0,0,0.55)] overflow-hidden z-[90]">
                                        <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
                                            <p className="text-sm font-semibold text-white">Notifications</p>
                                            {unreadCount > 0 && (
                                                <button
                                                    onClick={() => markAllRead()}
                                                    className="text-xs text-[var(--primary)] hover:text-amber-300 transition-colors"
                                                >
                                                    Mark all read
                                                </button>
                                            )}
                                        </div>
                                        <div className="max-h-80 overflow-y-auto divide-y divide-white/5">
                                            {notifications.length === 0 ? (
                                                <p className="px-4 py-6 text-sm text-neutral-400 text-center">No notifications yet</p>
                                            ) : (
                                                notifications.slice(0, 10).map((n) => (
                                                    <button
                                                        key={n.id}
                                                        onClick={() => { if (!n.read) markRead(n.id); }}
                                                        className={clsx(
                                                            'w-full text-left px-4 py-3 hover:bg-white/5 transition-colors',
                                                            !n.read && 'bg-[var(--primary)]/5',
                                                        )}
                                                    >
                                                        <div className="flex items-start gap-2">
                                                            {!n.read && (
                                                                <span className="mt-1.5 shrink-0 w-2 h-2 rounded-full bg-[var(--primary)]" />
                                                            )}
                                                            <div className={clsx(!n.read ? '' : 'pl-4')}>
                                                                <p className="text-sm font-semibold text-white leading-snug">{n.title}</p>
                                                                <p className="text-xs text-neutral-400 mt-0.5 leading-relaxed">{n.body}</p>
                                                                <p className="text-[10px] text-neutral-500 mt-1">
                                                                    {new Date(n.createdAt).toLocaleString()}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </button>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                        <button
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            className="flex items-center justify-center w-11 h-11 rounded-xl border border-white/10 bg-surface hover:bg-surface-elevated transition-colors text-[var(--primary)]"
                            aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
                        >
                            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Menu (Full-page slide-in from Right) */}
            <div
                className={clsx(
                    'lg:hidden fixed inset-0 z-[100] transition-opacity duration-500 ease-out',
                    isMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
                )}
                aria-hidden={!isMenuOpen}
            >
                {/* Overlay Backdrop */}
                <div
                    onClick={() => setIsMenuOpen(false)}
                    className={clsx(
                        'absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-500 ease-out',
                        isMenuOpen ? 'opacity-100' : 'opacity-0'
                    )}
                />

                {/* Slide panel */}
                <div
                    className={clsx(
                        'absolute inset-y-0 right-0 w-[80%] max-w-sm transform transition-transform duration-500 ease-[cubic-bezier(0.22,0.61,0.36,1)] will-change-transform',
                        isMenuOpen ? 'translate-x-0' : 'translate-x-full'
                    )}
                    role="dialog"
                    aria-modal="true"
                >
                    <div className="h-full w-full border-l border-white/10 bg-[var(--background)] shadow-[-30px_0_120px_rgba(0,0,0,0.75)] flex flex-col">
                        {/* Drawer Header */}
                        <div className="px-5 h-16 border-b border-white/10 flex items-center justify-between shrink-0">
                            <span className="text-lg font-black text-foreground">Menu</span>
                            <button
                                onClick={() => setIsMenuOpen(false)}
                                className="p-2 text-[var(--primary)]"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Drawer Content */}
                        <div className="flex-1 overflow-y-auto pb-24">
                            {/* Account Section */}
                            <div className="px-5 py-6 border-b border-white/10">
                                {user && !isGuest ? (
                                    <Link 
                                        href="/profile" 
                                        onClick={() => setIsMenuOpen(false)}
                                        className="flex items-center gap-4 group"
                                    >
                                        <div className="w-14 h-14 rounded-full bg-surface-elevated flex items-center justify-center border border-border-strong overflow-hidden">
                                            <User className="w-8 h-8 text-[var(--primary)]" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-base font-black text-foreground truncate group-hover:text-[var(--primary)] transition-colors">
                                                {user.displayName || user.username}
                                            </p>
                                            <p className="text-xs text-text-muted truncate">{user.email || `@${user.username}`}</p>
                                        </div>
                                    </Link>
                                ) : (
                                    <div className="space-y-3">
                                        <Link href="/auth/login" onClick={() => setIsMenuOpen(false)} className="block">
                                            <Button className="w-full h-12 rounded-xl font-black">Login</Button>
                                        </Link>
                                        <Link href="/auth/signup" onClick={() => setIsMenuOpen(false)} className="block">
                                            <Button variant="secondary" className="w-full h-12 rounded-xl font-black border border-[var(--primary)]/30 text-[var(--primary)]">Sign Up</Button>
                                        </Link>
                                    </div>
                                )}
                            </div>

                            {/* Nav Section */}
                            <div className="px-3 py-4 space-y-1">
                                {navLinks.map((link) => (
                                    <Link
                                        key={link.name}
                                        href={link.href}
                                        className={clsx(
                                            "flex items-center gap-4 px-4 py-3 rounded-2xl text-base font-bold transition-all group",
                                            isActive(link.href)
                                                ? "bg-[var(--primary)] text-black"
                                                : "text-text-secondary hover:text-white hover:bg-white/5"
                                        )}
                                        onClick={() => setIsMenuOpen(false)}
                                    >
                                        <link.icon className={clsx("w-5 h-5", isActive(link.href) ? "text-black" : "text-neutral-500 group-hover:text-white")} />
                                        {link.name}
                                    </Link>
                                ))}
                            </div>

                            {/* Divider */}
                            <div className="mx-6 h-px bg-white/5 my-2" />

                            {/* Legal Section */}
                            <div className="px-3 py-4 space-y-1">
                                <Link href="/rules" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-4 px-4 py-2.5 text-sm font-bold text-text-muted hover:text-foreground">
                                    <FileText className="w-5 h-5" />
                                    {t("rules")}
                                </Link>
                                <Link href="/terms" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-4 px-4 py-2.5 text-sm font-bold text-text-muted hover:text-foreground">
                                    <ScrollText className="w-5 h-5" />
                                    {t("terms")}
                                </Link>
                                <Link href="/privacy" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-4 px-4 py-2.5 text-sm font-bold text-text-muted hover:text-foreground">
                                    <ShieldCheck className="w-5 h-5" />
                                    {t("privacy")}
                                </Link>
                            </div>

                            {/* Language Section */}
                            <div className="px-5 py-6 border-t border-white/5 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Globe className="w-5 h-5 text-text-muted" />
                                    <span className="text-sm font-bold text-text-secondary">Language</span>
                                </div>
                                <button
                                    onClick={toggleLanguage}
                                    className="px-3 py-1.5 rounded-lg border border-white/10 bg-surface text-xs font-black text-[var(--primary)] uppercase tracking-widest"
                                >
                                    {locale === 'sw' ? 'SW' : 'EN'}
                                </button>
                            </div>
                        </div>

                        {/* Logout at Bottom */}
                        {user && !isGuest && (
                            <div className="p-5 border-t border-white/10 bg-[var(--background)]">
                                <button
                                    onClick={handleLogout}
                                    className="flex items-center gap-3 w-full px-4 py-3 rounded-2xl text-base font-bold text-danger hover:bg-danger/10 transition-all"
                                >
                                    <LogOut className="w-5 h-5" />
                                    Logout
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
};
