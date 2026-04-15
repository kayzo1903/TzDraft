import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Image, ActivityIndicator, ScrollView, Dimensions, Modal } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "../src/auth/auth-store";
import api from "../src/lib/api";
import { MiniBoard } from "../src/components/MiniBoard";
import { ServiceCard } from "../src/components/ServiceCard";
import {
  Trophy,
  History,
  Zap,
  Timer,
  Clock,
  Layers,
  Users,
  Cpu,
  ArrowRight,
  UserPlus,
  Medal,
  Sparkles,
} from "lucide-react-native";
import { colors } from "../src/theme/colors";

const { width } = Dimensions.get("window");

interface GuestModalProps {
  visible: boolean;
  onClose: () => void;
  onSignup: () => void;
}

const GuestRegistrationModal = ({ visible, onClose, onSignup }: GuestModalProps) => {
  const { t } = useTranslation();

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalIconContainer}>
            <UserPlus size={40} color={colors.primary} />
          </View>
          <Text style={styles.modalTitle}>
            {t("auth.guestPopup.title", "Join the Community!")}
          </Text>
          <Text style={styles.modalText}>
            {t("auth.guestPopup.subtitle", "You are currently playing as a guest. Register now to save your ratings, track your history, and join tournaments!")}
          </Text>
          <TouchableOpacity
            style={styles.modalPrimaryButton}
            onPress={onSignup}
          >
            <Text style={styles.modalPrimaryButtonText}>
              {t("auth.guestPopup.primaryAction", "Create Free Account")}
            </Text>
            <ArrowRight size={18} color={colors.onPrimary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.modalSecondaryButton}
            onPress={onClose}
          >
            <Text style={styles.modalSecondaryButtonText}>
              {t("auth.guestPopup.secondaryAction", "Continue as Guest")}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const StatsGrid = ({ user }: { user: any }) => (
  <View style={styles.statsGrid}>
    <View style={styles.statItem}>
      <Zap size={20} color={colors.primary} style={styles.statIcon} />
      <Text style={styles.statLabel}>Blitz</Text>
      <Text style={styles.statValue}>{user?.rating || 1200}</Text>
    </View>
    <View style={styles.statItem}>
      <Timer size={20} color={colors.primary} style={styles.statIcon} />
      <Text style={styles.statLabel}>Rapid</Text>
      <Text style={styles.statValue}>-</Text>
    </View>
    <View style={styles.statItem}>
      <Clock size={20} color={colors.primary} style={styles.statIcon} />
      <Text style={styles.statLabel}>Classic</Text>
      <Text style={styles.statValue}>-</Text>
    </View>
    <View style={styles.statItem}>
      <Layers size={20} color={colors.primary} style={styles.statIcon} />
      <Text style={styles.statLabel}>All</Text>
      <Text style={styles.statValue}>0</Text>
    </View>
  </View>
);

