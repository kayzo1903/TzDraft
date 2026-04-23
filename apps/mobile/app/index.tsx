import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Dimensions,
  TouchableOpacity,
  Image,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const Emoji = ({ children }: { children: string }) => (
  <Text style={{ fontSize: 30 }}>{children}</Text>
);

import { useRouter, useFocusEffect } from "expo-router";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "../src/auth/auth-store";
import { API_URL } from "../src/lib/api";
import { PulseDot } from "../src/components/ui/PulseDot";
import { ThemedModal } from "../src/components/ui/ThemedModal";
import api from "../src/lib/api";
import { ServiceCard } from "../src/components/ServiceCard";
import { MobileAnnouncementBanner } from "../src/components/communications/MobileAnnouncementBanner";
import { AnnouncementModal } from "../src/components/communications/AnnouncementModal";
import { GuestBarrierModal } from "../src/components/auth/GuestBarrierModal";
import { useMobileCommunicationCenter } from "../src/hooks/useMobileCommunicationCenter";
import {
  User,
  Swords,
  Bell,
  Settings,
  Circle,
  Activity,
  Check,
  X,
  Zap,
  Timer,
  Clock,
  Layers,
  Flame,
} from "lucide-react-native";
import { colors } from "../src/theme/colors";
import { socialService, SocialUser } from "../src/services/social.service";
import { useSocket } from "../src/hooks/useSocket";
import { matchService } from "../src/lib/match-service";

const { width } = Dimensions.get("window");

