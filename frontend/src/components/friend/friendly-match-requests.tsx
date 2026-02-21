"use client";

import { useEffect, useState } from "react";
import { friendService } from "@/services/friend.service";
import { Loader2 } from "lucide-react";
import { useRouter } from "@/i18n/routing";

interface IncomingInvite {
  id: string;
  inviteToken: string;
  status: string;
  expiresAt: string;
  createdAt: string;
  host: {
    id: string;
    username: string;
    displayName: string;
  };
}

interface FriendlyMatchRequestsProps {
  refreshTrigger?: number;
}

export function FriendlyMatchRequests({ refreshTrigger }: FriendlyMatchRequestsProps) {
  const router = useRouter();
  const [invites, setInvites] = useState<IncomingInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actingOn, setActingOn] = useState<string | null>(null);

  const loadIncoming = async () => {
    try {
      setError(null);
      const data = await friendService.getIncomingFriendlyInvites();
      setInvites((data || []).filter((invite: IncomingInvite) => invite.status === "PENDING"));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load match requests";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    loadIncoming();
  }, [refreshTrigger]);

  const handleAccept = async (invite: IncomingInvite) => {
    try {
      setActingOn(invite.id);
      const data = await friendService.acceptFriendlyInvite(invite.inviteToken);
      if (data?.gameId) {
        if (data.playerColor && typeof window !== "undefined") {
          window.sessionStorage.setItem(`tzdraft:game:${data.gameId}:color`, data.playerColor);
        }
        router.push(`/game/${data.gameId}`);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to accept request";
      setError(message);
    } finally {
      setActingOn(null);
      loadIncoming();
    }
  };

  const handleDecline = async (inviteId: string) => {
    try {
      setActingOn(inviteId);
      await friendService.declineFriendlyInvite(inviteId);
      setInvites((prev) => prev.filter((invite) => invite.id !== inviteId));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to decline request";
      setError(message);
    } finally {
      setActingOn(null);
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-6 shadow-2xl flex items-center justify-center py-8">
        <Loader2 className="animate-spin text-[var(--primary)]" size={24} />
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-6 shadow-2xl overflow-hidden relative">
      {/* Accent gradient line */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500 opacity-50" />

      <h2 className="mb-4 text-xl font-bold text-neutral-100 flex items-center gap-2">
        Game Challenges
        {invites.length > 0 && (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-white">
            {invites.length}
          </span>
        )}
      </h2>

      {error && (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-red-300 text-sm">
          {error}
        </div>
      )}

      {invites.length === 0 ? (
        <div className="py-2 text-center">
          <p className="text-sm text-neutral-500 italic">No incoming challenges right now.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {invites.map((invite) => (
            <div
              key={invite.id}
              className="group flex items-center justify-between rounded-xl border border-neutral-800/60 bg-neutral-800/20 p-4 transition hover:bg-neutral-800/40"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                  {invite.host.displayName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-bold text-neutral-100">{invite.host.displayName}</p>
                  <p className="text-xs text-neutral-500">@{invite.host.username}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleDecline(invite.id)}
                  disabled={actingOn === invite.id}
                  className="rounded-lg border border-neutral-700 bg-neutral-800/50 px-3 py-1.5 text-xs font-semibold text-neutral-400 hover:bg-neutral-800 hover:text-red-400 transition-all disabled:opacity-60"
                >
                  Decline
                </button>
                <button
                  onClick={() => handleAccept(invite)}
                  disabled={actingOn === invite.id}
                  className="rounded-lg bg-emerald-500 px-4 py-1.5 text-xs font-bold text-white shadow-lg shadow-emerald-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-60 flex items-center gap-1"
                >
                  {actingOn === invite.id ? <Loader2 size={12} className="animate-spin" /> : null}
                  Accept
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
