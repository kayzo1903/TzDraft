import { useCallback, useEffect, useRef, useState } from "react";
import api from "../lib/api";
import { useSocket } from "./useSocket";

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
  metadata?: Record<string, any>;
}

export interface UseNotificationsResult {
  notifications: AppNotification[];
  unreadCount: number;
  loading: boolean;
  refreshing: boolean;
  refresh: () => void;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  /** Dev-only: prepend a fake notification entry without a server round-trip */
  injectPreview: (sample: { type: string; title: string; body: string }) => void;
}

export function useNotifications(): UseNotificationsResult {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { socket } = useSocket();
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  const fetchNotifications = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const res = await api.get<AppNotification[]>("/notifications?limit=50");
      if (isMounted.current) setNotifications(res.data);
    } catch {
      // silently fail; user can pull-to-refresh
    } finally {
      if (isMounted.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Real-time WebSocket delivery
  useEffect(() => {
    if (!socket) return;

    const onNotification = (notif: AppNotification) => {
      if (!isMounted.current) return;
      setNotifications((prev) => {
        // Deduplicate — server may re-send on reconnect
        if (prev.some((n) => n.id === notif.id)) return prev;
        return [notif, ...prev];
      });
    };

    socket.on("notification", onNotification);
    return () => { socket.off("notification", onNotification); };
  }, [socket]);

  const markRead = useCallback(async (id: string) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
    } catch {
      // ignore
    }
  }, []);

  const markAllRead = useCallback(async () => {
    try {
      await api.patch("/notifications/read-all");
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch {
      // ignore
    }
  }, []);

  const injectPreview = useCallback(
    (sample: { type: string; title: string; body: string }) => {
      const fake: AppNotification = {
        id: `preview-${Date.now()}`,
        type: sample.type,
        title: sample.title,
        body: sample.body,
        read: false,
        createdAt: new Date().toISOString(),
        metadata: { tournamentId: "preview" },
      };
      setNotifications((prev) => [fake, ...prev]);
    },
    [],
  );

  const unreadCount = notifications.filter((n) => !n.read).length;

  return {
    notifications,
    unreadCount,
    loading,
    refreshing,
    refresh: () => fetchNotifications(true),
    markRead,
    markAllRead,
    injectPreview,
  };
}
