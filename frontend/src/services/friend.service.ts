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
};
