import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Share,
  ActivityIndicator,
  Dimensions,
  Platform,
  ScrollView,
} from "react-native";
import { Image } from "expo-image";
import * as Linking from "expo-linking";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Crown,
  Flag,
  Handshake,
  Minus,
  Share2,
  Users,
  Wifi,
  WifiOff,
  X,
  AlertCircle,
  User as UserIcon,
} from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { BoardState, PlayerColor } from "@tzdraft/mkaguzi-engine";
import { colors } from "../../src/theme/colors";
import { getEndgameReasonLabel } from "../../src/lib/game/rules";
import { DraughtsBoard, HighlightType } from "../../src/components/game/DraughtsBoard";
import { useOnlineGame } from "../../src/hooks/useOnlineGame";
import { useGameAudio } from "../../src/hooks/useGameAudio";
import { LoadingScreen } from "../../src/components/ui/LoadingScreen";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// ─── Route params ──────────────────────────────────────────────────────────────
interface OnlineGameParams {
  gameId: string;
  inviteCode?: string;
  isHost: string; // "true" | "false"
  source?: string; // "lobby" | "invite" (undefined = invite)
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
function formatTime(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

// ─── Captured pieces dots ──────────────────────────────────────────────────────
function CapturedDots({ count, color }: { count: number; color: "WHITE" | "BLACK" }) {
  if (count === 0) return null;
  return (
    <View style={capStyles.row}>
      {Array.from({ length: Math.min(count, 12) }).map((_, i) => (
        <View
          key={i}
          style={[
            capStyles.dot,
            {
              backgroundColor: color === "WHITE" ? colors.pieceWhite : colors.pieceBlack,
              borderColor: color === "WHITE" ? "#c8b49a" : "#3a3028",
            },
          ]}
        />
      ))}
      {count > 12 && <Text style={capStyles.extra}>+{count - 12}</Text>}
    </View>
  );
}

const capStyles = StyleSheet.create({
  row: { flexDirection: "row", flexWrap: "wrap", gap: 3, alignItems: "center" },
  dot: { width: 8, height: 8, borderRadius: 4, borderWidth: 1 },
  extra: { color: colors.textMuted, fontSize: 10, fontWeight: "bold" },
});

// ─── Error banner ──────────────────────────────────────────────────────────────
function ErrorBanner({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <View style={errStyles.container}>
      <AlertCircle color={colors.danger} size={15} />
      <Text style={errStyles.text} numberOfLines={2}>{message}</Text>
      <TouchableOpacity onPress={onDismiss} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <X color={colors.textMuted} size={15} />
      </TouchableOpacity>
    </View>
  );
}

const errStyles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.dangerAlpha20,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(239,68,68,0.25)",
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 8,
  },
  text: {
    flex: 1,
    color: colors.danger,
    fontSize: 12,
    fontWeight: "bold",
    lineHeight: 16,
  },
});

// ─── Waiting room ──────────────────────────────────────────────────────────────
function WaitingRoom({
  isHost,
  inviteCode,
  bothPlayersPresent,
  onStartGame,
  onLeave,
  isSubmitting,
}: {
  isHost: boolean;
  inviteCode: string;
  bothPlayersPresent: boolean;
  onStartGame: () => void;
  onLeave: () => void;
  isSubmitting: boolean;
}) {
  const handleShare = async () => {
    try {
      const deepLink = Linking.createURL(`join/${inviteCode}`);
      await Share.share({
        title: "Join my TzDraft match",
        message:
          `You've been invited to a Tanzania Draughts match!\n\n` +
          `Tap the link to join:\n${deepLink}\n\n` +
          `Or enter code manually: ${inviteCode}`,
        url: deepLink,
      });
    } catch {
      // ignore
    }
  };

  return (
    <View style={waitStyles.container}>
      <View style={waitStyles.iconWrap}>
        <Users color={colors.primary} size={40} />
      </View>

      {isHost ? (
        <>
          <Text style={waitStyles.title}>Waiting for opponent</Text>
          <Text style={waitStyles.sub}>Share the code below with your friend</Text>

          <View style={waitStyles.codeCard}>
            <Text style={waitStyles.code}>{inviteCode}</Text>
          </View>

          <View style={waitStyles.shareRow}>
            <TouchableOpacity style={waitStyles.shareBtn} onPress={handleShare}>
              <Share2 color={colors.primary} size={18} />
              <Text style={waitStyles.shareBtnText}>Share Invite</Text>
            </TouchableOpacity>
          </View>

          {bothPlayersPresent && (
            <>
              <Text style={waitStyles.opponentJoined}>✓ Opponent has joined!</Text>
              <TouchableOpacity
                style={waitStyles.startBtn}
                disabled={isSubmitting}
                onPress={onStartGame}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#000" />
                ) : (
                  <Text style={waitStyles.startBtnText}>Start Game</Text>
                )}
              </TouchableOpacity>
            </>
          )}
        </>
      ) : (
        <>
          <Text style={waitStyles.title}>Joined the game</Text>
          <Text style={waitStyles.sub}>Waiting for the host to start…</Text>
          <ActivityIndicator color={colors.primary} style={{ marginTop: 16 }} />
        </>
      )}

      <TouchableOpacity style={waitStyles.leaveBtn} onPress={onLeave}>
        <Text style={waitStyles.leaveBtnText}>Leave</Text>
      </TouchableOpacity>
    </View>
  );
}

