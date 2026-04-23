import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { LoadingScreen } from "../src/components/ui/LoadingScreen";
import { MobileAnnouncementBanner } from "../src/components/communications/MobileAnnouncementBanner";
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
  FlaskConical,
  Megaphone,
} from "lucide-react-native";
import { colors } from "../src/theme/colors";
import { useNotifications } from "../src/hooks/useNotifications";
import type { AppNotification } from "../src/hooks/useNotifications";
import { useMobileCommunicationCenter } from "../src/hooks/useMobileCommunicationCenter";
import { getNotificationRoute, sendPreviewNotification } from "../src/lib/push-notifications";

const TYPE_META: Record<string, { icon: React.ElementType; color: string }> = {
  TOURNAMENT_REGISTERED: { icon: Trophy,       color: "#f97316" },
  TOURNAMENT_STARTED:    { icon: Flag,          color: "#38bdf8" },
  TOURNAMENT_CANCELLED:  { icon: CircleAlert,   color: "#ef4444" },
  TOURNAMENT_COMPLETED:  { icon: Medal,         color: "#fbbf24" },
  MATCH_ASSIGNED:        { icon: Users,         color: "#a78bfa" },
  MATCH_STARTED:        { icon: Swords,        color: "#38bdf8" },
  MATCH_RESULT:          { icon: Trophy,        color: "#10b981" },
  ROUND_ADVANCED:        { icon: ChevronRight,  color: "#f97316" },
  ELIMINATED:            { icon: Flag,          color: "#ef4444" },
  ADMIN_ANNOUNCEMENT:    { icon: Megaphone,     color: "#38bdf8" },
  ADMIN_PROMOTION:       { icon: Bell,          color: "#f97316" },
  ADMIN_ALERT:           { icon: CircleAlert,   color: "#ef4444" },
  ADMIN_ENGAGEMENT:      { icon: Users,         color: "#10b981" },
};

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60)    return `${diff}s ago`;
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// ---------------------------------------------------------------------------
// Toast shown after firing a preview notification
// ---------------------------------------------------------------------------

