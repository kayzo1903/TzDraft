"use client";

import { useEffect, useMemo, useState } from "react";
import { friendService } from "@/services/friend.service";
import { Copy, Loader2, MessageCircle, Swords, Trash2 } from "lucide-react";
import { useRouter } from "@/i18n/routing";
import { useLocale } from "next-intl";

interface Friend {
  id: string;
  username: string;
  displayName: string;
  rating?: number;
  friendSince?: string;
}

interface FriendListProps {
  refreshTrigger?: number;
}

export function FriendList({ refreshTrigger }: FriendListProps) {
  const router = useRouter();
  const locale = useLocale() as "en" | "sw";
  const [friends, setFriends] = useState<Friend[]>([]);
  const [onlineMap, setOnlineMap] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyFriendId, setBusyFriendId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const onlineCount = useMemo(
    () => friends.filter((friend) => onlineMap[friend.id]).length,
    [friends, onlineMap],
  );


  const loadFriends = async () => {
    try {
      setLoading(true);
      setError(null);

      const [friendData, onlineData] = await Promise.all([
        friendService.getFriends(),
        friendService.getOnlineFriends().catch(() => ({
          onlineIds: [],
          onlineMap: {},
        })),
      ]);

      setFriends(friendData || []);
      setOnlineMap(onlineData.onlineMap || {});
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load friends";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFriends();
  }, [refreshTrigger]);

  const handleRemoveFriend = async (friendId: string) => {
    try {
      await friendService.removeFriend(friendId);
      setFriends((prev) => prev.filter((f) => f.id !== friendId));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to remove friend";
      setError(message);
    }
  };

  const handleChallengeFriend = async (friendId: string) => {
    try {
      setBusyFriendId(friendId);
      setError(null);
      setActionMessage(null);

      const invite = await friendService.createFriendlyInvite({ friendId, locale });
      setActionMessage("Challenge sent. Waiting for your friend to accept.");

      // If the friend accepts immediately or it's already accepted, redirect
      if (invite.gameId) {
        router.push(`/game/${invite.gameId}`);
      } else if (invite.id) {
        // Option: automatically go to wait room for challenges too?
        // router.push(`/game/friendly/wait/${invite.id}`);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to send challenge";
      setError(message);
    } finally {
      setBusyFriendId(null);
    }
  };


  if (loading) {
    return (
      <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-6 shadow-2xl flex items-center justify-center py-12">
        <Loader2 className="animate-spin text-[var(--primary)]" size={32} />
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-6 shadow-2xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-neutral-100 italic">
          My Friends ({friends.length}){" "}
          <span className="text-xs font-medium text-emerald-300 not-italic ml-2 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
            {onlineCount} Online
          </span>
        </h2>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-red-300">
          {error}
        </div>
      )}

      {actionMessage && (
        <div className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-emerald-200">
          {actionMessage}
        </div>
      )}


      {friends.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-lg text-neutral-400">
            You don't have any friends yet. Search and add some!
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {friends.map((friend) => {
            const isOnline = Boolean(onlineMap[friend.id]);
            return (
              <div
                key={friend.id}
                className="flex items-center justify-between rounded-lg border border-neutral-800/50 bg-neutral-800/20 p-4 transition hover:bg-neutral-800/40"
              >
                <div className="flex flex-1 items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[var(--primary)] to-amber-300 text-sm font-semibold text-black">
                    {friend.displayName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-semibold text-neutral-100">{friend.displayName}</h3>
                    <p className="text-sm text-neutral-400">@{friend.username}</p>
                    <p
                      className={`mt-1 text-xs font-semibold ${isOnline ? "text-emerald-300" : "text-neutral-500"}`}
                    >
                      {isOnline ? "Online" : "Offline"}
                    </p>
                  </div>
                </div>

                <div className="ml-4 flex items-center gap-2">
                  <button
                    onClick={() => handleChallengeFriend(friend.id)}
                    disabled={busyFriendId === friend.id}
                    className="inline-flex items-center gap-2 rounded-lg border border-sky-500/40 bg-sky-500/15 px-3 py-2 text-xs font-semibold text-sky-200 hover:bg-sky-500/25 disabled:opacity-60"
                    title="Challenge friend"
                  >
                    <Swords size={14} />
                    {busyFriendId === friend.id ? "Sending..." : "Challenge"}
                  </button>
                  <button
                    onClick={() => handleRemoveFriend(friend.id)}
                    className="rounded-lg p-2 text-red-400 transition hover:bg-red-500/20"
                    title="Remove friend"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
