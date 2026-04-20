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
} from "lucide-react-native";
import { colors } from "../src/theme/colors";

export default function CommunityHub() {
  const { t } = useTranslation();
  const router = useRouter();

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

  return (
    <SafeAreaView style={styles.container} edges={["left", "right", "bottom"]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft color={colors.foreground} size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("community.title", "Community")}</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.heroSection}>
          <Text style={styles.heroTitle}>{t("community.heroTitle", "Join the Elite")}</Text>
          <Text style={styles.heroSubtitle}>
            {t("community.heroSubtitle", "Connect with players, compete in events, and climb the rankings.")}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t("community.discover", "Discover")}</Text>
          <CommunityCard
            icon={Trophy}
            title={t("community.tournaments", "Active Tournaments")}
            subtitle={t("community.tournamentsDesc", "Join official prize pools and special events")}
            onPress={() => router.push("/game/tournaments")}
          />
          <CommunityCard
            icon={Medal}
            title={t("community.leaderboard", "Global Leaderboard")}
            subtitle={t("community.leaderboardDesc", "See where you stand among the world's best")}
            onPress={() => router.push("/game/leaderboard")}
            color="#ec4899"
          />
        </View>

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
});
