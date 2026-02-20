"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { friendService } from "@/services/friend.service";
import { useRouter } from "@/i18n/routing";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { getOrCreateGuestId } from "@/lib/auth/guest-id";

type InviteData = {
  id: string;
  status: "PENDING" | "ACCEPTED" | "DECLINED" | "CANCELED" | "EXPIRED";
  canAccept: boolean;
  gameId?: string | null;
  expiresAt: string;
  host: {
    id: string;
    username: string;
    displayName: string;
  };
};

export default function FriendlyInvitePage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invite, setInvite] = useState<InviteData | null>(null);
  const [guestName, setGuestName] = useState("");
  const isGuest = !user?.id;

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await friendService.getFriendlyInviteByToken(
          token,
          isGuest ? getOrCreateGuestId() : undefined,
        );
        setInvite(data);
        if (data?.gameId) {
          router.push(`/game/${data.gameId}`);
        }
      } catch (err: any) {
        setError(err.response?.data?.message || "Invite not available");
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      load();
    }
  }, [isGuest, token]);

  const handleAccept = async () => {
    if (!token) return;
    try {
      setAccepting(true);
      setError(null);
      const payload = isGuest
        ? {
            guestId: getOrCreateGuestId(),
            guestName: guestName.trim() || undefined,
          }
        : undefined;
      const data = await friendService.acceptFriendlyInvite(token, payload);
      if (data?.gameId) {
        if (data.playerColor && typeof window !== "undefined") {
          window.sessionStorage.setItem(`tzdraft:game:${data.gameId}:color`, data.playerColor);
        }
        router.push(`/game/${data.gameId}`);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Could not accept invite");
    } finally {
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--background)] px-4">
        <Loader2 className="animate-spin text-[var(--primary)]" size={36} />
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--background)] px-4 text-[var(--foreground)]">
      <div className="w-full max-w-md rounded-2xl border border-neutral-800 bg-neutral-900/50 p-6 shadow-2xl">
        <h1 className="text-2xl font-black text-neutral-100">Friendly Match Invite</h1>
        {invite && (
          <p className="mt-2 text-sm text-neutral-300">
            <span className="font-semibold">{invite.host.displayName}</span> invited you to an
            unranked friendly game.
          </p>
        )}

        {error && (
          <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {!error && invite?.status !== "PENDING" && (
          <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            This invite is {invite?.status.toLowerCase()}.
          </div>
        )}

        {isGuest && invite?.status === "PENDING" && (
          <div className="mt-4">
            <label className="mb-2 block text-xs uppercase tracking-wide text-neutral-400">
              Your display name
            </label>
            <input
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              placeholder="Guest name"
              maxLength={24}
              className="w-full rounded-lg border border-neutral-700 bg-neutral-900/60 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-[var(--primary)]"
            />
          </div>
        )}

        <div className="mt-6 flex flex-col gap-3">
          <button
            onClick={handleAccept}
            disabled={
              !invite?.canAccept ||
              invite?.status !== "PENDING" ||
              accepting ||
              (isGuest && guestName.trim().length < 2)
            }
            className="rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-4 py-2 text-sm font-semibold text-emerald-200 hover:bg-emerald-500/25 disabled:opacity-60"
          >
            {accepting ? "Starting..." : "Accept & Play"}
          </button>
          {invite?.host?.id === user?.id && invite?.status === "PENDING" && (
            <button
              onClick={() => router.push(`/game/friendly/wait/${invite.id}`)}
              className="rounded-lg border border-sky-500/40 bg-sky-500/15 px-4 py-2 text-sm font-semibold text-sky-200 hover:bg-sky-500/25"
            >
              Go to Waiting Room
            </button>
          )}
          <button
            onClick={() => router.push("/friends")}
            className="rounded-lg border border-neutral-700 bg-neutral-800 px-4 py-2 text-sm font-semibold text-neutral-200 hover:bg-neutral-700"
          >
            Back to Friends
          </button>
        </div>
      </div>
    </main>
  );
}
