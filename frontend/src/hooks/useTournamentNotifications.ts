"use client";

import { useEffect, useState, useCallback } from "react";
import { useSocket } from "@/hooks/useSocket";
import { notificationService, AppNotification } from "@/services/notification.service";
import { useAuth } from "@/hooks/useAuth";

export interface UseTournamentNotificationsResult {
  notifications: AppNotification[];
  unreadCount: number;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  loading: boolean;
}

export function useTournamentNotifications(): UseTournamentNotificationsResult {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  // Initial fetch
  useEffect(() => {
    if (!user) return;
    setLoading(true);
    Promise.all([notificationService.list(), notificationService.unreadCount()])
      .then(([list, count]) => {
        setNotifications(list);
        setUnreadCount(count);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  // Real-time WS push
  useEffect(() => {
    if (!socket) return;

    const onNotification = (notif: AppNotification) => {
      setNotifications((prev) => [notif, ...prev]);
      if (!notif.read) setUnreadCount((c) => c + 1);
    };

    socket.on("notification", onNotification);
    return () => {
      socket.off("notification", onNotification);
    };
  }, [socket]);

  const markRead = useCallback(async (id: string) => {
    await notificationService.markRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
    setUnreadCount((c) => Math.max(0, c - 1));
  }, []);

  const markAllRead = useCallback(async () => {
    await notificationService.markAllRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  }, []);

  return { notifications, unreadCount, markRead, markAllRead, loading };
}
