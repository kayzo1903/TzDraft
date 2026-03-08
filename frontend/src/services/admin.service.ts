import axiosInstance from "@/lib/axios";

export interface AdminStats {
  totalUsers: number;
  activeGames: number;
  gamesPlayedToday: number;
}

export interface AdminUser {
  id: string;
  username: string;
  displayName: string;
  email: string | null;
  phoneNumber: string;
  role: "USER" | "ADMIN";
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

  async getHealth(): Promise<unknown> {
    const response = await axiosInstance.get("/admin/health");
    return response.data;
  },
};
