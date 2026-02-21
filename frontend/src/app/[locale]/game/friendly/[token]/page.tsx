"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { friendService } from "@/services/friend.service";
import { useRouter } from "@/i18n/routing";
import { Loader2, User, Settings2, Target, Globe, ChevronRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { getOrCreateGuestId } from "@/lib/auth/guest-id";
import { Button } from "@/components/ui/Button";

type InviteData = {
  id: string;
  status: "PENDING" | "ACCEPTED" | "DECLINED" | "CANCELED" | "EXPIRED";
  canAccept: boolean;
  gameId?: string | null;
  expiresAt: string;
  initialTimeMs: number;
  roomType: string;
  hostColor: string;
  rated: boolean;
  allowSpectators: boolean;
  host: {
    id: string;
    username: string;
    displayName: string;
  };
};

// Bug 5 fix: derive the opponent's actual color from the host's preference
function resolveOpponentColor(hostColor: string): string {
  if (hostColor === "WHITE") return "Black";
  if (hostColor === "BLACK") return "White";
  return "Random";
}

export default function FriendlyInvitePage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();

  // Bug 2 fix: use isHydrated so we don't flash guest mode while the auth store hydrates
  const { user, isHydrated } = useAuth();

  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invite, setInvite] = useState<InviteData | null>(null);
  const [guestName, setGuestName] = useState("");

  // Bug 2 fix: only compute isGuest after the auth store has hydrated from storage
  const isGuest = isHydrated && !user?.id;

  useEffect(() => {
    // Wait for auth to hydrate from storage before loading the invite,
    // so getOrCreateGuestId is only passed when we truly know the user is a guest
    if (!isHydrated) return;

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
        setError(err.response?.data?.message || "Invite not available or expired.");
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      load();
    }
  }, [isHydrated, isGuest, token, router]);

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
      if (data?.inviteId) {
        // Go to the shared waiting room where both players click Start Game
        router.push(`/game/friendly/wait/${data.inviteId}`);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Could not accept invite");
    } finally {
      setAccepting(false);
    }
  };

  // Bug 2 fix: show spinner while auth store is hydrating (prevents guest flash)
  if (!isHydrated || loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--background)]">
        <Loader2 className="animate-spin text-[var(--primary)]" size={40} />
      </main>
    );
  }

  if (error || !invite) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--background)] px-4 py-8">
        <div className="w-full max-w-md rounded-3xl border border-neutral-800 bg-neutral-900/60 p-8 text-center shadow-2xl">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10">
            <Target className="text-red-500" size={32} />
          </div>
          <h1 className="mb-2 text-2xl font-bold text-white">Invite Unavailable</h1>
          <p className="mb-8 text-neutral-400">{error || "This invite link is invalid or has expired."}</p>
          <Button
            variant="outline"
            onClick={() => router.push("/")}
            className="w-full"
          >
            Return Home
          </Button>
        </div>
      </main>
    );
  }

  const timeLabel = invite.initialTimeMs
    ? `${Math.round(invite.initialTimeMs / 60000)} min`
    : "10 min";

  // Bug 5 fix: show the opponent's actual color, not the host's preference
  const opponentColorLabel = resolveOpponentColor(invite.hostColor);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--background)] px-4 py-8 text-[var(--foreground)]">
      <div className="w-full max-w-lg rounded-3xl border border-neutral-800 bg-neutral-900/60 p-6 md:p-10 shadow-2xl backdrop-blur-xl">

        {/* Host Info */}
        <div className="text-center mb-8">
          <div className="relative mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full border-4 border-[var(--primary)]/30 bg-neutral-800 shadow-xl">
            <User className="text-[var(--primary)]" size={40} />
          </div>
          <h1 className="text-2xl font-black text-white mb-1">
            {invite.host.displayName}
          </h1>
          <p className="text-neutral-400">has challenged you to a game!</p>
        </div>

        {/* Game Settings */}
        <div className="mb-8 rounded-2xl border border-neutral-800 bg-neutral-800/30 p-5">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-neutral-300">
            <Settings2 size={16} /> Game Settings
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-neutral-900/50 p-3 text-center">
              <div className="text-[10px] uppercase tracking-wider text-neutral-500">Time</div>
              <div className="font-bold text-neutral-200">{timeLabel}</div>
            </div>
            <div className="rounded-xl bg-neutral-900/50 p-3 text-center">
              <div className="text-[10px] uppercase tracking-wider text-neutral-500">Type</div>
              <div className="font-bold text-neutral-200">{invite.rated ? "Rated" : "Casual"}</div>
            </div>
            <div className="rounded-xl bg-neutral-900/50 p-3 text-center">
              <div className="text-[10px] uppercase tracking-wider text-neutral-500">Spectators</div>
              <div className="font-bold text-neutral-200">{invite.allowSpectators ? "Allowed" : "Off"}</div>
            </div>
            {/* Bug 5 fix: show opponent's derived color, not the raw hostColor */}
            <div className="rounded-xl bg-neutral-900/50 p-3 text-center">
              <div className="text-[10px] uppercase tracking-wider text-neutral-500">Your Color</div>
              <div className="font-bold capitalize text-neutral-200">{opponentColorLabel}</div>
            </div>
          </div>
        </div>

        {invite.status !== "PENDING" && (
          <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-center text-sm font-medium text-amber-200">
            This challenge is currently {invite.status.toLowerCase()}.
          </div>
        )}

        {/* Guest Input */}
        {isGuest && invite.status === "PENDING" && (
          <div className="mb-6 rounded-2xl border border-[var(--primary)]/20 bg-[var(--primary)]/5 p-5">
            <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-[var(--primary)]">
              <Globe size={16} /> Play as Guest
            </label>
            <p className="mb-4 text-xs text-neutral-400">Enter a display name to join instantly without an account.</p>
            <input
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              placeholder="e.g. Master Draughts"
              maxLength={24}
              className="w-full rounded-xl border border-neutral-700 bg-neutral-900/80 px-4 py-3 text-sm text-white placeholder-neutral-500 outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]/50 transition-all font-medium"
              autoFocus
            />
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-3 mt-4">
          <Button
            size="lg"
            onClick={handleAccept}
            disabled={!invite.canAccept || invite.status !== "PENDING" || accepting || (isGuest && guestName.trim().length < 2)}
            className="w-full group"
          >
            {accepting ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <>
                {isGuest ? "Join as Guest" : "Accept Challenge"}
                <ChevronRight size={20} className="ml-2 transition-transform group-hover:translate-x-1" />
              </>
            )}
          </Button>

          {invite.host.id === user?.id && invite.status === "PENDING" && (
            <Button
              variant="outline"
              onClick={() => router.push(`/game/friendly/wait/${invite.id}`)}
              className="w-full border-[var(--primary)] text-[var(--primary)] hover:bg-[var(--primary)] hover:text-white"
            >
              Go directly to Waiting Room
            </Button>
          )}

          {!isGuest && (
            <Button
              variant="ghost"
              onClick={() => router.push("/")}
              className="w-full"
            >
              Back to Home
            </Button>
          )}

          {isGuest && (
            <div className="mt-4 text-center">
              <p className="text-xs text-neutral-500">
                Want to track your stats?{' '}
                <button
                  onClick={() => router.push("/auth/signup")}
                  className="font-bold text-[var(--primary)] hover:underline"
                >
                  Create an account
                </button>
              </p>
            </div>
          )}
        </div>

      </div>
    </main>
  );
}
