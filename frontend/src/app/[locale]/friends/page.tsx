"use client";

import { useState, useEffect } from "react";
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
import { Bell, RefreshCw, Users } from "lucide-react";

export default function FriendsPage() {
  const { user, isAuthenticated, isHydrated } = useAuth();
  const router = useRouter();
  const socket = useSocket();
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [banner, setBanner] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    // Wait for store to hydrate before checking authentication
    if (!isHydrated) return;

    if (!isAuthenticated) {
      router.push("/auth/login");
    }
  }, [isHydrated, isAuthenticated, router]);

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
    return (
      <div className="min-h-screen bg-[var(--background)] py-12 px-4 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin">
            <Users size={32} className="text-[var(--primary)]" />
          </div>
          <p className="mt-4 text-neutral-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const handleFriendAdded = () => {
    // Trigger refresh of all friendship panels
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    setRefreshTrigger((prev) => prev + 1);
    window.setTimeout(() => setRefreshing(false), 500);
  };

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)] px-4 md:px-8 py-12">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <header className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-6 shadow-2xl">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-[var(--primary)] flex items-center justify-center">
              <Users size={24} className="text-white" />
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-black text-neutral-100 tracking-tight">Friends</h1>
              <p className="mt-1 text-neutral-400">
                Manage your connections and challenge them to a game
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push("/play/friend")}
                className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-[var(--primary)]/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                Challenge a Friend
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
          {banner && (
            <div className="mt-4 flex items-center justify-between gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
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

        {/* Layout: Search on left, Pending Requests and Friends List on right */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Search */}
          <div className="lg:col-span-1">
            <FriendSearch onAdd={handleFriendAdded} />
          </div>

          {/* Right Column: Pending Requests and Friends List */}
          <div className="lg:col-span-2 space-y-6">
            <FriendlyMatchRequests refreshTrigger={refreshTrigger} />
            <PendingRequests refreshTrigger={refreshTrigger} onActionComplete={handleFriendAdded} />
            <SentRequests refreshTrigger={refreshTrigger} onActionComplete={handleFriendAdded} />
            <FriendList refreshTrigger={refreshTrigger} />
          </div>
        </div>
      </div>
    </main>
  );
}
