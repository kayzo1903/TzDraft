import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { LoadingScreen } from "../src/components/ui/LoadingScreen";
import {
  ArrowLeft,
  Bell,
  BellOff,
  Trophy,
  Swords,
  Medal,
  CheckCheck,
  ChevronRight,
  CircleAlert,
  Flag,
  Users,
} from "lucide-react-native";
import api from "../src/lib/api";
import { colors } from "../src/theme/colors";

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
  metadata?: Record<string, any>;
}

const TYPE_META: Record<string, { icon: React.ElementType; color: string }> = {
  TOURNAMENT_REGISTERED: { icon: Trophy,       color: "#f97316" },
  TOURNAMENT_STARTED:    { icon: Flag,          color: "#38bdf8" },
  TOURNAMENT_CANCELLED:  { icon: CircleAlert,   color: "#ef4444" },
  TOURNAMENT_COMPLETED:  { icon: Medal,         color: "#fbbf24" },
  MATCH_ASSIGNED:        { icon: Users,         color: "#a78bfa" },
  MATCH_STARTED:         { icon: Swords,        color: "#38bdf8" },
  MATCH_RESULT:          { icon: Trophy,        color: "#10b981" },
  ROUND_ADVANCED:        { icon: ChevronRight,  color: "#f97316" },
  ELIMINATED:            { icon: Flag,          color: "#ef4444" },
};

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60)   return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400)return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function NotificationsScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await api.get("/notifications?limit=50");
      setNotifications(res.data);
    } catch (e) {
      console.error("[Notifications] Fetch failed:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotifications();
  };

  const markRead = async (id: string) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
    } catch (e) {
      console.error("[Notifications] Mark read failed:", e);
    }
  };

  const markAllRead = async () => {
    setMarkingAll(true);
    try {
      await api.patch("/notifications/read-all");
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (e) {
      console.error("[Notifications] Mark all read failed:", e);
    } finally {
      setMarkingAll(false);
    }
  };

  const handlePress = (n: Notification) => {
    if (!n.read) markRead(n.id);
    // Navigate to relevant screen based on type
    if (n.metadata?.tournamentId) {
      router.push(`/game/tournament/${n.metadata.tournamentId}`);
    }
  };

  const renderItem = (n: Notification) => {
    const meta = TYPE_META[n.type] ?? { icon: Bell, color: colors.primary };
    const Icon = meta.icon;

    return (
      <TouchableOpacity
        key={n.id}
        style={[styles.item, !n.read && styles.itemUnread]}
        onPress={() => handlePress(n)}
        activeOpacity={0.7}
      >
        {/* Icon */}
        <View style={[styles.iconWrap, { backgroundColor: meta.color + "18" }]}>
          <Icon size={20} color={meta.color} />
        </View>

        {/* Content */}
        <View style={styles.itemContent}>
          <View style={styles.itemHeader}>
            <Text style={[styles.itemTitle, !n.read && styles.itemTitleUnread]} numberOfLines={1}>
              {n.title}
            </Text>
            <Text style={styles.itemTime}>{timeAgo(n.createdAt)}</Text>
          </View>
          <Text style={styles.itemBody} numberOfLines={2}>
            {n.body}
          </Text>
        </View>

        {/* Unread dot */}
        {!n.read && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.root} edges={["left", "right", "bottom"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft color={colors.foreground} size={24} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>
          {t("nav.notifications", "Notifications")}
          {unreadCount > 0 && (
            <Text style={styles.headerBadge}> · {unreadCount}</Text>
          )}
        </Text>

        {unreadCount > 0 ? (
          <TouchableOpacity
            style={styles.markAllBtn}
            onPress={markAllRead}
            disabled={markingAll}
          >
            {markingAll ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <CheckCheck size={20} color={colors.primary} />
            )}
          </TouchableOpacity>
        ) : (
          <View style={{ width: 44 }} />
        )}
      </View>

      {/* Body */}
      {loading ? (
        <LoadingScreen />
      ) : (
        <ScrollView
          style={styles.list}
          contentContainerStyle={notifications.length === 0 ? styles.emptyContainer : styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
        >
          {notifications.length === 0 ? (
            <View style={styles.empty}>
              <BellOff size={48} color={colors.surfaceElevated} />
              <Text style={styles.emptyTitle}>All caught up</Text>
              <Text style={styles.emptySub}>
                Tournament updates, match results, and round changes will appear here.
              </Text>
            </View>
          ) : (
            <>
              {/* Unread section */}
              {notifications.filter((n) => !n.read).length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionLabel}>New</Text>
                  {notifications.filter((n) => !n.read).map(renderItem)}
                </View>
              )}

              {/* Read section */}
              {notifications.filter((n) => n.read).length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionLabel}>Earlier</Text>
                  {notifications.filter((n) => n.read).map(renderItem)}
                </View>
              )}
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    height: 60,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    color: colors.foreground,
    fontSize: 18,
    fontWeight: "bold",
  },
  headerBadge: {
    color: colors.primary,
  },
  markAllBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.primaryAlpha10,
    borderWidth: 1,
    borderColor: colors.primaryAlpha30,
    alignItems: "center",
    justifyContent: "center",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 32,
  },
  emptyContainer: {
    flex: 1,
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 48,
    gap: 16,
  },
  emptyTitle: {
    color: colors.foreground,
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
  },
  emptySub: {
    color: colors.textSubtle,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  section: {
    paddingTop: 20,
    paddingHorizontal: 16,
    gap: 8,
  },
  sectionLabel: {
    color: colors.textSubtle,
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginBottom: 4,
    paddingHorizontal: 4,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  itemUnread: {
    backgroundColor: colors.primaryAlpha05,
    borderColor: colors.primaryAlpha15,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  itemContent: {
    flex: 1,
    gap: 4,
  },
  itemHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  itemTitle: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: "600",
  },
  itemTitleUnread: {
    color: colors.foreground,
    fontWeight: "700",
  },
  itemTime: {
    color: colors.textDisabled,
    fontSize: 11,
    flexShrink: 0,
  },
  itemBody: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    flexShrink: 0,
  },
});
