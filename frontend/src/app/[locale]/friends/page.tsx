"use client";

import { useMemo, useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "@/i18n/routing";
import { useSocket } from "@/hooks/useSocket";
import {
  FriendSearch,
  FriendList,
  PendingRequests,
  SentRequests,
  FriendlyMatchRequests,
} from "@/components/friend";
import { Bell, RefreshCw, Users, Zap, Swords, UserPlus } from "lucide-react";
import { LoadingScreen } from "@/components/ui/LoadingScreen";

export default function FriendsPage() {
  const { user, isAuthenticated, isHydrated } = useAuth();
  const router = useRouter();
  const socket = useSocket();
  const isLoggedIn = Boolean(user) || isAuthenticated;
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [banner, setBanner] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const lastUpdatedLabel = useMemo(() => {
    if (!lastUpdatedAt) return "Never";
    return lastUpdatedAt.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });
  }, [lastUpdatedAt]);

  useEffect(() => {
    // Wait for store to hydrate before checking authentication
    if (!isHydrated) return;

    if (!isLoggedIn) {
      router.push("/auth/login");
    }
  }, [isHydrated, isLoggedIn, router]);

  useEffect(() => {
    if (!socket) return;

    const onFriendlyMatchInvited = (data: { hostDisplayName?: string }) => {
      const hostName = data?.hostDisplayName || "A friend";
      setBanner(`${hostName} sent you a friendly match request.`);
      setRefreshTrigger((prev: number) => prev + 1);
    };

    const onGameStarted = (data: {
      gameId?: string;
      playerColor?: "WHITE" | "BLACK";
      whiteId?: string | null;
      blackId?: string | null;
    }) => {
      if (!data?.gameId) return;

      const inferredColor =
        data.playerColor ||
        (user?.id && data.whiteId === user.id
          ? "WHITE"
          : user?.id && data.blackId === user.id
            ? "BLACK"
            : undefined);

      if (inferredColor && typeof window !== "undefined") {
        window.sessionStorage.setItem(
          `tzdraft:game:${data.gameId}:color`,
          inferredColor,
        );
      }

      router.push(`/game/${data.gameId}`);
    };

    socket.on("friendlyMatchInvited", onFriendlyMatchInvited);
    socket.on("gameStarted", onGameStarted);
    return () => {
      socket.off("friendlyMatchInvited", onFriendlyMatchInvited);
      socket.off("gameStarted", onGameStarted);
    };
  }, [router, socket, user?.id]);

  // Show loading state while store is hydrating
  if (!isHydrated) {
    return <LoadingScreen />;
  }

  if (!isLoggedIn) {
    return null;
  }

  const handleFriendAdded = () => {
    // Trigger refresh of all friendship panels
    setRefreshTrigger((prev) => prev + 1);
    setLastUpdatedAt(new Date());
  };

  const handleRefresh = () => {
    setRefreshing(true);
    setRefreshTrigger((prev) => prev + 1);
    setLastUpdatedAt(new Date());
    window.setTimeout(() => setRefreshing(false), 500);
  };

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)] px-4 md:px-8 py-10">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="relative overflow-hidden rounded-3xl border border-neutral-800 bg-neutral-900/50 p-6 md:p-8 shadow-2xl">
          <div className="absolute -top-24 right-0 h-56 w-56 rounded-full bg-emerald-500/10 blur-[80px]" />
          <div className="absolute -bottom-24 left-0 h-56 w-56 rounded-full bg-sky-500/10 blur-[80px]" />

          <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-sky-500 flex items-center justify-center shadow-lg">
                <Users size={28} className="text-white" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-black text-neutral-100 tracking-tight">
                  Friends Hub
                </h1>
                <p className="mt-1 text-neutral-400">
                  Manage requests, track online friends, and launch challenges.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => router.push("/play/friend")}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-emerald-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                <Swords size={16} /> New Challenge
              </button>
              <button
                onClick={() => router.push("/play/friend")}
                className="inline-flex items-center gap-2 rounded-xl border border-neutral-700 bg-neutral-800/60 px-4 py-2.5 text-sm font-semibold text-neutral-200 hover:bg-neutral-800 transition-all"
              >
                <UserPlus size={16} /> Invite Friends
              </button>
              <button
                onClick={handleRefresh}
                className="inline-flex items-center gap-2 rounded-xl border border-neutral-700 bg-neutral-800/50 px-3 py-2.5 text-sm font-semibold text-neutral-300 hover:bg-neutral-800 hover:text-white transition-all"
                title="Refresh friends list"
              >
                <RefreshCw size={18} className={refreshing ? "animate-spin" : ""} />
              </button>
            </div>
          </div>

          <div className="relative mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-neutral-500">
                Activity
              </div>
              <div className="mt-2 flex items-center gap-2 text-sm text-neutral-200">
                <Zap size={14} className="text-emerald-400" />
                Last refresh: {lastUpdatedLabel}
              </div>
            </div>
            <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-neutral-500">
                Live Updates
              </div>
              <div className="mt-2 text-sm text-neutral-300">
                Real-time friend challenges enabled
              </div>
            </div>
            <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-neutral-500">
                Status
              </div>
              <div className="mt-2 text-sm text-neutral-300">
                Stay online to receive instant invites
              </div>
            </div>
          </div>

          {banner && (
            <div className="relative mt-5 flex items-center justify-between gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
              <div className="inline-flex items-center gap-2">
                <Bell size={16} />
                {banner}
              </div>
              <button
                onClick={() => setBanner(null)}
                className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-xs font-semibold text-emerald-100 hover:bg-emerald-500/20"
              >
                Dismiss
              </button>
            </div>
          )}
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1.6fr] gap-6">
          <div className="space-y-6">
            <FriendSearch onAdd={handleFriendAdded} />
            <PendingRequests refreshTrigger={refreshTrigger} onActionComplete={handleFriendAdded} />
            <SentRequests refreshTrigger={refreshTrigger} onActionComplete={handleFriendAdded} />
          </div>

          <div className="space-y-6">
            <FriendlyMatchRequests refreshTrigger={refreshTrigger} />
            <FriendList refreshTrigger={refreshTrigger} />
          </div>
        </div>
      </div>
    </main>
  );
}