const waitStyles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: colors.primaryAlpha10,
    borderWidth: 1,
    borderColor: colors.primaryAlpha30,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  title: {
    color: colors.foreground,
    fontSize: 22,
    fontWeight: "900",
    textTransform: "uppercase",
    textAlign: "center",
    marginBottom: 8,
  },
  sub: {
    color: colors.textMuted,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  codeCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.primaryAlpha30,
    paddingHorizontal: 40,
    paddingVertical: 20,
    marginBottom: 16,
  },
  code: {
    color: colors.primary,
    fontSize: 36,
    fontWeight: "900",
    letterSpacing: 8,
    textAlign: "center",
  },
  shareRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  shareBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.primaryAlpha10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.primaryAlpha30,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  shareBtnText: {
    color: colors.primary,
    fontWeight: "bold",
    fontSize: 14,
  },
  opponentJoined: {
    color: colors.success,
    fontWeight: "bold",
    fontSize: 14,
    marginBottom: 16,
  },
  startBtn: {
    height: 52,
    width: "100%",
    backgroundColor: colors.primary,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  startBtnText: {
    color: "#000",
    fontSize: 16,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  leaveBtn: {
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  leaveBtnText: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: "bold",
  },
});

// ─── Draw offer banner ─────────────────────────────────────────────────────────
function DrawOfferBanner({
  visible,
  isOfferedByMe,
  onAccept,
  onDecline,
  onCancel,
}: {
  visible: boolean;
  isOfferedByMe: boolean;
  onAccept: () => void;
  onDecline: () => void;
  onCancel: () => void;
}) {
  if (!visible) return null;
  return (
    <View style={drawBannerStyles.container}>
      {isOfferedByMe ? (
        <>
          <Handshake color={colors.textMuted} size={16} />
          <Text style={drawBannerStyles.text}>Draw offer sent</Text>
          <TouchableOpacity style={drawBannerStyles.cancelBtn} onPress={onCancel}>
            <X color={colors.textMuted} size={14} />
            <Text style={drawBannerStyles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <Handshake color={colors.primary} size={16} />
          <Text style={drawBannerStyles.text}>Opponent offers a draw</Text>
          <TouchableOpacity style={drawBannerStyles.declineBtn} onPress={onDecline}>
            <Text style={drawBannerStyles.declineText}>Decline</Text>
          </TouchableOpacity>
          <TouchableOpacity style={drawBannerStyles.acceptBtn} onPress={onAccept}>
            <Text style={drawBannerStyles.acceptText}>Accept</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const drawBannerStyles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.primaryAlpha30,
    paddingHorizontal: 14,
    paddingVertical: 9,
    gap: 8,
  },
  text: {
    flex: 1,
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "bold",
  },
  acceptBtn: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  acceptText: {
    color: "#000",
    fontSize: 12,
    fontWeight: "900",
  },
  declineBtn: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  declineText: {
    color: colors.foreground,
    fontSize: 12,
    fontWeight: "bold",
  },
  cancelBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  cancelText: {
    color: colors.textMuted,
    fontSize: 12,
  },
});

// ─── Disconnect banner ─────────────────────────────────────────────────────────
function DisconnectBanner({
  visible,
  secondsRemaining,
}: {
  visible: boolean;
  secondsRemaining: number | null;
}) {
  if (!visible) return null;
  return (
    <View style={disconnectStyles.container}>
      <WifiOff color={colors.warning} size={15} />
      <Text style={disconnectStyles.text}>
        Opponent disconnected
        {secondsRemaining !== null ? ` — forfeits in ${secondsRemaining}s` : ""}
      </Text>
    </View>
  );
}

const disconnectStyles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(245,158,11,0.08)",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "rgba(245,158,11,0.22)",
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 8,
  },
  text: {
    flex: 1,
    color: colors.warning,
    fontSize: 12,
    fontWeight: "bold",
  },
});

// ─── Endgame Countdown Indicator ──────────────────────────────────────────────
function EndgameCountdownIndicator({
  remaining,
  favoredColor,
}: {
  remaining: number;
  favoredColor: string | null;
}) {
  const { t } = useTranslation();
  return (
    <View style={styles.countdownContainer}>
      <AlertCircle color="#fb923c" size={14} style={{ marginRight: 6 }} />
      <Text style={styles.countdownText}>
        {favoredColor
          ? t("gameArena.endgameCountdown", { remaining, favored: favoredColor })
          : t("gameArena.endgameCountdownEqual", { remaining })}
      </Text>
    </View>
  );
}

