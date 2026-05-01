"use client";

import React, { useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/routing";
import { gameService, LiveGameEntry } from "@/services/game.service";
import { Radio, Eye, Users, ChevronRight, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export function LiveGamesStrip() {
  const t = useTranslations("nav");
  const locale = useLocale();
  const [games, setGames] = useState<LiveGameEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchLive = async () => {
      try {
        const data = await gameService.getLiveGames();
        setGames(data);
      } catch (err) {
        console.error("Failed to fetch live games for strip:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchLive();
    const interval = setInterval(fetchLive, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  if (isLoading && games.length === 0) return null;
  if (games.length === 0) return null;

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
            <Radio size={18} className="animate-pulse" />
          </div>
          <h2 className="text-xl font-black text-white">
            {locale === "sw" ? "Mechi Mubashara" : "Live Matches"}
          </h2>
        </div>
        <Link 
          href="/watch" 
          className="text-xs font-bold uppercase tracking-widest text-neutral-500 hover:text-[var(--primary)] transition-colors"
        >
          {locale === "sw" ? "Ona Zote" : "See All"}
        </Link>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
        {games.map((game) => (
          <Link
            key={game.id}
            href={`/watch/${game.id}`}
            className="group relative flex min-w-[280px] flex-col gap-4 rounded-[1.5rem] border border-white/5 bg-white/[0.03] p-5 transition-all hover:bg-white/[0.06] hover:border-white/10"
          >
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-black text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                LIVE
              </span>
              <div className="flex items-center gap-1 text-[10px] font-bold text-neutral-500">
                <Clock size={10} />
                {Math.round(game.initialTimeMs / 60000)}m
              </div>
            </div>

            <div className="flex items-center justify-between gap-4">
              <div className="flex flex-1 flex-col items-center gap-2">
                <div className="h-10 w-10 rounded-full bg-white border border-white/10 overflow-hidden" />
                <span className="text-xs font-bold text-white truncate w-full text-center">{game.whiteName}</span>
                <span className="text-[10px] font-black text-neutral-500">{game.whiteRating}</span>
              </div>

              <div className="text-[10px] font-black italic text-neutral-700">VS</div>

              <div className="flex flex-1 flex-col items-center gap-2">
                <div className="h-10 w-10 rounded-full bg-neutral-800 border border-white/10 overflow-hidden" />
                <span className="text-xs font-bold text-white truncate w-full text-center">{game.blackName}</span>
                <span className="text-[10px] font-black text-neutral-500">{game.blackRating}</span>
              </div>
            </div>

            <div className="mt-2 flex items-center justify-between border-t border-white/5 pt-3">
              <span className="text-[10px] font-bold text-neutral-500">
                {game.moveCount} {locale === "sw" ? "hatua" : "moves"}
              </span>
              <div className="flex items-center gap-1 text-xs font-black text-[var(--primary)] group-hover:gap-2 transition-all">
                {locale === "sw" ? "Tazama" : "Watch"}
                <ChevronRight size={14} />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
