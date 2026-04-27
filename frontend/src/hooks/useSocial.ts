"use client";

import { useState, useEffect, useCallback } from "react";
import { socialService, SocialUser } from "@/services/social.service";

export function useSocial() {
  const [stats, setStats] = useState({ followingCount: 0, followersCount: 0, friendsCount: 0 });
  const [friends, setFriends] = useState<SocialUser[]>([]);
  const [rank, setRank] = useState<{ global: number | null; country: number | null; region: number | null; totalPlayers: number } | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSocialData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsData, friendsData, rankData] = await Promise.all([
        socialService.getStats(),
        socialService.getFriends(),
        socialService.getMyRank()
      ]);
      setStats(statsData);
      setFriends(friendsData);
      setRank(rankData);
    } catch (error) {
      console.error("Failed to fetch social data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSocialData();
  }, [fetchSocialData]);

  return {
    stats,
    friends,
    rank,
    loading,
    refresh: fetchSocialData
  };
}
