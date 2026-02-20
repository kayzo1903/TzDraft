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
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load match requests");
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
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to accept request");
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
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to decline request");
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
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-6 shadow-2xl">
      <h2 className="mb-4 text-xl font-bold text-neutral-100">
        Friendly Match Requests ({invites.length})
      </h2>

      {error && (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-red-300">
          {error}
        </div>
      )}

      {invites.length === 0 ? (
        <p className="text-sm text-neutral-400">No incoming challenges right now.</p>
      ) : (
        <div className="space-y-3">
          {invites.map((invite) => (
            <div
              key={invite.id}
              className="flex items-center justify-between rounded-lg border border-neutral-800/60 bg-neutral-800/30 p-3"
            >
              <div>
                <p className="font-semibold text-neutral-100">{invite.host.displayName}</p>
                <p className="text-xs text-neutral-400">@{invite.host.username}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleAccept(invite)}
                  disabled={actingOn === invite.id}
                  className="rounded-md border border-emerald-500/40 bg-emerald-500/15 px-3 py-1.5 text-xs font-semibold text-emerald-200 hover:bg-emerald-500/25 disabled:opacity-60"
                >
                  Accept
                </button>
                <button
                  onClick={() => handleDecline(invite.id)}
                  disabled={actingOn === invite.id}
                  className="rounded-md border border-red-500/40 bg-red-500/15 px-3 py-1.5 text-xs font-semibold text-red-200 hover:bg-red-500/25 disabled:opacity-60"
                >
                  Decline
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