function PreviewToast({ visible, label }: { visible: boolean; label: string }) {
  const opacity = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.delay(2000),
        Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start();
    }
  }, [visible, label]);

  return (
    <Animated.View style={[styles.toast, { opacity }]} pointerEvents="none">
      <FlaskConical size={14} color={colors.primary} />
      <Text style={styles.toastText}>{label}</Text>
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------

export default function NotificationsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const {
    notifications,
    unreadCount,
    loading,
    refreshing,
    refresh,
    markRead,
    markAllRead,
    injectPreview,
  } = useNotifications();
  const {
    featuredCampaign,
    inboxItems: campaignInboxItems,
    unreadCount: campaignUnreadCount,
    markCampaignRead,
    trackInteraction,
    dismissBanner,
    getCampaignRoute,
  } = useMobileCommunicationCenter();

  const [markingAll, setMarkingAll] = React.useState(false);
  const [previewing, setPreviewing] = React.useState(false);
  const [toastLabel, setToastLabel] = React.useState("");
  const [toastKey, setToastKey] = React.useState(0);
  const combinedUnreadCount = unreadCount + campaignUnreadCount;
  const combinedNotifications = React.useMemo<AppNotification[]>(
    () =>
      [...campaignInboxItems, ...notifications].sort(
        (left, right) =>
          new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
      ),
    [campaignInboxItems, notifications],
  );

  const handleMarkAllRead = async () => {
    setMarkingAll(true);
    try {
      await Promise.all([
        markAllRead(),
        ...campaignInboxItems
          .filter((item) => !item.read)
          .map((item) => markCampaignRead(item.campaignId)),
      ]);
    } finally {
      setMarkingAll(false);
    }
  };

  const handlePreview = async () => {
    if (previewing) return;
    setPreviewing(true);
    try {
      const sample = await sendPreviewNotification();
      injectPreview(sample);
      setToastLabel(`${sample.type}`);
      setToastKey((k) => k + 1);
    } finally {
      setPreviewing(false);
    }
  };

  const handlePress = (n: AppNotification) => {
    const isCampaign = n.metadata?.source === "ADMIN_CAMPAIGN";

    if (isCampaign) {
      markCampaignRead(String(n.metadata?.campaignId ?? n.id)).catch(() => {});
      trackInteraction(String(n.metadata?.campaignId ?? n.id), "clicked").catch(() => {});
    } else if (!n.read) {
      markRead(n.id).catch(() => {});
    }

    const route = getNotificationRoute(n.metadata);
    if (route) {
      router.push(route as any);
      return;
    }

    if (isCampaign && featuredCampaign?.id === n.id) {
      router.push(getCampaignRoute(featuredCampaign) as any);
    }
  };

  const renderItem = (n: AppNotification) => {
    const meta = TYPE_META[n.type] ?? { icon: Bell, color: colors.primary };
    const Icon = meta.icon;

    return (
      <TouchableOpacity
        key={n.id}
        style={[styles.item, !n.read && styles.itemUnread]}
        onPress={() => handlePress(n)}
        activeOpacity={0.7}
      >
        <View style={[styles.iconWrap, { backgroundColor: meta.color + "18" }]}>
          <Icon size={20} color={meta.color} />
        </View>

        <View style={styles.itemContent}>
          <View style={styles.itemHeader}>
            <Text
              style={[styles.itemTitle, !n.read && styles.itemTitleUnread]}
              numberOfLines={1}
            >
              {n.title}
            </Text>
            <Text style={styles.itemTime}>{timeAgo(n.createdAt)}</Text>
          </View>
          <Text style={styles.itemBody} numberOfLines={2}>
            {n.body}
          </Text>
        </View>

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
          {t("notifications.title")}
          {combinedUnreadCount > 0 && (
            <Text style={styles.headerBadge}> · {combinedUnreadCount}</Text>
          )}
        </Text>

        <View style={styles.headerActions}>
          {/* Dev-only preview button */}
          {__DEV__ && (
            <TouchableOpacity
              style={[styles.iconBtn, styles.previewBtn]}
              onPress={handlePreview}
              disabled={previewing}
              accessibilityLabel={t("notifications.devPreviewHint")}
            >
              {previewing ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <FlaskConical size={18} color={colors.primary} />
              )}
            </TouchableOpacity>
          )}

          {combinedUnreadCount > 0 ? (
            <TouchableOpacity
              style={[styles.iconBtn, styles.markAllBtn]}
              onPress={handleMarkAllRead}
              disabled={markingAll}
            >
              {markingAll ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <CheckCheck size={20} color={colors.primary} />
              )}
            </TouchableOpacity>
          ) : (
            /* spacer so title stays centred when no unread */
            !__DEV__ && <View style={{ width: 44 }} />
          )}
        </View>
      </View>

      {/* Body */}
      {loading ? (
        <LoadingScreen />
      ) : (
        <ScrollView
          style={styles.list}
          contentContainerStyle={
            combinedNotifications.length === 0
              ? styles.emptyContainer
              : styles.listContent
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refresh}
              tintColor={colors.primary}
            />
          }
        >
          {featuredCampaign && (
            <View style={styles.featuredBannerWrap}>
              <MobileAnnouncementBanner
                campaign={featuredCampaign}
                onDismiss={() => {
                  dismissBanner(featuredCampaign.id).catch(() => {});
                }}
                onPress={() => {
                  markCampaignRead(featuredCampaign.id).catch(() => {});
                  trackInteraction(featuredCampaign.id, "clicked").catch(() => {});
                  router.push(getCampaignRoute(featuredCampaign) as any);
                }}
              />
            </View>
          )}

          {combinedNotifications.length === 0 ? (
            <View style={styles.empty}>
              <BellOff size={48} color={colors.surfaceElevated} />
              <Text style={styles.emptyTitle}>
                {t("notifications.emptyTitle", "All caught up")}
              </Text>
              <Text style={styles.emptySub}>
                {t(
                  "notifications.emptySub",
                  "Tournament updates, admin announcements, and reminder campaigns will appear here.",
                )}
                {__DEV__ &&
                  `\n\n${t("notifications.devPreviewHint", "Tap 🧪 to preview each notification type.")}`}
              </Text>
            </View>
          ) : (
            <>
              {combinedNotifications.filter((n) => !n.read).length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionLabel}>New</Text>
                  {combinedNotifications.filter((n) => !n.read).map(renderItem)}
                </View>
              )}
              {combinedNotifications.filter((n) => n.read).length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionLabel}>Earlier</Text>
                  {combinedNotifications.filter((n) => n.read).map(renderItem)}
                </View>
              )}
            </>
          )}
        </ScrollView>
      )}

      {/* Toast feedback */}
      {__DEV__ && (
        <PreviewToast key={toastKey} visible={toastKey > 0} label={toastLabel} />
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
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  previewBtn: {
    backgroundColor: colors.primaryAlpha05,
    borderColor: colors.primaryAlpha15,
  },
  markAllBtn: {
    backgroundColor: colors.primaryAlpha10,
    borderColor: colors.primaryAlpha30,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 32,
  },
  featuredBannerWrap: {
    paddingHorizontal: 16,
    paddingTop: 16,
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
  toast: {
    position: "absolute",
    bottom: 32,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primaryAlpha30,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  toastText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "600",
  },
});
