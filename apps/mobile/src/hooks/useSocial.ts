import { useState, useCallback } from "react";
import { socialService, SocialUser, RelationshipState } from "../services/social.service";

export function useSocial() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const follow = useCallback(async (username: string) => {
    setLoading(true);
    setError(null);
    try {
      await socialService.follow(username);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to follow user");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const unfollow = useCallback(async (username: string) => {
    setLoading(true);
    setError(null);
    try {
      await socialService.unfollow(username);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to unfollow user");
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getStatus = useCallback(async (username: string): Promise<RelationshipState | null> => {
    setLoading(true);
    try {
      return await socialService.getStatus(username);
    } catch (err: any) {
      console.error("Failed to get status", err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const getFriends = useCallback(async (): Promise<SocialUser[]> => {
    setLoading(true);
    try {
      return await socialService.getFriends();
    } catch (err: any) {
      console.error("Failed to get friends", err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const getFollowing = useCallback(async () => {
    setLoading(true);
    try {
      return await socialService.getFollowing();
    } catch (err: any) {
      console.error("Failed to get following", err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const getFollowers = useCallback(async () => {
    setLoading(true);
    try {
      return await socialService.getFollowers();
    } catch (err: any) {
      console.error("Failed to get followers", err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const getStats = useCallback(async () => {
    setLoading(true);
    try {
      return await socialService.getStats();
    } catch (err: any) {
      console.error("Failed to get stats", err);
      return { followingCount: 0, followersCount: 0, friendsCount: 0 };
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    follow,
    unfollow,
    getStatus,
    getFriends,
    getFollowing,
    getFollowers,
    getStats,
  };
}
