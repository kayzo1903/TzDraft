import axiosInstance from "@/lib/axios";

export interface AppNotification {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  metadata: Record<string, any> | null;
  read: boolean;
  createdAt: string;
}

export const notificationService = {
  async list(limit = 20, offset = 0): Promise<AppNotification[]> {
    const res = await axiosInstance.get("/notifications", { params: { limit, offset } });
    return res.data;
  },

  async unreadCount(): Promise<number> {
    const res = await axiosInstance.get("/notifications/unread-count");
    return res.data.count;
  },

  async markRead(id: string): Promise<void> {
    await axiosInstance.patch(`/notifications/${id}/read`);
  },

  async markAllRead(): Promise<void> {
    await axiosInstance.patch("/notifications/read-all");
  },
};