// Non-brand card accent colors
const CARD_COLORS = {
  online: "#3b82f6", // blue
  ai: "#8b5cf6", // violet
  friend: "#10b981", // emerald
  freePlay: "#06b6d4", // cyan
  learn: "#f59e0b", // amber
  tournaments: "#eab308", // gold
  history: "#6366f1", // indigo
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
  const [friends, setFriends] = useState<SocialUser[]>([]);
  const [isFriendsLoading, setIsFriendsLoading] = useState(false);
  // Loading state on the challenge button — stays set until accepted or cancelled
  const [challengingUsername, setChallengingUsername] = useState<string | null>(null);
  const pendingGameIdRef = useRef<string | null>(null);

  // Incoming challenge — recipient sees this modal
  type IncomingChallenge = {
    challengerId: string;
    challengerName: string;
    challengerAvatarUrl?: string | null;
    challengerRating?: number;
    inviteCode: string;
    gameId: string;
  };
  const [incomingChallenge, setIncomingChallenge] = useState<IncomingChallenge | null>(null);
  const [challengeCountdown, setChallengeCountdown] = useState(30);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { socket } = useSocket();

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
        fetchFriends();
      }

      return () => {
        isActive = false;
      };
    }, [isAuthenticated, isGuest])
  );

  // WS: incoming challenge request (recipient side)
  useEffect(() => {
    if (!socket) return;

    const handleChallengeRequest = (data: IncomingChallenge) => {
      setIncomingChallenge(data);
      setChallengeCountdown(30);
      if (countdownRef.current) clearInterval(countdownRef.current);
      countdownRef.current = setInterval(() => {
        setChallengeCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countdownRef.current!);
            countdownRef.current = null;
            setIncomingChallenge(null);
            return 30;
          }
          return prev - 1;
        });
      }, 1000);
    };

    // WS: challenge accepted — clear loading and navigate to the started game
    const handleChallengeAccepted = ({ gameId }: { gameId: string }) => {
      setChallengingUsername(null);
      pendingGameIdRef.current = null;
      router.push({
        pathname: "/game/online-game",
        params: { gameId, isHost: "true", source: "challenge" },
      });
    };

    // WS: recipient declined — stop loading on challenger's button
    const handleChallengeCancelled = () => {
      setChallengingUsername(null);
      pendingGameIdRef.current = null;
      dismissIncomingChallenge();
    };

    socket.on("challenge_request", handleChallengeRequest);
    socket.on("challenge_accepted", handleChallengeAccepted);
    socket.on("challenge_cancelled", handleChallengeCancelled);
    return () => {
      socket.off("challenge_request", handleChallengeRequest);
      socket.off("challenge_accepted", handleChallengeAccepted);
      socket.off("challenge_cancelled", handleChallengeCancelled);
    };
  }, [socket]);

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

  const fetchFriends = async () => {
    setIsFriendsLoading(true);
    try {
      const data = await socialService.getFriends();
      setFriends(data);
    } catch (err) {
      console.error("[Home] Failed to fetch friends:", err);
    } finally {
      setIsFriendsLoading(false);
    }
  };

  const dismissIncomingChallenge = () => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    setIncomingChallenge(null);
    setChallengeCountdown(30);
  };

  const handleAcceptChallenge = async () => {
    if (!incomingChallenge) return;
    const { inviteCode, gameId } = incomingChallenge;
    dismissIncomingChallenge();
    try {
      await matchService.joinInviteGame(inviteCode);
      // Game is now ACTIVE (auto-started on join) — go straight to the board
      router.push({
        pathname: "/game/online-game",
        params: { gameId, isHost: "false", source: "challenge" },
      });
    } catch (err) {
      console.error("[Challenge] Failed to join:", err);
    }
  };

  const handleSendChallenge = async (friend: SocialUser) => {
    if (challengingUsername) return;
    setChallengingUsername(friend.username);
    try {
      const { gameId } = await socialService.challenge(friend.username);
      // Keep button loading — WS challenge_accepted/challenge_cancelled will clear it
      pendingGameIdRef.current = gameId;
    } catch (err) {
      console.error("[Challenge] Failed to send:", err);
      setChallengingUsername(null);
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
                    ...(isOnline ? { source: "lobby" } : {}),
                  },
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

          {/* ── Friends Strip ── */}
          {isAuthenticated && !isGuest && (
            <View style={styles.friendsSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionHeaderTitle}>{t("home.friends", "Friends")}</Text>
                {friends.length > 0 && (
                  <TouchableOpacity onPress={() => router.push("/community/friends")}>
                    <Text style={styles.viewAllText}>{t("home.seeAll", "See All")}</Text>
                  </TouchableOpacity>
                )}
              </View>

              {isFriendsLoading ? (
                <ActivityIndicator size="small" color={colors.textDisabled} style={{ alignSelf: "flex-start" }} />
              ) : friends.length === 0 ? (
                <Text style={styles.noFriendsText}>
                  {t("home.noFriends", "Follow someone and play a game to add friends")}
                </Text>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.friendsScroll}>
                  {friends.slice(0, 10).map((f) => (
                    <TouchableOpacity
                      key={f.id}
                      style={[styles.friendCard, f.isOnline && styles.friendCardOnline]}
                      onPress={() => router.push(`/game/player/${f.id}` as any)}
                      activeOpacity={0.85}
                    >
                      {/* Avatar row */}
                      <View style={styles.friendAvatarWrapper}>
                        {f.avatarUrl ? (
                          <Image source={{ uri: f.avatarUrl }} style={styles.friendAvatar} />
                        ) : (
                          <View style={styles.friendAvatarPlaceholder}>
                            <User color={colors.textDisabled} size={24} />
                          </View>
                        )}
                        <View style={styles.onlineDotContainer}>
                          <PulseDot online={!!f.isOnline} size={14} />
                        </View>
                      </View>

                      {/* Name */}
                      <Text style={styles.friendName} numberOfLines={1}>
                        {f.displayName || f.username}
                      </Text>

                      {/* ELO */}
                      <Text style={styles.friendElo}>{f.rating?.rating ?? 1200}</Text>

                      {/* Challenge text button */}
                      <TouchableOpacity
                        style={[
                          styles.challengeBtn,
                          !f.isOnline && styles.challengeBtnOffline,
                          challengingUsername === f.username && styles.challengeBtnActive,
                        ]}
                        onPress={(e) => {
                          e.stopPropagation?.();
                          handleSendChallenge(f);
                        }}
                        disabled={challengingUsername !== null}
                      >
                        {challengingUsername === f.username ? (
                          <ActivityIndicator size={12} color={colors.onPrimary} />
                        ) : (
                          <Text style={[styles.challengeBtnText, !f.isOnline && styles.challengeBtnTextOffline]}>
                            {t("home.challenge", "Challenge")}
                          </Text>
                        )}
                      </TouchableOpacity>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>
          )}

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
                <Text style={styles.recentLabel}>{t("home.recentResults", "Recent Results")}</Text>
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
                          <Text
                            style={[
                              styles.resultText,
                              game.result === "WIN" && styles.winText,
                              game.result === "LOSS" && styles.lossText,
                              game.result === "DRAW" && styles.drawResultText,
                            ]}
                          >
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

      {/* ── Incoming Challenge Modal (recipient) ── */}
      <Modal visible={!!incomingChallenge} transparent animationType="fade" onRequestClose={dismissIncomingChallenge}>
        <View style={styles.challengeOverlay}>
          <View style={styles.challengeModal}>
            <View style={styles.challengeIconRow}>
              {incomingChallenge?.challengerAvatarUrl ? (
                <Image source={{ uri: incomingChallenge.challengerAvatarUrl }} style={styles.challengeAvatar} />
              ) : (
                <Swords size={32} color={colors.primary} />
              )}
            </View>
            <Text style={styles.challengeTitle}>
              {t("home.challengeTitle", "Ombi la Mchezo")}
            </Text>
            <Text style={styles.challengeFrom}>
              {incomingChallenge?.challengerName ?? "Someone"}{" "}
              {incomingChallenge?.challengerRating ? `(${incomingChallenge.challengerRating}) ` : ""}
              {t("home.challengeSuffix", "anataka kucheza")}
            </Text>
            <View style={styles.challengeCountdownRow}>
              <Text style={styles.challengeCountdownText}>{challengeCountdown}s</Text>
            </View>
            <View style={styles.challengeActions}>
              <TouchableOpacity
                style={styles.challengeDeclineBtn}
                onPress={async () => {
                  const gameId = incomingChallenge?.gameId;
                  dismissIncomingChallenge();
                  if (gameId) {
                    try { await api.post(`/games/${gameId}/abort`); } catch {}
                  }
                }}
              >
                <X color="#fff" size={24} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.challengeAcceptBtn} onPress={handleAcceptChallenge}>
                <Check color="#000" size={24} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
  friendsSection: {
    marginTop: 8,
    marginBottom: 8,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  sectionHeaderTitle: {
    color: colors.textSubtle,
    fontSize: 12,
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  viewAllText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "bold",
  },
  friendsScroll: {
    gap: 10,
    paddingHorizontal: 4,
    paddingBottom: 4,
  },
  friendCard: {
    alignItems: "center",
    width: 110,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 14,
    paddingHorizontal: 8,
    gap: 4,
  },
  friendCardOnline: {
    borderColor: "rgba(34, 197, 94, 0.35)",
  },
  friendAvatarWrapper: {
    position: "relative",
    marginBottom: 4,
  },
  friendAvatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 2,
    borderColor: colors.border,
  },
  friendAvatarPlaceholder: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  onlineDotContainer: {
    position: "absolute",
    bottom: 2,
    right: 2,
  },
  friendName: {
    color: colors.foreground,
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
  },
  friendElo: {
    color: colors.textSubtle,
    fontSize: 11,
    fontWeight: "600",
  },
  challengeBtn: {
    marginTop: 6,
    width: "100%",
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 30,
  },
  challengeBtnOffline: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  challengeBtnActive: {
    opacity: 0.6,
  },
  challengeBtnText: {
    color: colors.onPrimary,
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  challengeBtnTextOffline: {
    color: colors.textDisabled,
  },
  noFriendsText: {
    color: colors.textDisabled,
    fontSize: 12,
    fontStyle: "italic",
    paddingHorizontal: 4,
  },
  // Incoming challenge modal
  challengeOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  challengeModal: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 28,
    width: "100%",
    maxWidth: 360,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  challengeIconRow: {
    marginBottom: 16,
    alignItems: "center",
  },
  challengeAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  challengeTitle: {
    color: colors.foreground,
    fontSize: 20,
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 8,
  },
  challengeFrom: {
    color: colors.textSecondary,
    fontSize: 15,
    textAlign: "center",
    marginBottom: 20,
  },
  challengeCountdownRow: {
    marginBottom: 24,
  },
  challengeCountdownText: {
    color: colors.primary,
    fontSize: 32,
    fontWeight: "900",
  },
  challengeActions: {
    flexDirection: "row",
    gap: 30,
    width: "100%",
    justifyContent: "center",
  },
  challengeDeclineBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.danger,
    alignItems: "center",
    justifyContent: "center",
  },
  challengeAcceptBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
});