export default function Home() {
  const { t } = useTranslation();
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const isGuest = user?.accountType === "GUEST";
  const [showGuestPopup, setShowGuestPopup] = useState(isGuest);

  const [recentGames, setRecentGames] = useState<any[]>([]);
  const [isLoadingRecent, setIsLoadingRecent] = useState(false);

  React.useEffect(() => {
    if (isAuthenticated && !isGuest) {
      fetchRecentGames();
    }
  }, [isAuthenticated, isGuest]);

  const fetchRecentGames = async () => {
    setIsLoadingRecent(true);
    try {
      const response = await api.get("/games/history?take=5");
      setRecentGames(response.data.data.items || []);
    } catch (err) {
      console.error("[Home] Failed to fetch recent games:", err);
    } finally {
      setIsLoadingRecent(false);
    }
  };

  const handlePlayOnline = () => {
    if (!isAuthenticated) {
      router.push("/welcome");
    } else {
      router.push("/game/lobby");
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={["left", "right", "bottom"]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        <View style={styles.section}>
          <ServiceCard
            title={t("game.playOnline", "Play Online")}
            subtitle={t("game.onlineDescription", "Test your skills against players worldwide")}
            onPress={handlePlayOnline}
            icon={<MiniBoard size={54} />}
          />
          <ServiceCard
            title={t("game.playAI", "Play vs AI")}
            subtitle={t("game.aiDescription", "Challenge our top-tier neural engine")}
            onPress={() => router.push("/game/setup-ai")}
            icon={<Cpu size={54} color={colors.primary} />}
          />
          <ServiceCard
            title={t("game.playFriend", "Play vs Friend")}
            subtitle={t("game.friendDescription", "Local or private online matches")}
            onPress={() => router.push("/game/setup-friend")}
            icon={<Users size={54} color={colors.primary} />}
          />
          <ServiceCard
            title={t("freePlay.title", "Free Play")}
            subtitle={t("freePlay.description", "Control both sides, manual board flip")}
            onPress={() => router.push("/game/free-play")}
            icon={<MiniBoard size={54} />}
          />
        </View>

        {!isGuest && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("home.stats", "Your Stats")}</Text>
            <StatsGrid user={user} />
          </View>
        )}

        <View style={styles.section}>
          <ServiceCard
            title={t("home.tournaments", "Tournaments")}
            subtitle={t("home.tournamentDesc", "Join official prize tournaments")}
            onPress={() => router.push("/game/tournaments")}
            icon={<Trophy size={54} color={colors.primary} />}
          />

          {!isGuest && (
            <>
              <View style={styles.recentResultsRow}>
                <Text style={styles.recentLabel}>
                  {t("home.recentResults", "Recent Results")}
                </Text>
                {isLoadingRecent ? (
                  <ActivityIndicator size="small" color={colors.textDisabled} />
                ) : (
                  <View style={styles.badgeContainer}>
                    {recentGames.length > 0 ? (
                      recentGames.map((game) => (
                        <View
                          key={game.id}
                          style={[
                            styles.resultBadge,
                            game.result === "WIN" && styles.winBadge,
                            game.result === "DRAW" && styles.drawBadge,
                            game.result === "LOSS" && styles.lossBadge,
                          ]}
                        >
                          <Text style={[
                            styles.resultText,
                            game.result === "WIN" && styles.winText,
                            game.result === "LOSS" && styles.lossText,
                            game.result === "DRAW" && styles.drawResultText,
                          ]}>
                            {game.result === "WIN" ? "W" : game.result === "DRAW" ? "D" : "L"}
                          </Text>
                        </View>
                      ))
                    ) : (
                      <Text style={styles.noGamesText}>{t("home.noGames", "No games yet")}</Text>
                    )}
                  </View>
                )}
              </View>
              <ServiceCard
                title={t("home.history", "Game History")}
                subtitle={t("home.historyDesc", "Review and analyze your past matches")}
                onPress={() => router.push("/game/history")}
                icon={<History size={54} color={colors.primary} />}
              />
            </>
          )}

          <ServiceCard
            title={t("home.leaderboard", "Leaderboard")}
            subtitle={t("home.leaderboardDesc", "View global rankings and top players")}
            onPress={() => router.push("/game/leaderboard")}
            icon={<Medal size={54} color={colors.primary} />}
          />
        </View>

        <GuestRegistrationModal
          visible={showGuestPopup}
          onClose={() => setShowGuestPopup(false)}
          onSignup={() => {
            setShowGuestPopup(false);
            router.push("/(auth)/signup");
          }}
        />
        <View style={styles.footerSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: 16,
    paddingTop: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: colors.foreground,
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 16,
    paddingLeft: 4,
    textTransform: "uppercase",
    letterSpacing: 2,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  statItem: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  statIcon: {
    marginBottom: 8,
  },
  statLabel: {
    color: colors.textSubtle,
    fontSize: 12,
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  statValue: {
    color: colors.foreground,
    fontSize: 24,
    fontWeight: "900",
    marginTop: 4,
  },
  footerSpacer: {
    height: 40,
  },
  // Leaderboard section (unused but retained for future use)
  leaderboardSection: {
    marginTop: 24,
    marginBottom: 8,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  sectionHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionTitleSmall: {
    color: colors.foreground,
    fontSize: 14,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  viewAllText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "bold",
  },
  leaderboardCard: {
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderRadius: 24,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
  },
  leaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  leaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  rankBadge: {
    width: 24,
    height: 24,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    alignItems: "center",
    justifyContent: "center",
  },
  rankGold: { backgroundColor: colors.rankGold },
  rankSilver: { backgroundColor: colors.rankSilver },
  rankBronze: { backgroundColor: colors.rankBronze },
  rankText: {
    color: colors.textSubtle,
    fontSize: 11,
    fontWeight: "900",
  },
  rankTextDark: {
    color: colors.onPrimary,
  },
  leaderName: {
    color: colors.foreground,
    fontSize: 14,
    fontWeight: "bold",
    maxWidth: width * 0.4,
  },
  leaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  ratingText: {
    color: colors.win,
    fontSize: 12,
    fontWeight: "900",
  },
  loaderContainer: {
    padding: 20,
    alignItems: "center",
  },
  emptyText: {
    color: colors.textDisabled,
    fontSize: 12,
    textAlign: "center",
    padding: 20,
  },
  // Guest modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "center",
    padding: 24,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: 32,
    padding: 32,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primaryAlpha10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  modalTitle: {
    color: colors.foreground,
    fontSize: 22,
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 12,
  },
  modalText: {
    color: colors.textMuted,
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 28,
  },
  modalPrimaryButton: {
    backgroundColor: colors.primary,
    width: "100%",
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 12,
  },
  modalPrimaryButtonText: {
    color: colors.onPrimary,
    fontSize: 16,
    fontWeight: "bold",
  },
  modalSecondaryButton: {
    width: "100%",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  modalSecondaryButtonText: {
    color: colors.textSubtle,
    fontSize: 14,
    fontWeight: "600",
  },
  // Recent results
  recentResultsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  recentLabel: {
    color: colors.textSubtle,
    fontSize: 12,
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  badgeContainer: {
    flexDirection: "row",
    gap: 6,
  },
  resultBadge: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  winBadge: {
    backgroundColor: "rgba(34, 197, 94, 0.15)",
    borderColor: "rgba(34, 197, 94, 0.3)",
  },
  drawBadge: {
    backgroundColor: "rgba(120, 113, 108, 0.15)",
    borderColor: "rgba(120, 113, 108, 0.3)",
  },
  lossBadge: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    borderColor: "rgba(239, 68, 68, 0.3)",
  },
  resultText: {
    fontSize: 12,
    fontWeight: "900",
    color: colors.textSubtle,
  },
  winText: {
    color: colors.success,
  },
  lossText: {
    color: colors.danger,
  },
  drawResultText: {
    color: colors.textMuted,
  },
  noGamesText: {
    color: colors.textDisabled,
    fontSize: 12,
    fontStyle: "italic",
  },
});
