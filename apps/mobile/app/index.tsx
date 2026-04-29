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
  Platform,
  Alert,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

const Emoji = ({ children }: { children: string }) => (
  <Text style={{ fontSize: 30 }}>{children}</Text>
);

import { useRouter, useFocusEffect, useLocalSearchParams } from "expo-router";
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
  Check,
  X,
  Clock,
  AlertCircle,
  Gamepad2,
} from "lucide-react-native";
import { colors } from "../src/theme/colors";
import { socialService, SocialUser } from "../src/services/social.service";
import { useSocket } from "../src/hooks/useSocket";
import { matchService } from "../src/lib/match-service";
import { getSavedAiGameInfo } from "../src/hooks/useAiGame";

const { width } = Dimensions.get("window");

// Non-brand card accent colors
const CARD_COLORS = {
  online: "#3b82f6", // blue
  ai: "#8b5cf6", // violet
  friend: "#10b981", // emerald
  freePlay: "#06b6d4", // cyan
  learn: "#f59e0b", // amber
  puzzles: "#f97316", // orange (primary)
  tournaments: "#eab308", // gold
  history: "#6366f1", // indigo
  leaderboard: "#ec4899", // pink
} as const;


export default function Home() {
  const { t } = useTranslation();
  const router = useRouter();
  const { challenge } = useLocalSearchParams<{ challenge: string }>();
  const { isAuthenticated, user } = useAuthStore();
  const insets = useSafeAreaInsets();
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
  const activeGameRef = useRef<any>(null);
  const challengingUsernameRef = useRef<string | null>(null);
  const friendsRef = useRef<SocialUser[]>([]);
  const sentCountdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const challengeCancelledRef = useRef(false);

  // Sync activeGame to ref for use in socket listeners
  useEffect(() => {
    activeGameRef.current = activeGame;
  }, [activeGame]);

  const [errorModalVisible, setErrorModalVisible] = useState(false);
  const [errorModalMessage, setErrorModalMessage] = useState("");

  // Auto-dismiss error modal after 3 seconds
  useEffect(() => {
    if (!errorModalVisible) return;
    const t = setTimeout(() => setErrorModalVisible(false), 3000);
    return () => clearTimeout(t);
  }, [errorModalVisible]);

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

  const challengeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Auto-challenge if coming from profile with ?challenge=username
  useEffect(() => {
    if (challenge && friends.length > 0 && isAuthenticated) {
      const friend = friends.find(f => f.username === challenge);
      if (friend) {
        handleSendChallenge(friend);
        // Clear param so we don't re-challenge on every mount/focus
        router.setParams({ challenge: undefined } as any);
      }
    }
  }, [challenge, friends, isAuthenticated]);

  // WS: incoming challenge request (recipient side)
  useEffect(() => {
    if (!socket) return;

    const handleChallengeRequest = async (data: IncomingChallenge) => {
      // Fast path: ref is already populated
      if (activeGameRef.current) return;

      // Re-verify with backend to catch the race where the player just joined a
      // game between the server's busy-check and the WS emit arriving here.
      try {
        const fresh = await matchService.getActiveGame();
        if (fresh) {
          setActiveGame(fresh);
          activeGameRef.current = fresh;
          return;
        }
      } catch {
        // If the check fails, fall through and show the challenge
      }

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
      challengingUsernameRef.current = null;
      setSentCountdown(30);
      if (sentCountdownIntervalRef.current) {
        clearInterval(sentCountdownIntervalRef.current);
        sentCountdownIntervalRef.current = null;
      }
      pendingGameIdRef.current = null;
      if (challengeTimeoutRef.current) {
        clearTimeout(challengeTimeoutRef.current);
        challengeTimeoutRef.current = null;
      }
      router.push({
        pathname: "/game/online-game",
        params: { gameId, isHost: "true", source: "challenge" },
      });
    };

    // WS: challenge cancelled or declined — clear loading state and show the right message
    const handleChallengeCancelled = (data: { gameId: string; reason?: 'declined' | 'cancelled' }) => {
      if (pendingGameIdRef.current === data.gameId) {
        const displayName =
          friendsRef.current.find(f => f.username === challengingUsernameRef.current)?.displayName ||
          challengingUsernameRef.current ||
          t("common.player", "The player");
        setChallengingUsername(null);
        challengingUsernameRef.current = null;
        setSentCountdown(30);
        if (sentCountdownIntervalRef.current) {
          clearInterval(sentCountdownIntervalRef.current);
          sentCountdownIntervalRef.current = null;
        }
        pendingGameIdRef.current = null;
        if (challengeTimeoutRef.current) {
          clearTimeout(challengeTimeoutRef.current);
          challengeTimeoutRef.current = null;
        }
        const msg = t("home.deniedBusy", { name: displayName });
        setErrorModalMessage(msg);
        setErrorModalVisible(true);
      }
      if (incomingChallenge?.gameId === data.gameId) {
        setIncomingChallenge(null);
      }
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
      friendsRef.current = data;
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

  const [sentCountdown, setSentCountdown] = useState(30);

  const handleCancelChallenge = async () => {
    const gameId = pendingGameIdRef.current;
    challengeCancelledRef.current = true;
    setChallengingUsername(null);
    challengingUsernameRef.current = null;
    pendingGameIdRef.current = null;
    setSentCountdown(30);
    if (sentCountdownIntervalRef.current) {
      clearInterval(sentCountdownIntervalRef.current);
      sentCountdownIntervalRef.current = null;
    }
    if (challengeTimeoutRef.current) {
      clearTimeout(challengeTimeoutRef.current);
      challengeTimeoutRef.current = null;
    }
    if (gameId) {
      try { await api.post(`/games/${gameId}/abort`); } catch {}
    }
  };

  const handleSendChallenge = async (friend: SocialUser) => {
    if (challengingUsernameRef.current !== null) return;
    challengeCancelledRef.current = false;

    if (activeGameRef.current) {
      setErrorModalMessage(t("home.requesterBusy"));
      setErrorModalVisible(true);
      return;
    }

    challengingUsernameRef.current = friend.username;
    setChallengingUsername(friend.username);
    setSentCountdown(30);

    if (sentCountdownIntervalRef.current) clearInterval(sentCountdownIntervalRef.current);
    sentCountdownIntervalRef.current = setInterval(() => {
      setSentCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(sentCountdownIntervalRef.current!);
          sentCountdownIntervalRef.current = null;
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    if (challengeTimeoutRef.current) clearTimeout(challengeTimeoutRef.current);
    challengeTimeoutRef.current = setTimeout(() => {
      setChallengingUsername(null);
      challengingUsernameRef.current = null;
      pendingGameIdRef.current = null;
      if (sentCountdownIntervalRef.current) {
        clearInterval(sentCountdownIntervalRef.current);
        sentCountdownIntervalRef.current = null;
      }
      setSentCountdown(30);
      challengeTimeoutRef.current = null;
    }, 30000);

    try {
      const { gameId } = await socialService.challenge(friend.username);
      if (challengeCancelledRef.current) {
        // User cancelled while the request was in flight — abort immediately
        try { await api.post(`/games/${gameId}/abort`); } catch {}
        return;
      }
      pendingGameIdRef.current = gameId;
    } catch (err: any) {
      console.error("[Challenge] Failed to send:", err);
      setChallengingUsername(null);
      challengingUsernameRef.current = null;
      setSentCountdown(30);
      if (sentCountdownIntervalRef.current) {
        clearInterval(sentCountdownIntervalRef.current);
        sentCountdownIntervalRef.current = null;
      }
      if (challengeTimeoutRef.current) {
        clearTimeout(challengeTimeoutRef.current);
        challengeTimeoutRef.current = null;
      }
      const backendKey = err.response?.data?.message;
      const msg = backendKey ? t(backendKey, { name: friend.displayName }) : t("home.failed", "Failed to send challenge");
      setErrorModalMessage(msg);
      setErrorModalVisible(true);
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
    <SafeAreaView style={styles.root} edges={["left", "right"]}>
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
            onPress={() => {
              getSavedAiGameInfo().then((saved) => {
                if (saved) {
                  router.push(
                    `/game/vs-ai?botLevel=${saved.botLevel}&playerColor=${saved.resolvedColor}&timeControlType=${saved.timeControlType}&timeSeconds=${saved.timeSeconds}` as any,
                  );
                } else {
                  router.push("/game/setup-ai");
                }
              });
            }}
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
          <ServiceCard
            title="Puzzles"
            subtitle="Sharpen your game with tactical positions"
            onPress={() => router.push("/game/puzzles" as any)}
            iconColor={CARD_COLORS.puzzles}
            icon={<Emoji>🧩</Emoji>}
          />
        </View>

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

      {/* --- Sticky Play Online Button --- */}
      <View style={[styles.stickyFooter, { paddingBottom: Math.max(insets.bottom, 16) + 16 }]}>
        <TouchableOpacity
          style={styles.stickyPlayButton}
          onPress={handlePlayOnline}
          activeOpacity={0.8}
        >
          <View style={styles.stickyPlayButtonContent}>
            <Gamepad2 color={colors.onPrimary} size={24} strokeWidth={2.5} />
            <Text style={styles.stickyPlayButtonText}>
              {t("game.playOnline", "Play Online")}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* ── Outgoing Challenge Bottom Sheet ── */}
      <Modal
        visible={!!challengingUsername}
        transparent
        animationType="slide"
        onRequestClose={handleCancelChallenge}
      >
        <View style={styles.challengeSheetOverlay}>
          <View style={styles.challengeSheetContent}>
            <View style={styles.challengeSheetHandle} />

            <View style={styles.challengeSheetTitleRow}>
              <Swords color={colors.primary} size={18} />
              <Text style={styles.challengeSheetTitle}>{t("home.challengeSent", "Challenge Sent")}</Text>
            </View>

            {(() => {
              const f = friends.find(fr => fr.username === challengingUsername);
              return (
                <View style={styles.challengeSheetProfile}>
                  {f?.avatarUrl ? (
                    <Image source={{ uri: f.avatarUrl }} style={styles.challengeSheetAvatar} />
                  ) : (
                    <View style={styles.challengeSheetAvatarPlaceholder}>
                      <User color={colors.textDisabled} size={32} />
                    </View>
                  )}
                  <Text style={styles.challengeSheetName}>{f?.displayName || challengingUsername}</Text>
                  <Text style={styles.challengeSheetElo}>ELO {f?.rating?.rating ?? 1200}</Text>
                </View>
              );
            })()}

            <View style={styles.challengeSheetWaiting}>
              <ActivityIndicator color={colors.primary} size="large" />
              <Text style={styles.challengeSheetWaitingText}>{t("home.waitingForAccept", "Waiting…")}</Text>
              <Text style={styles.challengeSheetCountdown}>
                {t("home.challengeExpiresIn", "Expires in")} {sentCountdown}s
              </Text>
            </View>

            <View style={styles.challengeSheetCancelRow}>
              <TouchableOpacity style={styles.challengeCancelBtn} onPress={handleCancelChallenge} activeOpacity={0.8}>
                <X color={colors.foreground} size={22} />
              </TouchableOpacity>
              <Text style={styles.challengeCancelLabel}>{t("home.cancelChallenge", "Cancel")}</Text>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Incoming Challenge Bottom Sheet ── */}
      <Modal
        visible={!!incomingChallenge}
        transparent
        animationType="slide"
        onRequestClose={undefined}
      >
        <View style={styles.challengeSheetOverlay}>
          <View style={styles.challengeSheetContent}>
            <View style={styles.challengeSheetHandle} />

            <View style={styles.challengeSheetTitleRow}>
              <Swords color={colors.primary} size={18} />
              <Text style={styles.challengeSheetTitle}>{t("home.challengeTitle", "You've Been Challenged!")}</Text>
            </View>

            <View style={styles.challengeSheetProfile}>
              {incomingChallenge?.challengerAvatarUrl ? (
                <Image source={{ uri: incomingChallenge.challengerAvatarUrl }} style={styles.challengeSheetAvatar} />
              ) : (
                <View style={styles.challengeSheetAvatarPlaceholder}>
                  <User color={colors.textDisabled} size={32} />
                </View>
              )}
              <Text style={styles.challengeSheetName}>{incomingChallenge?.challengerName}</Text>
              {incomingChallenge?.challengerRating && (
                <Text style={styles.challengeSheetElo}>ELO {incomingChallenge.challengerRating}</Text>
              )}
              <Text style={styles.challengeSheetSubtitle}>{t("home.challengeSuffix", "wants to play")}</Text>
            </View>

            <Text style={styles.challengeSheetCountdown}>
              {t("home.challengeExpiresIn", "Expires in")} {challengeCountdown}s
            </Text>

            <View style={styles.challengeSheetActions}>
              <TouchableOpacity
                style={[styles.challengeSheetBtn, styles.challengeSheetBtnDecline]}
                onPress={async () => {
                  const gameId = incomingChallenge?.gameId;
                  dismissIncomingChallenge();
                  if (gameId) {
                    try { await api.post(`/games/${gameId}/abort`); } catch {}
                  }
                }}
                activeOpacity={0.8}
              >
                <X color="#fff" size={18} />
                <Text style={styles.challengeSheetBtnText}>{t("common.decline", "Decline")}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.challengeSheetBtn, styles.challengeSheetBtnAccept]}
                onPress={handleAcceptChallenge}
                activeOpacity={0.8}
              >
                <Check color="#000" size={18} />
                <Text style={[styles.challengeSheetBtnText, { color: "#000" }]}>
                  {t("common.accept", "Accept")} ({challengeCountdown}s)
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <ThemedModal
        visible={errorModalVisible}
        onClose={() => setErrorModalVisible(false)}
        title={t("home.error", "Challenge Error")}
        icon={AlertCircle}
        iconBg={colors.dangerAlpha20}
        iconColor={colors.danger}
        actions={[
          {
            label: t("common.ok", "OK"),
            type: "primary",
            onPress: () => setErrorModalVisible(false)
          }
        ]}
      >
        <Text style={styles.errorModalText}>{errorModalMessage}</Text>
      </ThemedModal>

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
  footerSpacer: {
    height: 120,
  },
  stickyFooter: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.background,
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 10,
  },
  stickyPlayButton: {
    height: 56,
    backgroundColor: colors.primary,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  stickyPlayButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  stickyPlayButtonText: {
    color: colors.onPrimary,
    fontSize: 18,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 1,
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
  modalBodyWithAvatar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingVertical: 4,
  },
  modalAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: colors.primaryAlpha30,
  },
  modalAvatarPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  modalInfo: {
    flex: 1,
    gap: 4,
  },
  challengeRating: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "900",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
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
  errorModalText: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
  },
  modalBodyContent: {
    alignItems: "center",
    gap: 8,
  },
  challengeCountdownNoteText: {
    color: colors.textMuted,
    fontSize: 13,
  },
  challengeSheetOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: "flex-end",
  },
  challengeSheetContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    paddingBottom: 40,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  challengeSheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: colors.surfaceElevated,
    borderRadius: 2,
    marginBottom: 20,
  },
  challengeSheetTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 20,
  },
  challengeSheetTitle: {
    color: colors.foreground,
    fontSize: 18,
    fontWeight: "bold",
  },
  challengeSheetProfile: {
    alignItems: "center",
    marginBottom: 20,
    width: "100%",
  },
  challengeSheetAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: colors.primaryAlpha30,
    marginBottom: 10,
  },
  challengeSheetAvatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  challengeSheetName: {
    color: colors.foreground,
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 2,
  },
  challengeSheetElo: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "900",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    marginBottom: 4,
  },
  challengeSheetSubtitle: {
    color: colors.textMuted,
    fontSize: 14,
    marginTop: 4,
  },
  challengeSheetWaiting: {
    alignItems: "center",
    gap: 8,
    marginBottom: 20,
  },
  challengeSheetWaitingText: {
    color: colors.textMuted,
    fontSize: 14,
  },
  challengeSheetCountdown: {
    color: colors.textDisabled,
    fontSize: 12,
    marginBottom: 24,
  },
  challengeSheetCancelRow: {
    alignItems: "center",
    gap: 8,
  },
  challengeCancelBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  challengeCancelLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  challengeSheetActions: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  challengeSheetBtn: {
    flex: 1,
    height: 52,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  challengeSheetBtnDecline: {
    backgroundColor: colors.danger,
  },
  challengeSheetBtnAccept: {
    backgroundColor: colors.primary,
  },
  challengeSheetBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "bold",
  },
});
