import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  Trophy,
  Medal,
  ChevronRight,
  BellRing,
  ShieldAlert,
  Sparkles,
} from "lucide-react-native";
import { colors } from "../src/theme/colors";
import { useMobileCommunicationCenter } from "../src/hooks/useMobileCommunicationCenter";
import { getCampaignTheme } from "../src/lib/communication-center";

export default function CommunityHub() {
  const { t } = useTranslation();
  const router = useRouter();
  const { campaigns, getCampaignDetailRoute } = useMobileCommunicationCenter();
  const announcementCampaigns = campaigns.filter(
    (campaign) => campaign.status === "LIVE" || campaign.status === "SENT",
  );

  const CommunityCard = ({ icon: Icon, title, subtitle, onPress, color = colors.primary }: any) => (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={[styles.iconContainer, { backgroundColor: `${color}18` }]}>
        <Icon color={color} size={28} />
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardSubtitle}>{subtitle}</Text>
      </View>
      <ChevronRight color={colors.textDisabled} size={20} />
    </TouchableOpacity>
  );

  const AnnouncementCard = ({ campaign }: any) => {
    const theme = getCampaignTheme(campaign.type);
    const Icon =
      campaign.type === "ALERT"
        ? ShieldAlert
        : campaign.type === "PROMOTION"
        ? Sparkles
        : BellRing;

    return (
      <TouchableOpacity
        style={[styles.announcementCard, { borderColor: theme.primary + "30" }]}
        onPress={() => router.push(getCampaignDetailRoute(campaign.id) as any)}
      >
        <View style={styles.announcementTopRow}>
          <View style={[styles.announcementIconWrap, { backgroundColor: theme.surface }]}>
            <Icon color={theme.primary} size={20} />
          </View>
          <View style={[styles.announcementBadge, { backgroundColor: theme.surface }]}>
            <Text style={[styles.announcementBadgeText, { color: theme.primary }]}>
              {campaign.mobilePresentation.badge}
            </Text>
          </View>
        </View>
        <Text style={styles.announcementTitle}>{campaign.title}</Text>
        <Text style={styles.announcementBody} numberOfLines={3}>
          {campaign.body}
        </Text>
        <View style={styles.announcementFooter}>
          <Text style={styles.announcementMeta}>{campaign.schedule.localLabel}</Text>
          <View style={styles.announcementLink}>
            <Text style={styles.announcementLinkText}>
              {t("community.announcements.openDetails")}
            </Text>
            <ChevronRight color={colors.primary} size={16} />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["left", "right", "bottom"]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft color={colors.foreground} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("community.title")}</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.heroSection}>
          <Text style={styles.heroTitle}>{t("community.heroTitle")}</Text>
          <Text style={styles.heroSubtitle}>
            {t("community.heroSubtitle")}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t("community.discover")}</Text>
          <CommunityCard
            icon={Trophy}
            title={t("community.tournaments")}
            subtitle={t("community.tournamentsDesc")}
            onPress={() => router.push("/game/tournaments")}
          />
          <CommunityCard
            icon={Medal}
            title={t("community.leaderboard")}
            subtitle={t("community.leaderboardDesc")}
            onPress={() => router.push("/game/leaderboard")}
            color="#ec4899"
          />
        </View>

        {announcementCampaigns.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>{t("community.announcements.sectionTitle")}</Text>
            <Text style={styles.sectionIntro}>
              {t("community.announcements.sectionIntro")}
            </Text>
            {announcementCampaigns.map((campaign) => (
              <AnnouncementCard key={campaign.id} campaign={campaign} />
            ))}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
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
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerTitle: {
    color: colors.foreground,
    fontSize: 18,
    fontWeight: "bold",
  },
  scrollContent: {
    padding: 12,
  },
  heroSection: {
    marginBottom: 32,
    marginTop: 10,
  },
  heroTitle: {
    color: colors.foreground,
    fontSize: 32,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    color: colors.textSubtle,
    fontSize: 16,
    marginTop: 8,
    lineHeight: 24,
  },
  section: {
    marginBottom: 32,
    gap: 12,
  },
  sectionLabel: {
    color: colors.textDisabled,
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 2,
    marginBottom: 4,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  cardContent: {
    flex: 1,
    marginLeft: 16,
  },
  cardTitle: {
    color: colors.foreground,
    fontSize: 16,
    fontWeight: "bold",
  },
  cardSubtitle: {
    color: colors.textSubtle,
    fontSize: 12,
  },
  sectionIntro: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 20,
    marginTop: -4,
    marginBottom: 4,
  },
  announcementCard: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
  },
  announcementTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  announcementIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  announcementBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  announcementBadgeText: {
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  announcementTitle: {
    marginTop: 14,
    color: colors.foreground,
    fontSize: 17,
    fontWeight: "800",
  },
  announcementBody: {
    marginTop: 8,
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 20,
  },
  announcementFooter: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  announcementMeta: {
    flex: 1,
    color: colors.textDisabled,
    fontSize: 11,
    fontWeight: "700",
  },
  announcementLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  announcementLinkText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
});
