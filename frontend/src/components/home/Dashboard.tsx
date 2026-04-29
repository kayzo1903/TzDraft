"use client";

import React, { useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/routing";
import { ServiceCard } from "@/components/ui/ServiceCard";
import { FriendsStrip } from "@/components/social/FriendsStrip";
import { gameService } from "@/services/game.service";
import { historyService, GameHistoryItem } from "@/services/history.service";
import { socialService, SocialUser } from "@/services/social.service";
import { useAuthStore } from "@/lib/auth/auth-store";
import { 
  Trophy, 
  Play, 
  Gamepad2, 
  BarChart3, 
  BookOpen, 
  Clock, 
  ChevronRight,
  Loader2,
  Swords,
  Puzzle
} from "lucide-react";
import { cn } from "@/lib/utils";

const CARD_COLORS = {
  online: "#3b82f6", // blue
  ai: "#8b5cf6", // violet
  friend: "#10b981", // emerald
  freePlay: "#06b6d4", // cyan
  learn: "#f59e0b", // amber
  tournaments: "#eab308", // gold
  history: "#6366f1", // indigo
  leaderboard: "#ec4899", // pink
  puzzles: "#f43f5e", // rose
} as const;

export function Dashboard() {
  const t = useTranslations("hero");
  const tc = useTranslations("common");
  const locale = useLocale();
  const { user, isAuthenticated } = useAuthStore();

  const [activeGame, setActiveGame] = useState<{ id: string; gameType: string } | null>(null);
  const [recentGames, setRecentGames] = useState<GameHistoryItem[]>([]);
  const [friends, setFriends] = useState<SocialUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [active, history, friendsData] = await Promise.all([
          isAuthenticated ? gameService.getActiveGame() : Promise.resolve(null),
          isAuthenticated ? historyService.getHistory(0, 5) : Promise.resolve({ items: [] }),
          isAuthenticated ? socialService.getFriends() : Promise.resolve([]),
        ]);
        setActiveGame(active);
        setRecentGames(history.items);
        setFriends(friendsData);
      } catch (err) {
        console.error("Failed to fetch dashboard data:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [isAuthenticated]);

  return (
    <main className="flex flex-col bg-[var(--background)] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-6xl space-y-10">
        
        {/* --- Header / Welcome --- */}
        <div className="flex flex-col gap-2">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--primary)]">
            {isAuthenticated 
              ? (locale === "sw" ? "Karibu Tena" : "Welcome Back")
              : (locale === "sw" ? "Karibu TzDraft" : "Welcome to TzDraft")}
          </p>
          <h1 className="text-3xl font-black text-white sm:text-4xl">
            {user?.displayName || user?.username || (locale === "sw" ? "Mchezaji" : "Guest Player")}
          </h1>
        </div>

        {/* --- Active Game Banner --- */}
        {activeGame && (
          <div className="overflow-hidden rounded-[1.5rem] border border-orange-500/20 bg-orange-500/10 p-5 shadow-[0_20px_50px_rgba(249,115,22,0.1)]">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 animate-pulse items-center justify-center rounded-full bg-orange-500/20 text-orange-400">
                  <Gamepad2 size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-black text-white">
                    {locale === "sw" ? "Mechi Inaendelea" : "Match in Progress"}
                  </h2>
                  <p className="text-xs text-orange-200/60 uppercase tracking-widest font-bold">
                    {activeGame.gameType}
                  </p>
                </div>
              </div>
              <Link href={`/game/${activeGame.id}`} className="inline-flex">
                <button className="flex w-full items-center justify-center gap-2 rounded-2xl bg-orange-500 px-6 py-3 text-sm font-black text-black hover:opacity-90 sm:w-auto">
                  {locale === "sw" ? "Rudi Kwenye Mchezo" : "Rejoin Game"}
                  <ChevronRight size={16} />
                </button>
              </Link>
            </div>
          </div>
        )}

        {/* --- Core Actions Grid --- */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <ServiceCard
            title={locale === "sw" ? "Cheza Mtandaoni" : "Play Online"}
            subtitle={locale === "sw" ? "Pambana na wachezaji duniani kote" : "Test your skills against players worldwide"}
            href="/game/setup-online"
            iconColor={CARD_COLORS.online}
            icon="🌐"
            badge={locale === "sw" ? "Maarufu" : "Popular"}
          />
          <ServiceCard
            title={locale === "sw" ? "Cheza na AI" : "Play vs AI"}
            subtitle={locale === "sw" ? "Pambana na engine yetu yenye nguvu" : "Challenge our top-tier neural engine"}
            href="/game/setup-ai"
            iconColor={CARD_COLORS.ai}
            icon="🤖"
          />
          <ServiceCard
            title={locale === "sw" ? "Cheza na Rafiki" : "Play vs Friend"}
            subtitle={locale === "sw" ? "Mechi za binafsi au za mwaliko" : "Local or private online matches"}
            href="/game/setup-friend"
            iconColor={CARD_COLORS.friend}
            icon="🤝"
          />
        </section>

        {/* --- Friends Strip --- */}
        {isAuthenticated && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black text-white">{locale === "sw" ? "Marafiki" : "Friends"}</h2>
              <Link href="/community/friends" className="text-xs font-bold uppercase tracking-widest text-neutral-500 hover:text-[var(--primary)]">
                {locale === "sw" ? "Ona Yote" : "See All"}
              </Link>
            </div>
            {friends.length > 0 ? (
              <FriendsStrip initialFriends={friends} />
            ) : (
              <p className="text-xs font-bold text-neutral-600">
                {locale === "sw" ? "Hakuna marafiki bado" : "No friends yet"}
              </p>
            )}
          </section>
        )}

        {/* --- Secondary Actions & History --- */}
        <div className="grid gap-8 lg:grid-cols-[1fr_0.4fr]">
          <div className="grid gap-4 sm:grid-cols-2">
            <ServiceCard
              title={locale === "sw" ? "Cheza Huru" : "Free Play"}
              subtitle={locale === "sw" ? "Dhibiti pande zote mbili mwenyewe" : "Control both sides, manual board flip"}
              href="/game/local-pvp?passDevice=0"
              iconColor={CARD_COLORS.freePlay}
              icon="♟️"
            />
            <ServiceCard
              title={locale === "sw" ? "Jifunze zaidi" : "Learn & Master"}
              subtitle={locale === "sw" ? "Soma mbinu na sheria rasmi" : "Study tactics, rules, and gamebooks"}
              href="/learn"
              iconColor={CARD_COLORS.learn}
              icon="📚"
            />
            <ServiceCard
              title={locale === "sw" ? "Mashindano" : "Tournaments"}
              subtitle={locale === "sw" ? "Jiunge na mashindano ya ubingwa" : "Join official prize tournaments"}
              href="/community/tournament"
              iconColor={CARD_COLORS.tournaments}
              icon="🏆"
            />
            <ServiceCard
              title={locale === "sw" ? "Orodha ya Ubora" : "Leaderboard"}
              subtitle={locale === "sw" ? "Ona wachezaji bora duniani" : "View global rankings and top players"}
              href="/leaderboard"
              iconColor={CARD_COLORS.leaderboard}
              icon="🏅"
            />
            <ServiceCard
              title={t("featureGrid.puzzles.title")}
              subtitle={t("featureGrid.puzzles.desc")}
              href="/puzzles"
              iconColor={CARD_COLORS.puzzles}
              icon={<Puzzle size={24} />}
              badge={locale === "sw" ? "Mpya" : "New"}
            />
          </div>

          {/* --- Recent Results --- */}
          {isAuthenticated && (
            <section className="flex flex-col gap-4 rounded-[1.5rem] border border-white/5 bg-white/[0.02] p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-black uppercase tracking-widest text-neutral-400">
                  {locale === "sw" ? "Matokeo ya Karibuni" : "Recent Results"}
                </h2>
                <Clock size={14} className="text-neutral-600" />
              </div>

              <div className="flex flex-col gap-3">
                {recentGames.length > 0 ? (
                  <>
                    {/* Small screen: Compact boxes (Current design) */}
                    <div className="flex flex-wrap gap-2 lg:hidden">
                      {recentGames.map((game) => (
                        <div
                          key={game.id}
                          className={cn(
                            "flex h-10 w-10 items-center justify-center rounded-xl border text-sm font-black",
                            game.result === "WIN" 
                              ? "border-win/20 bg-win/10 text-win" 
                              : game.result === "LOSS"
                              ? "border-danger/20 bg-danger/10 text-danger"
                              : "border-white/10 bg-white/5 text-neutral-400"
                          )}
                          title={`${game.gameType} vs ${game.opponent?.displayName || "AI"}`}
                        >
                          {game.result === "WIN" ? "W" : game.result === "LOSS" ? "L" : "D"}
                        </div>
                      ))}
                    </div>

                    {/* Large screen: Detailed list */}
                    <div className="hidden lg:flex lg:flex-col lg:gap-2">
                      {recentGames.map((game) => (
                        <Link key={game.id} href={`/game/${game.id}`} className="flex items-center justify-between rounded-xl border border-white/5 bg-white/5 p-3 transition hover:bg-white/10">
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-white truncate max-w-[120px]">
                              {game.opponent?.displayName || "AI"}
                            </span>
                            <span className="text-[10px] font-black uppercase text-neutral-500">
                              {game.gameType}
                            </span>
                          </div>
                          <div
                            className={cn(
                              "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border text-xs font-black",
                              game.result === "WIN" 
                                ? "border-win/20 bg-win/10 text-win" 
                                : game.result === "LOSS"
                                ? "border-danger/20 bg-danger/10 text-danger"
                                : "border-white/10 bg-white/5 text-neutral-400"
                            )}
                          >
                            {game.result === "WIN" ? "W" : game.result === "LOSS" ? "L" : "D"}
                          </div>
                        </Link>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="py-4 text-xs font-bold text-neutral-600">
                    {locale === "sw" ? "Hakuna mechi bado" : "No games played yet"}
                  </p>
                )}
              </div>

              <Link href="/profile/history" className="mt-auto pt-4">
                <button className="flex w-full items-center justify-center gap-2 rounded-xl bg-white/5 py-3 text-xs font-black text-white hover:bg-white/10">
                  {locale === "sw" ? "Historia Kamili" : "Full History"}
                  <ChevronRight size={14} />
                </button>
              </Link>
            </section>
          )}
        </div>

      </div>
      <div className="h-10" /> {/* Spacer */}
    </main>
  );
}
