"use client";

import React from "react";
import { Link, usePathname } from "@/i18n/routing";
import { 
  Gamepad2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

export function BottomNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  const isGuest = user?.accountType === "GUEST";

  const isHomePage = pathname === "/";


  const handlePlayClick = (e: React.MouseEvent) => {
    if (!user || isGuest) {
      e.preventDefault();
      const loginUrl = `/auth/login?callbackUrl=${encodeURIComponent("/game/setup-online")}`;
      window.location.href = loginUrl;
    }
  };

  if (!isHomePage) return null;

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-[60] pb-safe">
      {/* Glossy Backdrop */}
      <div className="absolute inset-0 bg-[var(--background)]/80 backdrop-blur-xl border-t border-white/10 shadow-[0_-10px_40px_rgba(0,0,0,0.4)]" />
      
      <nav className="relative flex items-center justify-around h-16 px-4">
        <Link
          href="/game/setup-online"
          onClick={handlePlayClick}
          className="flex items-center justify-center gap-3 w-full h-12 rounded-xl bg-[var(--primary)] text-black font-black uppercase tracking-[0.2em] shadow-[0_8px_30px_rgba(245,158,11,0.4)] active:scale-[0.98] transition-all"
        >
          <Gamepad2 className="w-6 h-6" />
          <span className="text-sm">Play Online</span>
        </Link>
      </nav>
    </div>
  );
}