// ─── Resign modal ──────────────────────────────────────────────────────────────
function ResignModal({
  visible,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <TouchableOpacity style={modalStyles.backdrop} activeOpacity={1} onPress={onCancel}>
        <TouchableOpacity activeOpacity={1} onPress={() => {}}>
          <View style={modalStyles.card}>
            <View style={modalStyles.iconWrap}>
              <Flag color={colors.danger} size={28} />
            </View>
            <Text style={modalStyles.title}>Resign this game?</Text>
            <Text style={modalStyles.body}>
              You will concede the match and your opponent wins.
            </Text>
            <View style={modalStyles.btns}>
              <TouchableOpacity
                style={[modalStyles.btn, modalStyles.btnSecondary]}
                onPress={onCancel}
              >
                <Text style={modalStyles.btnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[modalStyles.btn, modalStyles.btnDanger]}
                onPress={onConfirm}
              >
                <Text style={[modalStyles.btnText, { color: "#fff" }]}>Resign</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const modalStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 24,
    minWidth: SCREEN_WIDTH * 0.8,
    gap: 12,
    alignItems: "center",
  },
  iconWrap: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: colors.dangerAlpha20,
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.30)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  title: {
    color: colors.foreground,
    fontSize: 18,
    fontWeight: "900",
    textTransform: "uppercase",
    textAlign: "center",
  },
  body: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
  },
  btns: {
    flexDirection: "row",
    gap: 12,
    marginTop: 4,
    width: "100%",
  },
  btn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  btnSecondary: {
    backgroundColor: colors.surfaceElevated,
  },
  btnDanger: {
    backgroundColor: colors.danger,
  },
  btnText: {
    color: colors.foreground,
    fontWeight: "900",
    fontSize: 14,
    textTransform: "uppercase",
  },
});

