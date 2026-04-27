"use client";

import React, { useEffect, useState } from "react";
import { socialService, SocialUser } from "@/services/social.service";
import { useChallengeStore } from "@/lib/game/challenge-store";
import { PulseDot } from "@/components/ui/PulseDot";
import { User as UserIcon, Swords, Loader2 } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { cn } from "@/lib/utils";

interface FriendsStripProps {
  initialFriends?: SocialUser[];
}

export function FriendsStrip({ initialFriends }: FriendsStripProps) {
  const [friends, setFriends] = useState<SocialUser[]>(initialFriends || []);
  const [isLoading, setIsLoading] = useState(!initialFriends);
  const [challengingId, setChallengingId] = useState<string | null>(null);
  const { setOutgoingChallenge, outgoingChallenge } = useChallengeStore();
  const t = useTranslations("common");
  const locale = useLocale();

  useEffect(() => {
    if (initialFriends) return;
    const fetchFriends = async () => {
      try {
        const data = await socialService.getFriends();
        setFriends(data);
      } catch (err) {
        console.error("Failed to fetch friends:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchFriends();
  }, []);

  const handleChallenge = async (friend: SocialUser) => {
    if (outgoingChallenge) return;
    setChallengingId(friend.id);
    try {
      const { gameId } = await socialService.challenge(friend.username);
      setOutgoingChallenge({
        username: friend.username,
        displayName: friend.displayName,
        avatarUrl: friend.avatarUrl,
        rating: friend.rating?.rating,
        gameId,
      });
    } catch (err) {
      console.error("Failed to send challenge:", err);
    } finally {
      setChallengingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-32 items-center justify-center rounded-2xl border border-white/5 bg-white/[0.02]">
        <Loader2 className="h-6 w-6 animate-spin text-neutral-600" />
      </div>
    );
  }

  if (friends.length === 0) {
    return (
      <div className="flex h-32 flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.01] p-6 text-center">
        <p className="text-sm text-neutral-500">
          {locale === "sw" ? "Huna marafiki bado. Fuata wachezaji wengine kuwaongeza hapa." : "No friends yet. Follow other players to see them here."}
        </p>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
        {friends.map((friend) => (
          <div
            key={friend.id}
            className="group relative flex min-w-[140px] flex-col items-center rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition-all hover:bg-white/[0.06]"
          >
            <div className="relative mb-3">
              <div className="h-14 w-14 overflow-hidden rounded-2xl bg-neutral-800">
                {friend.avatarUrl ? (
                  <img src={friend.avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-neutral-600">
                    <UserIcon size={24} />
                  </div>
                )}
              </div>
              <div className="absolute -bottom-1 -right-1">
                <PulseDot online={friend.isOnline} size={14} />
              </div>
            </div>

            <p className="w-full truncate text-center text-sm font-black text-white">
              {friend.displayName}
            </p>
            <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">
              ELO {friend.rating?.rating ?? 1200}
            </p>

            <button
              onClick={() => handleChallenge(friend)}
              disabled={!!outgoingChallenge || challengingId === friend.id || !friend.isOnline}
              className={cn(
                "mt-3 flex w-full items-center justify-center gap-2 rounded-xl py-2 text-[10px] font-black uppercase tracking-widest transition-all",
                friend.isOnline 
                  ? "bg-[var(--primary)] text-black hover:opacity-90 disabled:opacity-50"
                  : "bg-white/5 text-neutral-500 cursor-not-allowed"
              )}
            >
              {challengingId === friend.id ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <>
                  <Swords size={12} />
                  {locale === "sw" ? "Cheza" : "Play"}
                </>
              )}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
