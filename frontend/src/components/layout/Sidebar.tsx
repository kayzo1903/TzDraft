"use client";

import React from "react";
import { Link, usePathname } from "@/i18n/routing";
import { useTranslations, useLocale } from "next-intl";
import { useAuth } from "@/hooks/useAuth";
import { 
  Home, 
  Users, 
  Trophy, 
  User, 
  Settings, 
  LogOut, 
  LayoutDashboard,
  Gamepad2,
  Sword,
  Bell,
  History,
  Medal,
  BookOpen,
  BookMarked,
  HelpCircle,
  ShieldCheck,
  FileText,
  ScrollText,
  ExternalLink,
  Globe
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { useTournamentNotifications } from "@/hooks/useTournamentNotifications";
import Image from "next/image";
import { useRouter } from "@/i18n/routing";

export function Sidebar() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const router = useRouter();
  const locale = useLocale();
  const { user, logout } = useAuth();
  const { unreadCount } = useTournamentNotifications();

  const toggleLanguage = () => {
    const nextLocale = locale === "sw" ? "en" : "sw";
    router.replace(pathname, { locale: nextLocale });
  };

  const isActive = (href: string) => {
    if (href === "/" && pathname !== "/") return false;
    return pathname.startsWith(href);
  };

  const navLinks = [
    { name: t("home"), href: "/", icon: Home },
    { name: t("play"), href: "/game/setup-online", icon: Gamepad2 },
    { name: t("history"), href: "/game/history", icon: History },
    { name: t("leaderboard"), href: "/leaderboard", icon: Medal },
    { name: t("tournaments"), href: "/community/tournament", icon: Trophy },
    { name: t("community"), href: "/community", icon: Users },
    { name: t("learn"), href: "/learn", icon: BookOpen },
    { name: t("support"), href: "/support", icon: HelpCircle },
  ];

  const legalLinks = [
    { name: t("rules"), href: "/rules", icon: FileText },
    { name: t("privacy"), href: "/privacy", icon: ShieldCheck },
    { name: t("terms"), href: "/terms", icon: ScrollText },
    { name: t("website"), href: "https://tzdraft.co.tz", icon: ExternalLink },
  ];

  return (
    <aside className="hidden lg:flex w-72 flex-col border-r border-white/5 bg-[var(--background)] p-6 sticky top-0 h-screen overflow-y-auto">
      <div className="flex flex-col h-full">
        
        {/* Logo Section */}
        <Link href="/" className="flex items-center gap-3 mb-10 px-2">
          <div className="relative w-10 h-10">
            <Image
              src="/logo/tzdraft-logo-transparent.png"
              alt="TzDraft"
              fill
              sizes="40px"
              className="object-contain"
              priority
            />
          </div>
          <span className="text-2xl font-black tracking-tight bg-gradient-to-r from-[var(--primary)] via-amber-300 to-[var(--primary)] bg-clip-text text-transparent">
            TzDraft
          </span>
        </Link>

        {/* Navigation Section */}
        <div className="space-y-1">
          <p className="px-3 mb-4 text-[10px] font-black uppercase tracking-[0.25em] text-neutral-500">
            Navigation
          </p>
          {navLinks.map((link) => (
            <Link
              key={link.name}
              href={link.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all duration-200 group",
                isActive(link.href)
                  ? "bg-[var(--primary)] text-black"
                  : "text-neutral-400 hover:text-white hover:bg-white/5"
              )}
            >
              <link.icon className={cn("w-5 h-5", isActive(link.href) ? "text-black" : "text-neutral-500 group-hover:text-white")} />
              {link.name}
            </Link>
          ))}
          
          {user && (
            <Link
              href="/game/studies"
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all duration-200 group",
                isActive("/game/studies")
                  ? "bg-[var(--primary)] text-black"
                  : "text-neutral-400 hover:text-white hover:bg-white/5"
              )}
            >
              <BookMarked className={cn("w-5 h-5", isActive("/game/studies") ? "text-black" : "text-neutral-500 group-hover:text-white")} />
              {t("studies")}
            </Link>
          )}
        </div>

        {/* User Section (if logged in) */}
        {user ? (
          <div className="mt-10 space-y-1">
            <p className="px-3 mb-4 text-[10px] font-black uppercase tracking-[0.25em] text-neutral-500">
              Account
            </p>
            <Link
              href="/profile"
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all",
                isActive("/profile")
                  ? "bg-[var(--primary)] text-black"
                  : "text-neutral-400 hover:text-white hover:bg-white/5"
              )}
            >
              <User className="w-5 h-5" />
              Profile
            </Link>
            <Link
              href="/notifications"
              className={cn(
                "flex items-center justify-between gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all",
                isActive("/notifications")
                  ? "bg-[var(--primary)] text-black"
                  : "text-neutral-400 hover:text-white hover:bg-white/5"
              )}
            >
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5" />
                Notifications
              </div>
              {unreadCount > 0 && (
                <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[var(--primary)] px-1 text-[10px] font-black text-black">
                  {unreadCount}
                </span>
              )}
            </Link>
            <Link
              href="/settings"
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all",
                isActive("/settings")
                  ? "bg-[var(--primary)] text-black"
                  : "text-neutral-400 hover:text-white hover:bg-white/5"
              )}
            >
              <Settings className="w-5 h-5" />
              Settings
            </Link>
            {user.role === "ADMIN" && (
              <Link
                href="/admin"
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all",
                  isActive("/admin")
                    ? "bg-warning text-black"
                    : "text-warning/80 hover:text-warning hover:bg-warning/10"
                )}
              >
                <LayoutDashboard className="w-5 h-5" />
                Admin Panel
              </Link>
            )}
            <button
              onClick={() => logout()}
              className="flex items-center gap-3 w-full px-4 py-3 rounded-2xl text-sm font-bold text-danger/80 hover:text-danger hover:bg-danger/10 transition-all"
            >
              <LogOut className="w-5 h-5" />
              Sign Out
            </button>
          </div>
        ) : (
          <div className="mt-10 pt-6 grid grid-cols-1 gap-2 border-t border-white/5">
            <Link href="/auth/login">
              <Button variant="outline" className="w-full rounded-2xl border-white/10 text-white hover:bg-white/5">
                Login
              </Button>
            </Link>
            <Link href="/auth/signup">
              <Button className="w-full rounded-2xl font-black">
                Sign Up
              </Button>
            </Link>
          </div>
        )}

        {/* Legal Section */}
        <div className="mt-10 space-y-1">
          <p className="px-3 mb-4 text-[10px] font-black uppercase tracking-[0.25em] text-neutral-500">
            Legal
          </p>
          {legalLinks.map((link) => (
            <Link
              key={link.name}
              href={link.href}
              target={link.href.startsWith("http") ? "_blank" : undefined}
              className="flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold text-neutral-500 hover:text-neutral-300 transition-all"
            >
              <link.icon className="w-4 h-4" />
              {link.name}
            </Link>
          ))}
        </div>

        {/* Preferences Section */}
        <div className="mt-10 space-y-1 pb-10">
          <p className="px-3 mb-4 text-[10px] font-black uppercase tracking-[0.25em] text-neutral-500">
            Preferences
          </p>
          <button
            onClick={toggleLanguage}
            className="flex items-center justify-between w-full px-4 py-3 rounded-2xl text-sm font-bold text-neutral-400 hover:text-white hover:bg-white/5 transition-all group"
          >
            <div className="flex items-center gap-3">
              <Globe className="w-4 h-4 text-neutral-500 group-hover:text-white" />
              Language
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest bg-white/5 px-2 py-1 rounded-lg text-[var(--primary)] group-hover:bg-[var(--primary)] group-hover:text-black transition-all">
              {locale === "sw" ? "SW" : "EN"}
            </span>
          </button>
        </div>

      </div>
    </aside>
  );
}
