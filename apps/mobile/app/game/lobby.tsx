import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
  Alert,
  ScrollView,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  Users,
  Zap,
  Clock,
  Shield,
  Search,
  X,
  Trophy,
  Lock,
  WifiOff,
  Globe,
  Shuffle,
  ChevronDown,
} from "lucide-react-native";
import { colors } from "../../src/theme/colors";
import { matchService } from "../../src/lib/match-service";
import { useSocket } from "../../src/hooks/useSocket";
import { useAuthStore } from "../../src/auth/auth-store";
import { getCachedMaxUnlockedLevel } from "../../src/lib/game/bot-progression";

/** Fixed time pool while player base is small */
const QUEUE_TIME_MS = 5 * 60 * 1000; // 5 minutes

/** Mirrors web: 60 s before showing the "no match yet" hint */
const SEARCH_TIMEOUT_SECONDS = 60;

export default function OnlineLobby() {
  const { t } = useTranslation();
  const router = useRouter();
  const { socket, connected } = useSocket();
  const { user } = useAuthStore();
  const insets = useSafeAreaInsets();

  const [isSearching, setIsSearching] = useState(false);
  const [searchSeconds, setSearchSeconds] = useState(SEARCH_TIMEOUT_SECONDS);
  const [timeoutReached, setTimeoutReached] = useState(false);
  const [queueError, setQueueError] = useState<string | null>(null);
  const [counts, setCounts] = useState({ online: 0, searching: 0 });

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const pulseLoop = useRef<Animated.CompositeAnimation | null>(null);
  const rotateLoop = useRef<Animated.CompositeAnimation | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Prevent double-navigation when matchFound fires
  const navigatingRef = useRef(false);

  // ── Animations ───────────────────────────────────────────────────────────
  const startAnimations = () => {
    pulseLoop.current = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 900,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.ease),
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.ease),
        }),
      ]),
    );
    rotateLoop.current = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 2500,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    pulseLoop.current.start();
    rotateLoop.current.start();
  };

  const stopAnimations = () => {
    pulseLoop.current?.stop();
    rotateLoop.current?.stop();
    pulseAnim.setValue(1);
    rotateAnim.setValue(0);
  };

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  // ── Navigate to matched game ──────────────────────────────────────────────
  const goToGame = useCallback(
    (gameId: string) => {
      if (navigatingRef.current) return;
      navigatingRef.current = true;
      router.replace({
        pathname: "/game/online-game",
        params: { gameId, isHost: "false", source: "lobby" },
      });
    },
    [router],
  );

  // ── WS: listen for matchFound ─────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;
    const handler = (data: { gameId: string }) => {
      setIsSearching(false);
      goToGame(data.gameId);
    };
    socket.on("matchFound", handler);
    
    const countsHandler = (data: { onlineCount: number; searchingCount: number }) => {
      setCounts({ online: data.onlineCount, searching: data.searchingCount });
    };
    socket.on("playerCountsUpdated", countsHandler);

    return () => { 
      socket.off("matchFound", handler); 
      socket.off("playerCountsUpdated", countsHandler);
    };
  }, [socket, goToGame]);

  // ── Searching countdown ───────────────────────────────────────────────────
  useEffect(() => {
    if (isSearching) {
      setSearchSeconds(SEARCH_TIMEOUT_SECONDS);
      setTimeoutReached(false);
      startAnimations();
      timerRef.current = setInterval(() => {
        setSearchSeconds((s) => {
          if (s <= 1) {
            clearInterval(timerRef.current!);
            timerRef.current = null;
            setTimeoutReached(true);
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    } else {
      stopAnimations();
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSearching]);

  // ── Cleanup on unmount ────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (isSearching) {
        matchService.cancelQueue().catch(() => {});
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formatSearchTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  // ── Start searching ───────────────────────────────────────────────────────
  const handleStartSearch = async () => {
    if (!connected || !socket) {
      Alert.alert(
        "Not connected",
        "Waiting for server connection. Please try again in a moment.",
      );
      return;
    }

    setQueueError(null);
    navigatingRef.current = false;
    setIsSearching(true);

    try {
      const result = await matchService.joinQueue(QUEUE_TIME_MS, socket.id ?? "");
      if (result.status === "matched") {
        setIsSearching(false);
        goToGame(result.gameId);
      }
      // status === "waiting" → stay in searching state, wait for matchFound WS event
    } catch (err: any) {
      const isTimeout =
        err?.code === "ECONNABORTED" ||
        err?.message?.includes("timeout") ||
        err?.message?.includes("aborted");

      if (isTimeout) {
        // HTTP response was dropped but the server is still processing.
        // The server emits "matchFound" via WS to both players, so stay
        // on the searching screen and let the WS listener handle navigation.
        return;
      }

      setIsSearching(false);
      const msg =
        err?.response?.data?.message ??
        err?.message ??
        "Could not join queue. Please try again.";
      setQueueError(typeof msg === "string" ? msg : "Could not join queue.");
    }
  };

  // ── Cancel searching ──────────────────────────────────────────────────────
  const handleCancelSearch = async () => {
    setIsSearching(false);
    setTimeoutReached(false);
    try {
      await matchService.cancelQueue();
    } catch {
      // Ignore — stale entry will be cleaned up server-side within 60 s
    }
  };

  const handleKeepSearching = () => {
    setTimeoutReached(false);
    setSearchSeconds(SEARCH_TIMEOUT_SECONDS);
    timerRef.current = setInterval(() => {
      setSearchSeconds((s) => {
        if (s <= 1) {
          clearInterval(timerRef.current!);
          timerRef.current = null;
          setTimeoutReached(true);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["left", "right", "bottom"]}>
      <View style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 12,
        height: 60,
      }}>
        <TouchableOpacity
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            backgroundColor: colors.surface,
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 1,
            borderColor: colors.border,
          }}
          onPress={() => {
            if (isSearching) handleCancelSearch();
            router.back();
          }}
        >
          <ArrowLeft color={colors.foreground} size={24} />
        </TouchableOpacity>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Globe color={colors.primary} size={20} />
          <Text style={{ color: colors.foreground, fontSize: 18, fontWeight: "bold" }}>{t("lobby.title", "Play Online")}</Text>
        </View>
        <View style={[
          { width: 10, height: 10, borderRadius: 5, marginRight: 4 },
          connected ? { backgroundColor: colors.success } : { backgroundColor: colors.textDisabled }
        ]} />
      </View>

      <ScrollView 
        contentContainerStyle={[styles.scrollContent, isSearching && { flexGrow: 1, justifyContent: "center" }]} 
        showsVerticalScrollIndicator={false}
        scrollEnabled={!isSearching}
      >
        <View style={styles.content}>
          {!isSearching ? (
            <View style={styles.setupSection}>
              {/* Error banner */}
              {queueError ? (
                <View style={styles.errorBanner}>
                  <WifiOff color={colors.danger} size={15} />
                  <Text style={styles.errorText} numberOfLines={2}>{queueError}</Text>
                  <TouchableOpacity onPress={() => setQueueError(null)}>
                    <X color={colors.textMuted} size={15} />
                  </TouchableOpacity>
                </View>
              ) : null}

              {/* Stats row */}
              <View style={styles.statsRow}>
                <View style={styles.statCard}>
                  <Users color={colors.primary} size={20} />
                  <Text style={styles.statValue}>
                    {connected ? counts.online : "—"}
                  </Text>
                  <Text style={styles.statLabel}>
                    {t("lobby.playersOnline", "Online")}
                  </Text>
                </View>
                <View style={styles.statCard}>
                  <Search color={colors.primary} size={20} />
                  <Text style={styles.statValue}>
                    {connected ? counts.searching : "—"}
                  </Text>
                  <Text style={styles.statLabel}>
                    {t("lobby.playersSearching", "Searching")}
                  </Text>
                </View>
                <View style={styles.statCard}>
                  <Trophy color={colors.primary} size={20} />
                  <Text style={styles.statValue}>{user?.username ?? "—"}</Text>
                  <Text style={styles.statLabel}>{t("lobby.you", "You")}</Text>
                </View>
              </View>

              {/* Time control selection */}
              <View style={styles.modeSelection}>
                <Text style={styles.sectionTitle}>
                  {t("lobby.selectMode", "Time Control")}
                </Text>

                <View style={styles.poolNotice}>
                  <Lock color={colors.textDisabled} size={12} />
                  <Text style={styles.poolNoticeText}>
                    {t(
                      "lobby.poolNotice",
                      "Only 5-min Blitz available — more time controls unlock as the player pool grows.",
                    )}
                  </Text>
                </View>

                <View style={styles.grid}>
                  {/* Blitz 5 min — available */}
                  <View style={[styles.modeCard, styles.activeModeCard]}>
                    <Zap color={colors.primary} size={24} />
                    <Text style={styles.modeTitle}>Blitz</Text>
                    <Text style={styles.modeDesc}>{t("setupAi.time.minutes", { minutes: 5 })}</Text>
                  </View>

                  {/* Rapid — coming soon */}
                  <View style={[styles.modeCard, styles.modeCardDisabled]}>
                    <Clock color={colors.textDisabled} size={24} />
                    <Text style={[styles.modeTitle, styles.modeTitleDisabled]}>Rapid</Text>
                    <Text style={[styles.modeDesc, styles.modeDescDisabled]}>10 + 5</Text>
                    <View style={styles.soonBadge}>
                      <Text style={styles.soonBadgeText}>{t("play.modes.online.comingSoon", "SOON")}</Text>
                    </View>
                  </View>

                  {/* Classic — coming soon */}
                  <View style={[styles.modeCard, styles.modeCardDisabled]}>
                    <Shield color={colors.textDisabled} size={24} />
                    <Text style={[styles.modeTitle, styles.modeTitleDisabled]}>Classic</Text>
                    <Text style={[styles.modeDesc, styles.modeDescDisabled]}>30 + 0</Text>
                    <View style={styles.soonBadge}>
                      <Text style={styles.soonBadgeText}>{t("play.modes.online.comingSoon", "SOON")}</Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>
          ) : (
            /* ── Searching screen ─────────────────────────────────────────── */
            <View style={styles.searchSection}>
              <Animated.View
                style={[styles.searchRing, { transform: [{ scale: pulseAnim }] }]}
              >
                <Animated.View style={{ transform: [{ rotate: spin }] }}>
                  <Search color={colors.primary} size={56} strokeWidth={1} />
                </Animated.View>
              </Animated.View>

              <Text style={styles.searchingTitle}>
                {t("lobby.searching", "Searching for Opponent…")}
              </Text>

              <View style={styles.searchTimerBlock}>
                <Text style={styles.searchTimerLabel}>{t("lobby.timeRemaining")}</Text>
                <Text
                  style={[
                    styles.searchTimer,
                    searchSeconds <= 10 && styles.searchTimerDanger,
                  ]}
                >
                  {formatSearchTime(searchSeconds)}
                </Text>
              </View>

              <View style={styles.searchingStats}>
                <Text style={styles.searchingStatsText}>
                  {counts.searching} {t("lobby.othersSearching", "players searching")}
                </Text>
              </View>

              <View style={styles.modeChip}>
                <Zap color={colors.primary} size={14} />
                <Text style={styles.modeChipText}>{t("setupAi.time.minutes", { minutes: 5 })} · Blitz</Text>
              </View>

              {/* Timeout hint — shown once countdown reaches 0 */}
              {timeoutReached && (
                <View style={styles.timeoutCard}>
                  <Text style={styles.timeoutText}>
                    {t("lobby.timeoutHint")}
                  </Text>
                  <View style={styles.timeoutActions}>
                    <TouchableOpacity
                      style={[styles.timeoutBtn, styles.timeoutBtnAI]}
                      onPress={() => {
                        handleCancelSearch();
                        const level = getCachedMaxUnlockedLevel();
                        router.replace(
                          `/game/vs-ai?botLevel=${level}&playerColor=WHITE&timeControlType=timed&timeSeconds=300` as any,
                        );
                      }}
                    >
                      <Zap color={colors.primary} size={15} />
                      <Text style={styles.timeoutBtnAIText}>{t("lobby.matchVsAi")}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.timeoutBtn, styles.timeoutBtnSearch]}
                      onPress={handleKeepSearching}
                    >
                      <Search color={colors.textMuted} size={15} />
                      <Text style={styles.timeoutBtnSearchText}>{t("lobby.searchAgain")}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          )}
        </View>
        {!isSearching && <View style={{ height: 180 }} />}
      </ScrollView>

      {/* Sticky Bottom Footer */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) + 16 }]}>
        {!isSearching ? (
          <>
            <View style={styles.controlsRow}>
              {/* Time Selector (Locked) */}
              <View style={[styles.timeButton, styles.timeButtonLocked]}>
                <Clock color={colors.primary} size={20} />
                <Text style={[styles.controlLabel, { color: colors.primary }]}>
                  {t("setupAi.time.minutes", { minutes: 5 })}
                </Text>
                <Lock color={colors.primary} size={14} />
              </View>

              {/* Color Selector (Locked to Random) */}
              <View style={styles.colorSelector}>
                <View style={[styles.colorIcon, styles.activeColor]}>
                  <Shuffle color={colors.primary} size={20} />
                </View>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.startButton, !connected && styles.startButtonDisabled]}
              onPress={handleStartSearch}
              disabled={!connected}
            >
              <Text style={styles.startButtonText}>
                {connected
                  ? `${t("setupAi.start.cta", "Start Game")} — Blitz`
                  : t("lobby.connecting", "Connecting…")}
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity 
            style={[styles.startButton, { backgroundColor: colors.surface, borderColor: colors.dangerAlpha20, borderWidth: 1 }]} 
            onPress={handleCancelSearch}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <X color={colors.danger} size={20} strokeWidth={3} />
              <Text style={[styles.startButtonText, { color: colors.danger }]}>
                {t("common.cancel", "Cancel Search")}
              </Text>
            </View>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: 20,
    paddingTop: 0,
  },
  content: {
    flex: 1,
    justifyContent: "center",
  },
  setupSection: {
    gap: 28,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.dangerAlpha20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.25)",
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
  },
  errorText: {
    flex: 1,
    color: colors.danger,
    fontSize: 13,
    fontWeight: "bold",
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  statValue: {
    color: colors.foreground,
    fontSize: 15,
    fontWeight: "900",
  },
  statLabel: {
    color: colors.textSubtle,
    fontSize: 12,
  },
  modeSelection: {
    gap: 12,
  },
  sectionTitle: {
    color: colors.foreground,
    fontSize: 16,
    fontWeight: "bold",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  poolNotice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
  },
  poolNoticeText: {
    flex: 1,
    color: colors.textDisabled,
    fontSize: 12,
    lineHeight: 17,
  },
  grid: {
    flexDirection: "row",
    gap: 12,
  },
  modeCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  activeModeCard: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryAlpha05,
  },
  modeCardDisabled: {
    opacity: 0.35,
  },
  modeTitle: {
    color: colors.foreground,
    fontSize: 14,
    fontWeight: "bold",
  },
  modeTitleDisabled: {
    color: colors.textDisabled,
  },
  modeDesc: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "bold",
  },
  modeDescDisabled: {
    color: colors.textDisabled,
  },
  soonBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: colors.surfaceElevated,
    borderRadius: 5,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  soonBadgeText: {
    color: colors.textDisabled,
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.background,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16, // Base; overridden by insets
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  controlsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
    gap: 12,
  },
  timeButton: {
    flex: 1,
    height: 48,
    backgroundColor: colors.surface,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  timeButtonLocked: {
    borderColor: colors.primaryAlpha30,
    backgroundColor: colors.primaryAlpha05,
  },
  controlLabel: {
    flex: 1,
    color: colors.foreground,
    fontSize: 14,
    fontWeight: "bold",
  },
  colorSelector: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  colorIcon: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
  },
  activeColor: {
    backgroundColor: colors.primaryAlpha15,
  },
  startButton: {
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
  startButtonDisabled: {
    backgroundColor: colors.surfaceElevated,
    shadowOpacity: 0,
    elevation: 0,
  },
  startButtonText: {
    color: colors.onPrimary,
    fontSize: 18,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  // ── Searching screen ──────────────────────────────────────────────────────
  searchSection: {
    alignItems: "center",
    justifyContent: "center",
    gap: 28,
    paddingBottom: 40, // Slight offset to look visually centered above footer
  },
  searchRing: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: colors.primaryAlpha05,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.primaryAlpha15,
  },
  searchingTitle: {
    color: colors.foreground,
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
  },
  searchTimerBlock: {
    alignItems: "center",
    gap: 4,
  },
  searchTimerLabel: {
    color: colors.textSubtle,
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  searchTimer: {
    color: colors.primary,
    fontSize: 52,
    fontWeight: "900",
    fontVariant: ["tabular-nums"],
    letterSpacing: 2,
  },
  searchTimerDanger: {
    color: colors.danger,
  },
  timeoutCard: {
    backgroundColor: "rgba(245,158,11,0.08)",
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.22)",
    borderRadius: 20,
    padding: 16,
    alignItems: "center",
    gap: 14,
    width: "100%",
  },
  timeoutText: {
    color: colors.warning,
    fontSize: 13,
    fontWeight: "bold",
    textAlign: "center",
    lineHeight: 19,
  },
  timeoutActions: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
  },
  timeoutBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
  },
  timeoutBtnAI: {
    backgroundColor: colors.primaryAlpha10,
    borderColor: colors.primaryAlpha30,
  },
  timeoutBtnAIText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  timeoutBtnSearch: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  timeoutBtnSearchText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  modeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.primaryAlpha10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.primaryAlpha30,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  modeChipText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  cancelBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.dangerAlpha20,
    marginTop: 8,
  },
  cancelBtnText: {
    color: colors.danger,
    fontSize: 16,
    fontWeight: "bold",
  },
  searchingStats: {
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchingStatsText: {
    color: colors.textSubtle,
    fontSize: 14,
    fontWeight: "bold",
  },
});
