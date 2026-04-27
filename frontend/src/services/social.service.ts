import api from "@/lib/axios";

export interface SocialUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  rating?: {
    rating: number;
  };
  isRival?: boolean;
  gameCount?: number;
  isOnline?: boolean;
}

export interface RelationshipState {
  isFollowing: boolean;
  isFollower: boolean;
  isMutual: boolean;
  isFriend: boolean;
  isRival: boolean;
  gameCount: number;
}

class SocialService {
  async follow(username: string): Promise<any> {
    return api.post(`/social/follow/${username}`);
  }

  async unfollow(username: string): Promise<any> {
    return api.delete(`/social/unfollow/${username}`);
  }

  async getStatus(username: string): Promise<RelationshipState> {
    const res = await api.get(`/social/status/${username}`);
    return res.data;
  }

  async getFriends(): Promise<SocialUser[]> {
    const res = await api.get("/social/friends");
    return res.data;
  }

  async getFollowing(): Promise<any[]> {
    const res = await api.get("/social/following");
    return res.data;
  }

  async getFollowers(): Promise<any[]> {
    const res = await api.get("/social/followers");
    return res.data;
  }

  async getStats(): Promise<{ followingCount: number; followersCount: number; friendsCount: number }> {
    const res = await api.get("/social/stats");
    return res.data;
  }

  async getMyRank(): Promise<{ global: number | null; country: number | null; region: number | null; totalPlayers: number }> {
    const res = await api.get("/auth/rank");
    return res.data.data;
  }

  async challenge(username: string): Promise<{ inviteCode: string; gameId: string }> {
    const res = await api.post(`/social/challenge/${username}`);
    return res.data;
  }
}

export const socialService = new SocialService();
