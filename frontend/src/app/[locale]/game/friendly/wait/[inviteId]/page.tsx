"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { friendService } from "@/services/friend.service";
import { useRouter } from "@/i18n/routing";
import { Loader2 } from "lucide-react";
import { useSocket } from "@/hooks/useSocket";

export default function FriendlyWaitPage() {
  const { inviteId } = useParams<{ inviteId: string }>();
  const router = useRouter();
  const socket = useSocket();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(60);
  const [status, setStatus] = useState<string>("PENDING");
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [linkViews, setLinkViews] = useState(0);
  const [opponentMessage, setOpponentMessage] = useState<string | null>(null);
  const timedOut = useMemo(() => secondsLeft <= 0, [secondsLeft]);

  const loadInvite = async (silent = false) => {
    if (!inviteId) return;
    try {
      if (!silent) setLoading(true);
      setError(null);
      const invite = await friendService.getFriendlyInviteById(inviteId);
      setStatus(invite?.status || "PENDING");
      if (invite?.gameId) {
        router.push(`/game/${invite.gameId}`);
        return;
      }
      if (invite?.inviteToken && typeof window !== "undefined") {
        const origin = window.location.origin;
        const locale = window.location.pathname.split("/")[1] || "sw";
        setInviteUrl(`${origin}/${locale}/game/friendly/${invite.inviteToken}`);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load invite status");
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    loadInvite();
  }, [inviteId, router]);

  useEffect(() => {
    if (timedOut || status !== "PENDING") return;
    const timer = window.setInterval(() => {
      setSecondsLeft((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [status, timedOut]);

  useEffect(() => {
    if (!socket || !inviteId) return;

    const onGameStarted = (data: { gameId?: string; inviteId?: string }) => {
      if (!data?.gameId) return;
      if (data.inviteId && data.inviteId !== inviteId) return;
      router.push(`/game/${data.gameId}`);
    };
    const onLinkViewed = (data: { inviteId?: string; totalViews?: number }) => {
      if (!data?.inviteId || data.inviteId !== inviteId) return;
      setLinkViews(Math.max(0, Number(data.totalViews || 0)));
    };
    const onOpponentJoined = (data: { inviteId?: string; guestDisplayName?: string }) => {
      if (!data?.inviteId || data.inviteId !== inviteId) return;
      if (data.guestDisplayName) {
        setOpponentMessage(`${data.guestDisplayName} joined. Starting game...`);
      }
    };

    socket.on("gameStarted", onGameStarted);
    socket.on("friendlyInviteLinkViewed", onLinkViewed);
    socket.on("friendlyInviteOpponentJoined", onOpponentJoined);
    return () => {
      socket.off("gameStarted", onGameStarted);
      socket.off("friendlyInviteLinkViewed", onLinkViewed);
      socket.off("friendlyInviteOpponentJoined", onOpponentJoined);
    };
  }, [inviteId, router, socket]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadInvite(true);
    window.setTimeout(() => setRefreshing(false), 400);
  };

  const handleCancelInvite = async () => {
    try {
      await friendService.cancelFriendlyInvite(inviteId);
      setStatus("CANCELED");
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to cancel invite");
    }
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--background)]">
        <Loader2 className="animate-spin text-[var(--primary)]" size={36} />
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--background)] px-4 text-[var(--foreground)]">
      <div className="w-full max-w-md rounded-2xl border border-neutral-800 bg-neutral-900/50 p-6 shadow-2xl">
        <h1 className="text-2xl font-black text-neutral-100">Waiting For Friend</h1>
        <p className="mt-2 text-sm text-neutral-300">
          Share the invite link and wait up to 60 seconds for a response.
        </p>

        {inviteUrl && (
          <div className="mt-4 rounded-lg border border-neutral-700 bg-neutral-800/50 p-3">
            <p className="mb-2 text-xs text-neutral-400">Invite Link</p>
            <p className="truncate rounded bg-neutral-900/80 px-2 py-1 text-xs text-neutral-200">
              {inviteUrl}
            </p>
            <p className="mt-2 text-xs text-neutral-400">Link opened: {linkViews}</p>
          </div>
        )}

        {opponentMessage && (
          <div className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
            {opponentMessage}
          </div>
        )}

        <div className="mt-4 rounded-lg border border-sky-500/30 bg-sky-500/10 px-4 py-3 text-center">
          <div className="text-xs uppercase tracking-wide text-sky-300">Time left</div>
          <div className="mt-1 text-2xl font-bold text-sky-100">{secondsLeft}s</div>
        </div>

        {timedOut && status === "PENDING" && (
          <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            No response in 60 seconds. Your friend may be in another match right now.
          </div>
        )}

        {status !== "PENDING" && (
          <div className="mt-4 rounded-lg border border-neutral-700 bg-neutral-800/40 px-4 py-3 text-sm text-neutral-200">
            Invite status: {status.toLowerCase()}
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <div className="mt-6 flex flex-col gap-2">
          <button
            onClick={handleRefresh}
            className="rounded-lg border border-neutral-700 bg-neutral-800 px-4 py-2 text-sm font-semibold text-neutral-100 hover:bg-neutral-700"
          >
            {refreshing ? "Refreshing..." : "Refresh Status"}
          </button>
          <button
            onClick={handleCancelInvite}
            disabled={status !== "PENDING"}
            className="rounded-lg border border-red-500/40 bg-red-500/15 px-4 py-2 text-sm font-semibold text-red-200 hover:bg-red-500/25 disabled:opacity-60"
          >
            Cancel Invite
          </button>
          <button
            onClick={() => router.push("/friends")}
            className="rounded-lg border border-neutral-700 bg-transparent px-4 py-2 text-sm font-semibold text-neutral-300 hover:bg-neutral-800"
          >
            Back to Friends
          </button>
        </div>
      </div>
    </main>
  );
}
