import axiosInstance from "@/lib/axios";

export interface AdminStats {
  totalUsers: number;
  activeGames: number;
  gamesPlayedToday: number;
}

export interface AnalyticsWindow {
  days: number;
  visits: number;
  guestUsers: number;
  revisitUsers: number;
  aiGames: number;
  gamesPlayed: number;
  searches: number;
  matchedSearches: number;
  expiredSearches: number;
  newRegisteredUsers: number;
  tournamentParticipants: number;
  tournamentGamesPlayed: number;
  friendGamesPlayed: number;
  matchPairings: number;
}

export interface AnalyticsTrendPoint {
  date: string;
  newRegisteredUsers: number;
  visits: number;
  guestUsers: number;
  revisitUsers: number;
  aiGames: number;
  gamesPlayed: number;
  searches: number;
  matchedSearches: number;
  tournamentParticipants: number;
  tournamentGamesPlayed: number;
  friendGamesPlayed: number;
  matchPairings: number;
}

export interface TournamentWinner {
  tournamentId: string;
  tournamentName: string;
  winnerId: string | null;
  winnerName: string | null;
  completedAt: string | null;
}

export interface AdminAnalyticsResponse {
  generatedAt: string;
  overview: {
    totalUsers: number;
    totalRegisteredUsers: number;
    activeGames: number;
    totalGames: number;
    totalMatchmakingSearches: number;
    totalTournamentParticipants: number;
    totalTournamentGames: number;
    dailyVisits: number;
    dailyGuestUsers: number;
    dailyRegisteredRevisits: number;
    dailyAiGames: number;
    dailyMatchmakingSearches: number;
    dailyMatchPairings: number;
    dailyFriendMatches: number;
  };
  liveBreakdown: {
    ranked: number;
    casual: number;
    ai: number;
    tournament: number;
    friend: number;
  };
  friendGames: {
    active: number;
    total: number;
  };
  recentTournamentWinners: TournamentWinner[];
  windows: AnalyticsWindow[];
  trend: AnalyticsTrendPoint[];
}

export interface GrowthPoint {
  date: string;
  newUsers: number;
  games: number;
}

export interface GrowthResponse {
  points: GrowthPoint[];
  breakdown: {
    totalVerified: number;
    totalGuests: number;
    totalBanned: number;
  };
}

export interface AdminUser {
  id: string;
  username: string;
  displayName: string;
  email: string | null;
  phoneNumber: string;
  role: "USER" | "ADMIN";
  accountType: "REGISTERED" | "GUEST" | "OAUTH_PENDING";
  isBanned: boolean;
  isVerified: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  rating: { rating: number } | null;
}

export interface AdminUsersResponse {
  data: AdminUser[];
  total: number;
  page: number;
  limit: number;
}

export const adminService = {
  async getStats(): Promise<AdminStats> {
    const response = await axiosInstance.get("/admin/stats");
    return response.data;
  },

  async getUsers(params?: {
    page?: number;
    limit?: number;
    search?: string;
    from?: string;
    to?: string;
  }): Promise<AdminUsersResponse> {
    const response = await axiosInstance.get("/admin/users", { params });
    return response.data;
  },

  async updateRole(
    userId: string,
    role: "USER" | "ADMIN"
  ): Promise<{ id: string; username: string; role: string }> {
    const response = await axiosInstance.patch(`/admin/users/${userId}/role`, {
      role,
    });
    return response.data;
  },

  async updateBan(
    userId: string,
    isBanned: boolean
  ): Promise<{ id: string; username: string; isBanned: boolean }> {
    const response = await axiosInstance.patch(`/admin/users/${userId}/ban`, {
      isBanned,
    });
    return response.data;
  },

  async previewGuestCleanup(olderThanDays: number): Promise<{ count: number; olderThanDays: number }> {
    const response = await axiosInstance.get("/admin/guests/preview", {
      params: { olderThanDays },
    });
    return response.data;
  },

  async cleanupGuests(olderThanDays: number): Promise<{ deleted: number; olderThanDays: number }> {
    const response = await axiosInstance.delete("/admin/guests", {
      params: { olderThanDays },
    });
    return response.data;
  },

  async getGrowth(days = 30): Promise<GrowthResponse> {
    const response = await axiosInstance.get("/admin/growth", { params: { days } });
    return response.data;
  },

  async getAnalytics(): Promise<AdminAnalyticsResponse> {
    const response = await axiosInstance.get("/admin/analytics");
    return response.data;
  },

  async getHealth(): Promise<unknown> {
    const response = await axiosInstance.get("/admin/health");
    return response.data;
  },
};
