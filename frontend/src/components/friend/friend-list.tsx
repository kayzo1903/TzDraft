"use client";

import { useEffect, useState } from "react";
import { friendService } from "@/services/friend.service";
import { Loader2, Trash2, Check, X, UserMinus } from "lucide-react";

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
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadFriends = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await friendService.getFriends();
      setFriends(data);
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
      setFriends(friends.filter((f) => f.id !== friendId));
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to remove friend");
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
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-neutral-100">My Friends ({friends.length})</h2>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-300 px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      {friends.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-neutral-400 text-lg">
            You don't have any friends yet. Search and add some!
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {friends.map((friend) => (
            <div
              key={friend.id}
              className="flex items-center justify-between p-4 rounded-lg border border-neutral-800/50 bg-neutral-800/20 hover:bg-neutral-800/40 transition"
            >
              <div className="flex items-center gap-3 flex-1">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--primary)] to-amber-300 flex items-center justify-center text-black font-semibold text-sm">
                  {friend.displayName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-semibold text-neutral-100">
                    {friend.displayName}
                  </h3>
                  <p className="text-sm text-neutral-400">@{friend.username}</p>
                  {friend.rating && (
                    <p className="text-xs text-neutral-500 mt-1">
                      Rating: <span className="font-semibold text-neutral-300">{(friend.rating as any).rating || friend.rating}</span>
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={() => handleRemoveFriend(friend.id)}
                className="ml-4 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition flex items-center gap-2 text-sm font-medium"
              >
                <UserMinus size={16} />
                Unfriend
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