// ─── Result modal ──────────────────────────────────────────────────────────────
function ResultModal({
  visible,
  winner,
  reason,
  moveCount,
  myColorStr,
  rematchOfferedByMe,
  rematchOfferedByOpponent,
  onHome,
  onOfferRematch,
  onAcceptRematch,
  onDeclineRematch,
  onCancelRematch,
}: {
  visible: boolean;
  winner: "WHITE" | "BLACK" | "DRAW" | null;
  reason?: string;
  moveCount: number;
  myColorStr: "WHITE" | "BLACK" | null;
  rematchOfferedByMe: boolean;
  rematchOfferedByOpponent: boolean;
  onHome: () => void;
  onOfferRematch: () => void;
  onAcceptRematch: () => void;
  onDeclineRematch: () => void;
  onCancelRematch: () => void;
}) {
  if (!visible) return null;

  const isAborted = winner === null;
  const isDraw = winner === "DRAW";
  const iWon = !isDraw && !isAborted && winner === myColorStr;

  const accentColor = isAborted
    ? colors.textMuted
    : isDraw
    ? "#38bdf8"
    : iWon
    ? colors.win
    : colors.danger;

  const title = isAborted
    ? "Game Aborted"
    : isDraw
    ? "Draw"
    : iWon
    ? "You Won!"
    : "You Lost";

  const { t } = useTranslation();
  const reasonText = reason === "aborted" 
    ? t("common.error") 
    : reason === "agreement"
      ? t("gameArena.gameOver.reasons.resign")
      : getEndgameReasonLabel(reason || "", iWon, isDraw, t);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={resStyles.backdrop}>
        <View style={[resStyles.card, { borderColor: accentColor + "44" }]}>
          <View style={resStyles.top}>
            <View
              style={[
                resStyles.iconWrap,
                { borderColor: accentColor + "66", backgroundColor: accentColor + "22" },
              ]}
            >
              {isAborted ? (
                <X color={accentColor} size={36} />
              ) : isDraw ? (
                <Minus color={accentColor} size={36} />
              ) : (
                <Crown color={accentColor} size={36} />
              )}
            </View>
            <Text style={[resStyles.title, { color: accentColor }]}>{title}</Text>
            {reasonText ? (
              <Text style={resStyles.subtitle}>{reasonText}</Text>
            ) : null}
          </View>

          <View style={resStyles.statsRow}>
            {[
              { label: "MOVES", value: String(moveCount) },
              {
                label: "RESULT",
                value: isAborted ? "ABORT" : isDraw ? "DRAW" : iWon ? "WIN" : "LOSS",
              },
              { label: "MODE", value: "ONLINE" },
            ].map(({ label, value }, i) => (
              <View
                key={label}
                style={[
                  resStyles.statCell,
                  i < 2 && { borderRightWidth: 1, borderRightColor: colors.border },
                ]}
              >
                <Text style={resStyles.statLabel}>{label}</Text>
                <Text style={resStyles.statValue}>{value}</Text>
              </View>
            ))}
          </View>

          {/* Rematch section — only if game wasn't aborted */}
          {!isAborted && (
            <View style={resStyles.rematch}>
              {rematchOfferedByOpponent ? (
                <>
                  <Text style={resStyles.rematchHint}>Opponent wants a rematch!</Text>
                  <View style={resStyles.rematchRow}>
                    <TouchableOpacity
                      style={[resStyles.rematchBtn, resStyles.rematchBtnDecline]}
                      onPress={onDeclineRematch}
                    >
                      <Text style={resStyles.rematchBtnText}>Decline</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[resStyles.rematchBtn, resStyles.rematchBtnAccept]}
                      onPress={onAcceptRematch}
                    >
                      <Text style={[resStyles.rematchBtnText, resStyles.rematchBtnTextAccept]}>Accept</Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : rematchOfferedByMe ? (
                <View style={resStyles.rematchWaiting}>
                  <ActivityIndicator color={colors.primary} size="small" />
                  <Text style={resStyles.rematchWaitText}>Waiting for opponent to accept…</Text>
                  <TouchableOpacity onPress={onCancelRematch} style={resStyles.rematchCancelBtn}>
                    <Text style={resStyles.rematchCancelText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity style={resStyles.rematchBtn} onPress={onOfferRematch}>
                  <Text style={resStyles.rematchBtnText}>Rematch</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          <TouchableOpacity style={resStyles.homeBtn} onPress={onHome}>
            <ArrowLeft color={colors.textMuted} size={16} />
            <Text style={resStyles.homeBtnText}>Back to Lobby</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const resStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 28,
    borderWidth: 1,
    padding: 24,
    width: "100%",
  },
  top: {
    alignItems: "center",
    marginBottom: 20,
    gap: 6,
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 24,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  title: {
    fontSize: 28,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: "center",
  },
  statsRow: {
    flexDirection: "row",
    backgroundColor: colors.background,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    marginBottom: 16,
  },
  statCell: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    gap: 2,
  },
  statLabel: {
    color: colors.textSubtle,
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  statValue: {
    color: colors.foreground,
    fontSize: 16,
    fontWeight: "900",
  },
  rematch: {
    gap: 10,
    marginBottom: 14,
  },
  rematchRow: {
    flexDirection: "row",
    gap: 10,
  },
  rematchHint: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: "center",
    fontWeight: "bold",
  },
  rematchWaiting: {
    alignItems: "center",
    gap: 10,
  },
  rematchWaitText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "bold",
    textAlign: "center",
  },
  rematchCancelBtn: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rematchCancelText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "bold",
  },
  rematchBtn: {
    flex: 1,
    height: 46,
    backgroundColor: colors.surfaceElevated,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  rematchBtnDecline: {
    backgroundColor: colors.surfaceElevated,
  },
  rematchBtnAccept: {
    backgroundColor: colors.primary,
  },
  rematchBtnText: {
    color: colors.foreground,
    fontSize: 14,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  rematchBtnTextAccept: {
    color: colors.onPrimary,
  },
  homeBtn: {
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  homeBtnText: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: "bold",
  },
});

// ─── Main screen ───────────────────────────────────────────────────────────────
export default function OnlineGameScreen() {
  const router = useRouter();
  const params = useLocalSearchParams() as unknown as OnlineGameParams;
  const { gameId, inviteCode = "", isHost: isHostParam, source } = params;
  const isHost = isHostParam === "true";
  const isLobbyGame = source === "lobby"; // matchmaking — never shows WaitingRoom
  const exitRoute = isLobbyGame ? "/game/lobby" : "/game/setup-friend";

  const game = useOnlineGame(gameId);
  const audio = useGameAudio();

  const [showResignModal, setShowResignModal] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [viewingMoveIndex, setViewingMoveIndex] = useState<number | null>(null);

  // ── Sync hook error → local error for display ──────────────────────────────
  useEffect(() => {
    if (game.error) setLocalError(game.error);
  }, [game.error]);

  // Auto-dismiss error after 5 s
  useEffect(() => {
    if (!localError) return;
    const t = setTimeout(() => setLocalError(null), 5000);
    return () => clearTimeout(t);
  }, [localError]);

  // ── History auto-scroll ────────────────────────────────────────────────────
  const historyScrollRef = useRef<ScrollView>(null);
  const prevMoveCountAudio = useRef(0);

  useEffect(() => {
    historyScrollRef.current?.scrollToEnd({ animated: true });
  }, [game.moveCount]);

  // ── Navigate to rematch game ────────────────────────────────────────────────
  useEffect(() => {
    if (game.rematchNewGameId) {
      router.replace({
        pathname: "/game/online-game",
        params: {
          gameId: game.rematchNewGameId,
          isHost: game.rematchIWasOfferer ? "true" : "false",
          ...(source ? { source } : {}),
        },
      });
    }
  }, [game.rematchNewGameId, game.rematchIWasOfferer, router, source]);

  // ── Audio ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (game.isReady) audio.playGameStart();
  }, [game.isReady]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (game.moveCount > prevMoveCountAudio.current && game.moveCount > 0) {
      audio.playMove();
      prevMoveCountAudio.current = game.moveCount;
    }
  }, [game.moveCount, audio]);

  const prevResultRef = useRef<typeof game.result>(null);
  useEffect(() => {
    if (game.result && !prevResultRef.current) {
      prevResultRef.current = game.result;
      if (game.result.winner === null) return;
      audio.playGameEnd(game.result.winner === "DRAW" ? "draw" : "win");
    }
    if (!game.result) prevResultRef.current = null;
  }, [game.result, audio]);

  // ── Auto-start for lobby (matchmaking) games ──────────────────────────────
  // Matched games are created ACTIVE on the backend. If the game somehow
  // arrives in WAITING status (race condition), auto-start it so neither
  // player is ever stuck on the WaitingRoom screen.
  useEffect(() => {
    if (isLobbyGame && game.isWaiting && game.bothPlayersPresent && !game.isSubmitting) {
      game.startGame();
    }
  }, [isLobbyGame, game.isWaiting, game.bothPlayersPresent, game.isSubmitting, game.startGame]);

  // ── History scrubbing ─────────────────────────────────────────────────────
  const liveIndex = game.moveHistory.length;
  const activeIndex = viewingMoveIndex !== null ? viewingMoveIndex : liveIndex;
  const isViewingHistory = viewingMoveIndex !== null && viewingMoveIndex < liveIndex;
  const displayFen = activeIndex === liveIndex ? game.fen : (game.fenHistory[activeIndex] || game.fen);
  const displayBoard = activeIndex === liveIndex ? game.board : BoardState.fromFen(displayFen);
  const displayLastMove =
    activeIndex === liveIndex
      ? game.lastMove
      : activeIndex > 0
      ? { from: game.moveHistory[activeIndex - 1].from, to: game.moveHistory[activeIndex - 1].to }
      : null;

  // Reset to live when a new move arrives
  useEffect(() => {
    setViewingMoveIndex(null);
  }, [liveIndex]);

  const handlePrevMove = () => {
    if (activeIndex > 0) setViewingMoveIndex(activeIndex - 1);
  };
  const handleNextMove = () => {
    if (activeIndex < liveIndex) {
      const next = activeIndex + 1;
      setViewingMoveIndex(next === liveIndex ? null : next);
    }
  };

  // ── Board highlights ───────────────────────────────────────────────────────
  const highlights: Record<number, HighlightType> = {};
  const showingBoard = !game.result && (!game.isWaiting || isLobbyGame);
  if (showingBoard) {
    if (game.selectedSquare != null) highlights[game.selectedSquare] = "selected";
    for (const dest of game.validDestinations) highlights[dest] = "destination";
    for (const cap of game.capturablePieces) {
      if (!highlights[cap]) highlights[cap] = "capturable";
    }
  }

  // ── Captured piece counts ──────────────────────────────────────────────────
  const allPieces = game.board.getAllPieces();
  const whitePiecesOnBoard = allPieces.filter((p) => p.color === "WHITE").length;
  const blackPiecesOnBoard = allPieces.filter((p) => p.color === "BLACK").length;
  const capturedByWhite = 12 - blackPiecesOnBoard;
  const capturedByBlack = 12 - whitePiecesOnBoard;

  // ── Player bar helpers ─────────────────────────────────────────────────────
  const bottomColor: "WHITE" | "BLACK" = game.flipBoard ? "BLACK" : "WHITE";
  const topColor: "WHITE" | "BLACK" = game.flipBoard ? "WHITE" : "BLACK";

  const bottomPlayer =
    bottomColor === "WHITE" ? game.players.white : game.players.black;
  const topPlayer =
    topColor === "WHITE" ? game.players.white : game.players.black;

  const playerDisplayName = (p: typeof bottomPlayer) =>
    p?.displayName || p?.username || (p as any)?.name || "Player";

  const bottomCaptured =
    bottomColor === "WHITE" ? capturedByWhite : capturedByBlack;
  const topCaptured =
    topColor === "WHITE" ? capturedByWhite : capturedByBlack;
  const bottomCapturedColor: "WHITE" | "BLACK" =
    bottomColor === "WHITE" ? "BLACK" : "WHITE";
  const topCapturedColor: "WHITE" | "BLACK" =
    topColor === "WHITE" ? "BLACK" : "WHITE";

  const hasTimeControl = game.timeLeft !== null;
  const isMyTurn = game.currentPlayer === game.myColor && !game.result && !game.isWaiting;

  const drawOfferedByMe =
    game.drawOffer.offeredByUserId !== null &&
    game.drawOffer.offeredByUserId === (game.myColorStr === "WHITE"
      ? game.players.white?.id
      : game.players.black?.id);

  const currentPlayerStr: "WHITE" | "BLACK" =
    game.currentPlayer === PlayerColor.WHITE ? "WHITE" : "BLACK";

  // ── Loading screen ─────────────────────────────────────────────────────────
  if (game.isLoading) {
    return <LoadingScreen message="Loading game…" />;
  }

  // ── Timer helper: returns danger style when ≤ 30s on active side ──────────
  const isTimerDanger = (side: "WHITE" | "BLACK") =>
    currentPlayerStr === side &&
    !game.result &&
    game.timeLeft !== null &&
    game.timeLeft[side] <= 30_000;

  return (
    <SafeAreaView style={styles.container}>

      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => {
            if (game.result || game.isWaiting) router.replace(exitRoute as any);
            else router.back();
          }}
        >
          <ArrowLeft color={colors.foreground} size={20} />
        </TouchableOpacity>

        <View style={styles.titleArea}>
          <Text style={styles.titleBadge}>ONLINE MATCH</Text>
          <Text style={styles.titleText} numberOfLines={1}>
            {game.players.white || game.players.black
              ? `${playerDisplayName(game.players.white)} vs ${playerDisplayName(game.players.black)}`
              : "Waiting for players…"}
          </Text>
        </View>

        <View style={styles.iconBtn}>
          {game.isWaiting ? (
            <ActivityIndicator color={colors.textMuted} size="small" />
          ) : (
            <Wifi color={colors.success} size={18} />
          )}
        </View>
      </View>

      {/* ── Error banner ─────────────────────────────────────────────────── */}
      {localError ? (
        <ErrorBanner message={localError} onDismiss={() => setLocalError(null)} />
      ) : null}

      {/* ── Waiting room — invite games only, never for matchmaking ────── */}
      {game.isWaiting && !isLobbyGame ? (
        <WaitingRoom
          isHost={isHost}
          inviteCode={inviteCode}
          bothPlayersPresent={game.bothPlayersPresent}
          onStartGame={game.startGame}
          onLeave={() => router.replace(exitRoute as any)}
          isSubmitting={game.isSubmitting}
        />
      ) : (
        <>
          {/* ── Top player bar ────────────────────────────────────────── */}
          <View style={[styles.playerBar, styles.playerBarTop]}>
            <View style={styles.avatarContainer}>
              {topPlayer?.avatarUrl ? (
                <Image
                  source={topPlayer.avatarUrl}
                  style={styles.playerAvatar}
                  contentFit="cover"
                  transition={200}
                />
              ) : (
                <View style={[styles.playerAvatar, styles.avatarPlaceholder]}>
                  <UserIcon color={colors.textDisabled} size={18} />
                </View>
              )}
              <View style={[styles.playerColorBadge, topColor === "WHITE" ? styles.chipWhite : styles.chipBlack]} />
            </View>

            <View style={styles.playerMeta}>
              <View style={styles.playerNameRow}>
                <Text style={styles.playerName} numberOfLines={1}>
                  {playerDisplayName(topPlayer)}
                </Text>
                {topPlayer?.rating?.rating ? (
                  <Text style={styles.playerRating}>
                    {topPlayer.rating.rating}
                  </Text>
                ) : null}
              </View>
              <CapturedDots count={topCaptured} color={topCapturedColor} />
            </View>
            {currentPlayerStr === topColor && !game.result && (
              <View style={styles.toMoveChip}>
                <Text style={styles.toMoveText}>To Move</Text>
              </View>
            )}
            {hasTimeControl && game.timeLeft && (
              <View
                style={[
                  styles.timerChip,
                  currentPlayerStr === topColor && !game.result && styles.timerChipActive,
                  isTimerDanger(topColor) && styles.timerChipDanger,
                ]}
              >
                <Text
                  style={[
                    styles.timerText,
                    currentPlayerStr === topColor && !game.result && styles.timerTextActive,
                    isTimerDanger(topColor) && styles.timerTextDanger,
                  ]}
                >
                  {formatTime(game.timeLeft[topColor])}
                </Text>
              </View>
            )}
          </View>

          {/* ── Board ─────────────────────────────────────────────────── */}
          <View style={styles.boardWrapper}>
            <DraughtsBoard
              board={displayBoard}
              highlights={isViewingHistory ? {} : highlights}
              onSquarePress={game.selectSquare}
              onInvalidPress={() => game.selectSquare(-1)}
              lastMove={displayLastMove}
              disabled={!!game.result || game.currentPlayer !== game.myColor || isViewingHistory}
              flipped={game.flipBoard}
            />
            {game.endgameCountdown && (
              <EndgameCountdownIndicator
                remaining={game.endgameCountdown.remaining}
                favoredColor={
                  game.endgameCountdown.favored !== null
                    ? game.endgameCountdown.favored === PlayerColor.WHITE
                      ? "White"
                      : "Black"
                    : null
                }
              />
            )}
          </View>
          {!game.isReady && (
            <View style={styles.engineOverlay}>
              <ActivityIndicator color={colors.primary} size="small" />
              <Text style={styles.engineText}>Preparing engine…</Text>
            </View>
          )}

          {/* ── Bottom player bar ─────────────────────────────────────── */}
          <View style={[styles.playerBar, styles.playerBarBottom]}>
            <View style={styles.avatarContainer}>
              {bottomPlayer?.avatarUrl ? (
                <Image
                  source={bottomPlayer.avatarUrl}
                  style={styles.playerAvatar}
                  contentFit="cover"
                  transition={200}
                />
              ) : (
                <View style={[styles.playerAvatar, styles.avatarPlaceholder]}>
                  <UserIcon color={colors.textDisabled} size={18} />
                </View>
              )}
              <View style={[styles.playerColorBadge, bottomColor === "WHITE" ? styles.chipWhite : styles.chipBlack]} />
            </View>

            <View style={styles.playerMeta}>
              <View style={styles.playerNameRow}>
                <Text style={styles.playerName} numberOfLines={1}>
                  {playerDisplayName(bottomPlayer)}
                </Text>
                {bottomPlayer?.rating?.rating ? (
                  <Text style={styles.playerRating}>
                    {bottomPlayer.rating.rating}
                  </Text>
                ) : null}
                {game.myColorStr === bottomColor && (
                  <View style={styles.youBadge}>
                    <Text style={styles.youBadgeText}>YOU</Text>
                  </View>
                )}
              </View>
              <CapturedDots count={bottomCaptured} color={bottomCapturedColor} />
            </View>
            {currentPlayerStr === bottomColor && !game.result && (
              <View style={styles.toMoveChip}>
                <Text style={styles.toMoveText}>To Move</Text>
              </View>
            )}
            {hasTimeControl && game.timeLeft && (
              <View
                style={[
                  styles.timerChip,
                  currentPlayerStr === bottomColor && !game.result && styles.timerChipActive,
                  isTimerDanger(bottomColor) && styles.timerChipDanger,
                ]}
              >
                <Text
                  style={[
                    styles.timerText,
                    currentPlayerStr === bottomColor && !game.result && styles.timerTextActive,
                    isTimerDanger(bottomColor) && styles.timerTextDanger,
                  ]}
                >
                  {formatTime(game.timeLeft[bottomColor])}
                </Text>
              </View>
            )}
          </View>

          {/* ── Draw offer banner ─────────────────────────────────────── */}
          <DrawOfferBanner
            visible={game.drawOffer.offeredByUserId !== null}
            isOfferedByMe={drawOfferedByMe}
            onAccept={game.acceptDraw}
            onDecline={game.declineDraw}
            onCancel={game.cancelDraw}
          />

          {/* ── Disconnect banner ──────────────────────────────────────── */}
          <DisconnectBanner
            visible={!game.opponentConnected}
            secondsRemaining={game.disconnectSecondsRemaining}
          />

          {/* ── Move history strip ─────────────────────────────────────── */}
          <View style={styles.historyBar}>
            <TouchableOpacity
              style={styles.historyChevron}
              onPress={handlePrevMove}
              disabled={activeIndex === 0}
            >
              <ChevronLeft
                color={activeIndex === 0 ? colors.textDisabled : colors.textMuted}
                size={18}
              />
            </TouchableOpacity>

            <ScrollView
              ref={historyScrollRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.historyContent}
              style={styles.historyScroll}
            >
              {game.moveHistory.length === 0 ? (
                <Text style={styles.historyEmpty}>No moves yet</Text>
              ) : (
                game.moveHistory.map((entry, idx) => {
                  const moveViewIndex = idx + 1;
                  const isActive =
                    viewingMoveIndex === moveViewIndex ||
                    (viewingMoveIndex === null && moveViewIndex === liveIndex);
                  return (
                    <TouchableOpacity
                      key={idx}
                      style={[styles.historyPill, isActive && styles.historyPillActive]}
                      onPress={() =>
                        setViewingMoveIndex(moveViewIndex === liveIndex ? null : moveViewIndex)
                      }
                    >
                      {idx % 2 === 0 && (
                        <Text style={styles.historyMoveNum}>{Math.floor(idx / 2) + 1}.</Text>
                      )}
                      <Text style={[styles.historyPillText, isActive && styles.historyPillTextActive]}>
                        {entry.notation}
                      </Text>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>

            <TouchableOpacity
              style={styles.historyChevron}
              onPress={handleNextMove}
              disabled={activeIndex === liveIndex}
            >
              <ChevronRight
                color={activeIndex === liveIndex ? colors.textDisabled : colors.textMuted}
                size={18}
              />
            </TouchableOpacity>
          </View>

          {/* ── Action bar ────────────────────────────────────────────── */}
          <View style={styles.actionBar}>
            {/* Abort — only before first move */}
            {game.moveCount === 0 && !game.result && (
              <TouchableOpacity style={styles.actionBtn} onPress={() => game.abort()}>
                <X color={colors.danger} size={22} />
                <Text style={[styles.actionBtnLabel, { color: colors.danger }]}>Abort</Text>
              </TouchableOpacity>
            )}

            {/* Draw offer / cancel */}
            {game.moveCount > 0 && !game.result && (
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => { if (drawOfferedByMe) game.cancelDraw(); else game.offerDraw(); }}
              >
                <Handshake
                  color={drawOfferedByMe ? colors.primary : colors.foreground}
                  size={22}
                />
                <Text style={[styles.actionBtnLabel, drawOfferedByMe && { color: colors.primary }]}>
                  {drawOfferedByMe ? "Cancel" : "Draw"}
                </Text>
              </TouchableOpacity>
            )}

            {/* Resign */}
            {game.moveCount > 0 && !game.result && (
              <TouchableOpacity style={styles.actionBtn} onPress={() => setShowResignModal(true)}>
                <Flag color={colors.foreground} size={22} />
                <Text style={[styles.actionBtnLabel, { color: colors.foreground }]}>Resign</Text>
              </TouchableOpacity>
            )}
          </View>
        </>
      )}

      {/* ── Modals ────────────────────────────────────────────────────────── */}
      <ResignModal
        visible={showResignModal}
        onCancel={() => setShowResignModal(false)}
        onConfirm={() => {
          setShowResignModal(false);
          game.resign();
        }}
      />

      <ResultModal
        visible={!!game.result && !game.isWaiting}
        winner={game.result?.winner ?? null}
        reason={game.result?.reason}
        moveCount={game.moveCount}
        myColorStr={game.myColorStr}
        rematchOfferedByMe={game.rematchOffer.offeredByUserId === "self"}
        rematchOfferedByOpponent={
          game.rematchOffer.offeredByUserId !== null &&
          game.rematchOffer.offeredByUserId !== "self"
        }
        onHome={() => router.replace(exitRoute as any)}
        onOfferRematch={game.offerRematch}
        onAcceptRematch={game.acceptRematch}
        onDeclineRematch={game.declineRematch}
        onCancelRematch={game.cancelRematch}
      />
    </SafeAreaView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  // ── Top bar ──────────────────────────────────────────────────────────────────
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  titleArea: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 8,
  },
  titleBadge: {
    color: colors.primary,
    fontSize: 9,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 1.5,
  },
  titleText: {
    color: colors.foreground,
    fontSize: 13,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  // ── Player bars ───────────────────────────────────────────────────────────────
  playerBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 6,
    gap: 10,
    borderColor: colors.border,
  },
  playerBarTop: {
    borderBottomWidth: 1,
    backgroundColor: colors.surface + "55",
  },
  playerBarBottom: {
    borderTopWidth: 1,
    backgroundColor: colors.surface + "55",
  },
  avatarContainer: {
    position: "relative",
  },
  playerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceElevated,
  },
  avatarPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  playerColorBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    zIndex: 1,
  },
  colorChip: { width: 22, height: 22, borderRadius: 11, borderWidth: 2 },
  chipWhite: { backgroundColor: colors.pieceWhite, borderColor: "#c8b49a" },
  chipBlack: { backgroundColor: colors.pieceBlack, borderColor: "#3a3028" },
  playerMeta: {
    flex: 1,
    gap: 3,
    overflow: "hidden",
  },
  playerNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "nowrap",
  },
  playerName: {
    color: colors.foreground,
    fontSize: 13,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.2,
    flexShrink: 1,
  },
  playerRating: {
    color: colors.textSubtle,
    fontSize: 12,
    fontWeight: "bold",
    flexShrink: 0,
  },
  youBadge: {
    backgroundColor: colors.primaryAlpha15,
    borderRadius: 5,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderWidth: 1,
    borderColor: colors.primaryAlpha30,
    flexShrink: 0,
  },
  youBadgeText: {
    color: colors.primary,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  toMoveChip: {
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    flexShrink: 0,
  },
  toMoveText: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  timerChip: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    minWidth: 60,
    alignItems: "center",
    flexShrink: 0,
  },
  timerChipActive: {
    backgroundColor: colors.primaryAlpha10,
    borderColor: colors.primaryAlpha30,
  },
  timerChipDanger: {
    backgroundColor: colors.dangerAlpha20,
    borderColor: "rgba(239,68,68,0.40)",
  },
  timerText: {
    color: colors.textMuted,
    fontSize: 15,
    fontWeight: "900",
    fontVariant: ["tabular-nums"],
    letterSpacing: 1,
  },
  timerTextActive: {
    color: colors.primary,
  },
  timerTextDanger: {
    color: colors.danger,
  },
  // ── Board ─────────────────────────────────────────────────────────────────────
  boardWrapper: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  countdownContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
    marginHorizontal: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "rgba(251,146,60,0.12)",
    borderWidth: 1,
    borderColor: "rgba(251,146,60,0.35)",
  },
  countdownText: {
    color: "#fdba74",
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
  engineOverlay: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 4,
  },
  engineText: {
    color: colors.textSubtle,
    fontSize: 11,
    fontWeight: "bold",
  },
  // ── History bar ───────────────────────────────────────────────────────────────
  historyBar: {
    height: 46,
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface + "88",
  },
  historyScroll: {
    flex: 1,
  },
  historyChevron: {
    width: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  historyContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 4,
    gap: 2,
  },
  historyEmpty: {
    color: colors.textDisabled,
    fontSize: 12,
    fontStyle: "italic",
    paddingHorizontal: 4,
  },
  historyPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 6,
  },
  historyPillActive: {
    backgroundColor: colors.foreground,
  },
  historyMoveNum: {
    color: colors.textDisabled,
    fontSize: 10,
    fontWeight: "bold",
  },
  historyPillText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
  historyPillTextActive: {
    color: colors.background,
    fontWeight: "bold",
  },
  // ── Action bar ────────────────────────────────────────────────────────────────
  actionBar: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface + "66",
    justifyContent: "space-around",
    paddingBottom: Platform.OS === "ios" ? 4 : 0,
  },
  actionBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    gap: 4,
  },
  actionBtnLabel: {
    color: colors.textDisabled,
    fontSize: 9,
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
});
