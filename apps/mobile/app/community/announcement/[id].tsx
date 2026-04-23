import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { ArrowLeft, ArrowRight } from "lucide-react-native";
import { colors } from "../../../src/theme/colors";
import { useMobileCommunicationCenter } from "../../../src/hooks/useMobileCommunicationCenter";
import { getCampaignTheme } from "../../../src/lib/communication-center";
import {
  communicationTypeLabels,
} from "@tzdraft/shared-client";

export default function CommunityAnnouncementDetailScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getMobileCampaignById, getCampaignRoute, markCampaignRead, trackInteraction } =
    useMobileCommunicationCenter();
  const campaign = id ? getMobileCampaignById(id) : null;

  React.useEffect(() => {
    if (campaign) {
      markCampaignRead(campaign.id).catch(() => {});
    }
  }, [campaign, markCampaignRead]);

  if (!campaign) {
    return (
      <SafeAreaView style={styles.container} edges={["left", "right", "bottom"]}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft color={colors.foreground} size={24} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t("community.announcements.detailTitle")}</Text>
          <View style={{ width: 44 }} />
        </View>
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>{t("community.announcements.notFoundTitle")}</Text>
          <Text style={styles.emptySubtitle}>
            {t("community.announcements.notFoundSubtitle")}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const theme = getCampaignTheme(campaign.type);

  return (
    <SafeAreaView style={styles.container} edges={["left", "right", "bottom"]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft color={colors.foreground} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("community.announcements.detailTitle")}</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={[styles.heroCard, { borderColor: theme.primary + "40" }]}>
          <View style={styles.heroTopRow}>
            <View style={[styles.heroBadge, { backgroundColor: theme.surface }]}>
              <Text style={[styles.heroBadgeText, { color: theme.primary }]}>
                {campaign.mobilePresentation.badge}
              </Text>
            </View>
            <View style={[styles.heroBadge, { backgroundColor: colors.surfaceElevated }]}>
              <Text style={styles.heroMetaText}>{communicationTypeLabels[campaign.type]}</Text>
            </View>
          </View>

          <Text style={styles.heroEyebrow}>{campaign.mobilePresentation.eyebrow}</Text>
          <Text style={styles.heroTitle}>{campaign.title}</Text>
          <Text style={styles.heroBody}>{campaign.body}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("community.announcements.fullDetails")}</Text>
          <Text style={styles.sectionBody}>{campaign.mobilePresentation.bannerBody}</Text>
        </View>

        <TouchableOpacity
          style={[styles.ctaButton, { backgroundColor: theme.primary }]}
          onPress={() => {
            trackInteraction(campaign.id, "clicked").catch(() => {});
            router.push(getCampaignRoute(campaign) as any);
          }}
        >
          <Text style={styles.ctaText}>{campaign.cta.label}</Text>
          <ArrowRight size={18} color="#0f172a" />
        </TouchableOpacity>
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
    padding: 16,
    paddingBottom: 40,
  },
  heroCard: {
    backgroundColor: colors.surface,
    borderRadius: 28,
    padding: 20,
    borderWidth: 1,
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  heroBadge: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  heroBadgeText: {
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  heroMetaText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  heroEyebrow: {
    marginTop: 16,
    color: colors.textSubtle,
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 1.4,
  },
  heroTitle: {
    marginTop: 10,
    color: colors.foreground,
    fontSize: 28,
    fontWeight: "900",
    lineHeight: 32,
  },
  heroBody: {
    marginTop: 12,
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 24,
  },
  metaGrid: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },
  metaCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  metaLabel: {
    color: colors.textDisabled,
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  metaValue: {
    color: colors.foreground,
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20,
  },
  section: {
    marginTop: 16,
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: {
    color: colors.foreground,
    fontSize: 16,
    fontWeight: "800",
  },
  sectionBody: {
    marginTop: 10,
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 22,
  },
  ctaButton: {
    marginTop: 20,
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  ctaText: {
    color: "#0f172a",
    fontSize: 14,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  emptyTitle: {
    color: colors.foreground,
    fontSize: 20,
    fontWeight: "800",
  },
  emptySubtitle: {
    marginTop: 10,
    color: colors.textMuted,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 22,
  },
});
