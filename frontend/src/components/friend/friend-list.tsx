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
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [waitingUrl, setWaitingUrl] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const onlineCount = useMemo(
    () => friends.filter((friend) => onlineMap[friend.id]).length,
    [friends, onlineMap],
  );

  const toLocaleRelativePath = (urlOrPath: string) => {
    const rawPath = urlOrPath.replace(/^https?:\/\/[^/]+/i, "");
    return rawPath.replace(/^\/(en|sw)(\/|$)/, "/");
  };

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
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load friends");
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
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to remove friend");
    }
  };

  const handleChallengeFriend = async (friendId: string) => {
    try {
      setBusyFriendId(friendId);
      setError(null);
      setActionMessage(null);

      const invite = await friendService.createFriendlyMatchInvite({ friendId, locale });
      setInviteUrl(invite.inviteUrl || null);
      setWaitingUrl(invite.waitingUrl || null);
      setActionMessage("Challenge sent. Waiting for your friend to accept.");
      if (invite.gameId) {
        router.push(`/game/${invite.gameId}`);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to send challenge");
    } finally {
      setBusyFriendId(null);
    }
  };

  const handleCreateInviteLink = async () => {
    try {
      setError(null);
      setActionMessage(null);
      const invite = await friendService.createFriendlyMatchInvite({ locale });
      setInviteUrl(invite.inviteUrl || null);
      setWaitingUrl(invite.waitingUrl || null);
      setActionMessage("Invite link created. Share it with your friend.");
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to create invite link");
    }
  };

  const handleShareWhatsApp = () => {
    if (!inviteUrl) return;
    const text = `Join my friendly match: ${inviteUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  const handleCopyInvite = async () => {
    if (!inviteUrl) return;
    await navigator.clipboard.writeText(inviteUrl);
    setActionMessage("Invite link copied.");
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
        <h2 className="text-xl font-bold text-neutral-100">
          My Friends ({friends.length}){" "}
          <span className="text-sm font-medium text-emerald-300">Online: {onlineCount}</span>
        </h2>
        <button
          onClick={handleCreateInviteLink}
          className="rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm font-semibold text-neutral-100 hover:bg-neutral-700"
        >
          Create Invite Link
        </button>
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

      {inviteUrl && (
        <div className="mb-4 rounded-lg border border-neutral-700 bg-neutral-800/50 p-3">
          <p className="mb-2 text-xs text-neutral-400">Friendly Invite Link</p>
          <p className="truncate rounded bg-neutral-900/80 px-2 py-1 text-xs text-neutral-200">
            {inviteUrl}
          </p>
          <div className="mt-3 flex gap-2">
            <button
              onClick={handleShareWhatsApp}
              className="inline-flex items-center gap-2 rounded-md border border-emerald-500/40 bg-emerald-500/15 px-3 py-1.5 text-xs font-semibold text-emerald-200 hover:bg-emerald-500/25"
            >
              <MessageCircle size={14} />
              WhatsApp
            </button>
            <button
              onClick={handleCopyInvite}
              className="inline-flex items-center gap-2 rounded-md border border-neutral-600 bg-neutral-800 px-3 py-1.5 text-xs font-semibold text-neutral-200 hover:bg-neutral-700"
            >
              <Copy size={14} />
              Copy
            </button>
            {waitingUrl && (
              <button
                onClick={() => router.push(toLocaleRelativePath(waitingUrl))}
                className="inline-flex items-center gap-2 rounded-md border border-sky-500/40 bg-sky-500/15 px-3 py-1.5 text-xs font-semibold text-sky-200 hover:bg-sky-500/25"
              >
                Wait 60s
              </button>
            )}
          </div>
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
