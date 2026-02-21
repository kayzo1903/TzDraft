import axiosInstance from "@/lib/axios";

// Friend service API client
export const friendService = {
  // Send friend request
  async sendFriendRequest(friendId: string) {
    const response = await axiosInstance.post("/friends/requests/send", {
      friendId,
    });
    return response.data;
  },

  // Get pending friend requests
  async getPendingRequests() {
    const response = await axiosInstance.get("/friends/requests/pending");
    return response.data;
  },

  // Get sent friend requests
  async getSentRequests() {
    const response = await axiosInstance.get("/friends/requests/sent");
    return response.data;
  },

  // Accept friend request
  async acceptFriendRequest(requesterId: string) {
    const response = await axiosInstance.post(
      `/friends/requests/${requesterId}/accept`,
    );
    return response.data;
  },

  // Reject friend request
  async rejectFriendRequest(requesterId: string) {
    const response = await axiosInstance.post(
      `/friends/requests/${requesterId}/reject`,
    );
    return response.data;
  },

  // Get all friends
  async getFriends() {
    const response = await axiosInstance.get("/friends");
    return response.data;
  },

  async getOnlineFriends() {
    const response = await axiosInstance.get("/friends/online");
    return response.data as {
      onlineIds: string[];
      onlineMap: Record<string, boolean>;
    };
  },

  // Remove friend
  async removeFriend(friendId: string) {
    const response = await axiosInstance.delete(`/friends/${friendId}`);
    return response.data;
  },

  // Cancel friend request
  async cancelFriendRequest(requesteeId: string) {
    const response = await axiosInstance.delete(
      `/friends/requests/${requesteeId}`,
    );
    return response.data;
  },

  async createFriendlyInvite(payload?: {
    friendId?: string;
    initialTimeMs?: number;
    locale?: "en" | "sw";
    roomType?: string;
    hostColor?: string;
    rated?: boolean;
    allowSpectators?: boolean;
  }) {
    const response = await axiosInstance.post(
      "/friends/matches",
      payload || {},
    );
    return response.data as {
      id: string;
      inviteToken: string;
      gameId?: string | null;
      inviteUrl?: string;
      waitingUrl?: string;
    };
  },

  async getFriendlyInviteByToken(token: string, guestId?: string) {
    const response = await axiosInstance.get(
      `/friends/matches/invites/${token}`,
      {
        params: guestId ? { guestId } : undefined,
      },
    );
    return response.data;
  },

  async acceptFriendlyInvite(
    token: string,
    payload?: { guestId?: string; guestName?: string },
  ) {
    const response = await axiosInstance.post(
      `/friends/matches/invites/${token}/accept`,
      payload || {},
    );
    return response.data as {
      status: string;
      gameId: string;
      inviteId: string;
      playerColor?: "WHITE" | "BLACK" | null;
    };
  },

  async getIncomingFriendlyInvites() {
    const response = await axiosInstance.get("/friends/matches/incoming");
    return response.data;
  },

  async getOutgoingFriendlyInvites() {
    const response = await axiosInstance.get("/friends/matches/outgoing");
    return response.data;
  },

  async getFriendlyInviteById(id: string, guestId?: string) {
    const response = await axiosInstance.get(`/friends/matches/${id}`, {
      params: guestId ? { guestId } : undefined,
    });
    return response.data;
  },

  async declineFriendlyInvite(id: string) {
    const response = await axiosInstance.post(`/friends/matches/${id}/decline`);
    return response.data;
  },

  async cancelFriendlyInvite(id: string) {
    const response = await axiosInstance.post(`/friends/matches/${id}/cancel`);
    return response.data;
  },
};
