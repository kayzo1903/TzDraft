"use client";

import { useEffect, useState } from "react";
import { useRouter } from "@/i18n/routing";
import { gameService, LiveGameEntry } from "@/services/game.service";
import { useAuthStore } from "@/lib/auth/auth-store";
import { Eye, Users, Clock, RefreshCw, ChevronRight, Radio } from "lucide-react";
import clsx from "clsx";

/* ─── Helpers ───────────────────────────────────────────────────────────── */

const formatTime = (ms: number): string => {
  const mins = Math.round(ms / 60000);
  return mins >= 60 ? `${Math.floor(mins / 60)}h` : `${mins}m`;
};

const formatMoveDuration = (startedAt: string | null, moveCount: number): string => {
  if (!startedAt || moveCount === 0) return "Just started";
  const elapsed = Date.now() - new Date(startedAt).getTime();
  const mins = Math.floor(elapsed / 60000);
  if (mins < 1) return "Just started";
  if (mins < 60) return `${mins}m in`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m in`;
};

/* ─── Game Card ─────────────────────────────────────────────────────────── */

function GameCard({ game, onClick }: { game: LiveGameEntry; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        "w-full text-left rounded-2xl border bg-neutral-900 hover:bg-neutral-800/80 transition-all group",
        game.isFollowing
          ? "border-orange-500/40 shadow-[0_0_20px_rgba(249,115,22,0.08)]"
          : "border-neutral-700/60",
      )}
    >
      <div className="p-4 flex flex-col gap-3">
        {/* Players row */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-col gap-1 min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-white border border-neutral-600 shrink-0" />
              <span className="font-semibold text-white truncate">{game.whiteName}</span>
              <span className="text-xs text-neutral-500 shrink-0">{game.whiteRating}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-neutral-800 border border-neutral-600 shrink-0" />
              <span className="font-semibold text-white truncate">{game.blackName}</span>
              <span className="text-xs text-neutral-500 shrink-0">{game.blackRating}</span>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1 shrink-0">
            <div className="flex items-center gap-1.5 text-xs text-neutral-400">
              <Clock className="w-3 h-3" />
              <span>{formatTime(game.initialTimeMs)}</span>
            </div>
            <div className="text-xs text-neutral-500">
              {game.moveCount} moves
            </div>
            <div className="text-[10px] text-neutral-600">
              {formatMoveDuration(game.startedAt, game.moveCount)}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {game.isFollowing && (
              <span className="inline-flex items-center gap-1 rounded-full border border-orange-500/30 bg-orange-500/10 px-2 py-0.5 text-[10px] font-semibold text-orange-400">
                <Users className="w-3 h-3" />
                Following
              </span>
            )}
            <span className="inline-flex items-center gap-1 rounded-full border border-neutral-700 bg-neutral-800 px-2 py-0.5 text-[10px] text-neutral-400">
              <Radio className="w-3 h-3 text-emerald-400" />
              LIVE
            </span>
          </div>
          <div className="flex items-center gap-1 text-xs text-neutral-500 group-hover:text-orange-400 transition-colors">
            <Eye className="w-3.5 h-3.5" />
            Watch
            <ChevronRight className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>
    </button>
  );
}

/* ─── Skeleton ──────────────────────────────────────────────────────────── */

function GameCardSkeleton() {
  return (
    <div className="w-full rounded-2xl border border-neutral-800 bg-neutral-900/40 p-4 flex flex-col gap-4 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-2 flex-1">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-neutral-800" />
            <div className="w-24 h-4 bg-neutral-800 rounded" />
          </div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-neutral-800" />
            <div className="w-20 h-4 bg-neutral-800 rounded" />
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="w-12 h-3 bg-neutral-800 rounded" />
          <div className="w-16 h-3 bg-neutral-800 rounded" />
        </div>
      </div>
      <div className="flex items-center justify-between border-t border-neutral-800/50 pt-3">
        <div className="w-16 h-4 bg-neutral-800 rounded-full" />
        <div className="w-20 h-4 bg-neutral-800 rounded-full" />
      </div>
    </div>
  );
}

/* ─── Empty State ───────────────────────────────────────────────────────── */

function EmptySection({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 px-6 py-8 text-center text-sm text-neutral-500">
      {message}
    </div>
  );
}

/* ─── Page ──────────────────────────────────────────────────────────────── */

export default function WatchLobbyPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [games, setGames] = useState<LiveGameEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadGames = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const data = await gameService.getLiveGames();
      setGames(data);
      setLastUpdated(new Date());
    } catch {
      // keep previous data on error
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadGames();
    const interval = setInterval(() => loadGames(true), 30_000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  const followingGames = games.filter((g) => g.isFollowing);
  const otherGames = games.filter((g) => !g.isFollowing);

  const handleWatch = (gameId: string) => {
    router.push(`/watch/${gameId}`);
  };

  return (
    <main className="min-h-screen max-w-2xl mx-auto px-4 py-8 flex flex-col gap-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <Radio className="w-6 h-6 text-emerald-400" />
            Watch Live
          </h1>
          {lastUpdated && (
            <p className="text-xs text-neutral-500 mt-1">
              Updated {lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </p>
          )}
        </div>
        <button
          onClick={() => loadGames(true)}
          disabled={refreshing}
          className="flex items-center gap-1.5 rounded-xl border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-neutral-300 hover:bg-neutral-700 transition disabled:opacity-50"
        >
          <RefreshCw className={clsx("w-4 h-4", refreshing && "animate-spin")} />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col gap-4">
          {[1, 2, 3, 4].map((i) => (
            <GameCardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <>
          {/* Following section — only shown when authenticated and there are results */}
          {isAuthenticated && (
            <section className="flex flex-col gap-3">
              <h2 className="text-sm font-bold text-neutral-400 uppercase tracking-widest flex items-center gap-2">
                <Users className="w-4 h-4" />
                Following
              </h2>
              {followingGames.length === 0 ? (
                <EmptySection message="Players you follow aren't live right now. Find people to follow from their profiles." />
              ) : (
                followingGames.map((g) => (
                  <GameCard key={g.id} game={g} onClick={() => handleWatch(g.id)} />
                ))
              )}
            </section>
          )}

          {/* All live games */}
          <section className="flex flex-col gap-3">
            <h2 className="text-sm font-bold text-neutral-400 uppercase tracking-widest flex items-center gap-2">
              <Radio className="w-4 h-4 text-emerald-400" />
              {isAuthenticated ? "Other Live Games" : "Live Games"}
            </h2>
            {otherGames.length === 0 && followingGames.length === 0 ? (
              <EmptySection message="No live games right now. Check back soon!" />
            ) : otherGames.length === 0 ? (
              <EmptySection message="No other live games at the moment." />
            ) : (
              otherGames.map((g) => (
                <GameCard key={g.id} game={g} onClick={() => handleWatch(g.id)} />
              ))
            )}
          </section>
        </>
      )}
    </main>
  );
}
