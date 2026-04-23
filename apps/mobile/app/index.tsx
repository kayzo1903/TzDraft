import React, { useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, Dimensions, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const Emoji = ({ children }: { children: string }) => (
  <Text style={{ fontSize: 30 }}>{children}</Text>
);

import { useRouter, useFocusEffect } from "expo-router";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "../src/auth/auth-store";
import api from "../src/lib/api";
import { matchService } from "../src/lib/match-service";
import { ServiceCard } from "../src/components/ServiceCard";
import { MobileAnnouncementBanner } from "../src/components/communications/MobileAnnouncementBanner";
import { AnnouncementModal } from "../src/components/communications/AnnouncementModal";
import { GuestBarrierModal } from "../src/components/auth/GuestBarrierModal";
import { useMobileCommunicationCenter } from "../src/hooks/useMobileCommunicationCenter";
import {
  Zap,
  Timer,
  Clock,
  Layers,
} from "lucide-react-native";
import { colors } from "../src/theme/colors";

const { width } = Dimensions.get("window");

// Non-brand card accent colors
const CARD_COLORS = {
  online:      "#3b82f6", // blue
  ai:          "#8b5cf6", // violet
  friend:      "#10b981", // emerald
  freePlay:    "#06b6d4", // cyan
  learn:       "#f59e0b", // amber
  tournaments: "#eab308", // gold
  history:     "#6366f1", // indigo
  leaderboard: "#ec4899", // pink
} as const;

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
  const {
    featuredCampaign,
    modalCampaign,
    dismissBanner,
    dismissPopupPermanently,
    markCampaignRead,
    trackInteraction,
    getCampaignRoute,
  } = useMobileCommunicationCenter();
  const isGuest = user?.accountType === "GUEST";
  const [showGuestPopup, setShowGuestPopup] = useState(isGuest);
  const [pendingRoute, setPendingRoute] = useState<string | null>(null);

  const [recentGames, setRecentGames] = useState<any[]>([]);
  const [isLoadingRecent, setIsLoadingRecent] = useState(false);
  const [activeGame, setActiveGame] = useState<{ id: string; gameType: string } | null>(null);

  useFocusEffect(
    React.useCallback(() => {
      let isActive = true;

      const fetchActive = async () => {
        try {
          const game = await matchService.getActiveGame();
          if (isActive) {
            setActiveGame(game);
          }
        } catch (err) {
          console.error("[Home] Failed to fetch active game:", err);
          if (isActive) setActiveGame(null);
        }
      };

      if (isAuthenticated && !isGuest) {
        fetchRecentGames();
        fetchActive();
      }

      return () => {
        isActive = false;
      };
    }, [isAuthenticated, isGuest])
  );

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
    if (!isAuthenticated || isGuest) {
      router.push("/(auth)/login");
    } else {
      router.push("/game/lobby");
    }
  };

  const handlePlayFriend = () => {
    router.push("/game/setup-friend");
  };

  return (
    <SafeAreaView style={styles.root} edges={["left", "right", "bottom"]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {featuredCampaign && (
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
        )}

        <AnnouncementModal
          campaign={modalCampaign ?? null}
          isVisible={!!modalCampaign}
          onClose={() => {
            if (modalCampaign) dismissPopupPermanently(modalCampaign.id).catch(() => {});
          }}
          onAction={() => {
            if (modalCampaign) {
              markCampaignRead(modalCampaign.id).catch(() => {});
              trackInteraction(modalCampaign.id, "clicked").catch(() => {});
              dismissPopupPermanently(modalCampaign.id).catch(() => {});
              router.push(getCampaignRoute(modalCampaign) as any);
            }
          }}
        />

        {activeGame && (
          <View style={styles.activeGameBanner}>
            <View style={styles.activeGameBannerLeft}>
              <View style={styles.pulseDot} />
              <Text style={styles.activeGameBannerTitle}>{t("home.matchInProgress", "Match in Progress")}</Text>
            </View>
            <TouchableOpacity 
              style={styles.rejoinButton}
              onPress={() => {
                const isOnline = activeGame.gameType === "RANKED" || activeGame.gameType === "CASUAL";
                router.push({ 
                  pathname: "/game/online-game", 
                  params: { 
                    gameId: activeGame.id, 
                    isHost: "false",
                    ...(isOnline ? { source: "lobby" } : {})
                  } 
                });
              }}
            >
              <Text style={styles.rejoinButtonText}>{t("home.rejoinGame", "Rejoin Game")}</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.section}>
          <ServiceCard
            title={t("game.playOnline", "Play Online")}
            subtitle={t("game.onlineDescription", "Test your skills against players worldwide")}
            onPress={handlePlayOnline}
            iconColor={CARD_COLORS.online}
            icon={<Emoji>🌐</Emoji>}
          />
          <ServiceCard
            title={t("game.playAI", "Play vs AI")}
            subtitle={t("game.aiDescription", "Challenge our top-tier neural engine")}
            onPress={() => router.push("/game/setup-ai")}
            iconColor={CARD_COLORS.ai}
            icon={<Emoji>🤖</Emoji>}
          />
          <ServiceCard
            title={t("game.playFriend", "Play vs Friend")}
            subtitle={t("game.friendDescription", "Local or private online matches")}
            onPress={handlePlayFriend}
            iconColor={CARD_COLORS.friend}
            icon={<Emoji>🤝</Emoji>}
          />
          <ServiceCard
            title={t("freePlay.title", "Free Play")}
            subtitle={t("freePlay.description", "Control both sides, manual board flip")}
            onPress={() => router.push("/game/free-play")}
            iconColor={CARD_COLORS.freePlay}
            icon={<Emoji>♟️</Emoji>}
          />
          <ServiceCard
            title={t("learn.heading", "Learn & Master")}
            subtitle={t("learn.subheading", "Study tactics, rules, and gamebooks")}
            onPress={() => router.push("/learn")}
            iconColor={CARD_COLORS.learn}
            icon={<Emoji>📚</Emoji>}
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
            iconColor={CARD_COLORS.tournaments}
            icon={<Emoji>🏆</Emoji>}
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
                iconColor={CARD_COLORS.history}
                icon={<Emoji>📋</Emoji>}
              />
            </>
          )}

          <ServiceCard
            title={t("home.leaderboard", "Leaderboard")}
            subtitle={t("home.leaderboardDesc", "View global rankings and top players")}
            onPress={() => router.push("/game/leaderboard")}
            iconColor={CARD_COLORS.leaderboard}
            icon={<Emoji>🏅</Emoji>}
          />
        </View>

        <GuestBarrierModal
          visible={showGuestPopup}
          onClose={() => {
            setShowGuestPopup(false);
            setPendingRoute(null);
          }}
          onContinueAsGuest={() => {
            if (pendingRoute) {
              router.push(pendingRoute);
            }
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
  activeGameBanner: {
    backgroundColor: colors.primaryAlpha15,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.primaryAlpha30,
    padding: 16,
    marginBottom: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  activeGameBannerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  pulseDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  activeGameBannerTitle: {
    color: colors.foreground,
    fontSize: 16,
    fontWeight: "bold",
  },
  rejoinButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  rejoinButtonText: {
    color: "#000",
    fontWeight: "900",
    fontSize: 13,
    textTransform: "uppercase",
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
