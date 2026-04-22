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
  Switch,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  runOnJS,
} from "react-native-reanimated";
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
  Check,
  AlertCircle,
  User as UserIcon,
  Smile,
  Volume2,
  VolumeX,
  Settings,
} from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { BoardState, PlayerColor } from "@tzdraft/mkaguzi-engine";
import { colors } from "../../src/theme/colors";
import { getEndgameReasonLabel } from "../../src/lib/game/rules";
import { DraughtsBoard, HighlightType } from "../../src/components/game/DraughtsBoard";
import { useOnlineGame } from "../../src/hooks/useOnlineGame";
import { useGameAudio } from "../../src/hooks/useGameAudio";
import { LoadingScreen } from "../../src/components/ui/LoadingScreen";
import { useAuthStore } from "../../src/auth/auth-store";

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
  const { t } = useTranslation();
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
          <Text style={waitStyles.title}>{t("setupFriend.online.gameCreated", "Waiting for opponent")}</Text>
          <Text style={waitStyles.sub}>{t("setupFriend.online.bannerDesc", "Share the code below with your friend")}</Text>

          <View style={waitStyles.codeCard}>
            <Text style={waitStyles.code}>{inviteCode}</Text>
          </View>

          <View style={waitStyles.shareRow}>
            <TouchableOpacity style={waitStyles.shareBtn} onPress={handleShare}>
              <Share2 color={colors.primary} size={18} />
              <Text style={waitStyles.shareBtnText}>{t("setupFriend.online.orCopyLink", "Share Invite")}</Text>
            </TouchableOpacity>
          </View>

          {bothPlayersPresent && (
            <>
              <Text style={waitStyles.opponentJoined}>✓ {t("gameArena.gameOver.waitingForOpponent", "Opponent has joined!")}</Text>
              <TouchableOpacity
                style={waitStyles.startBtn}
                disabled={isSubmitting}
                onPress={onStartGame}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#000" />
                ) : (
                  <Text style={waitStyles.startBtnText}>{t("setupAi.start.cta", "Start Game")}</Text>
                )}
              </TouchableOpacity>
            </>
          )}
        </>
      ) : (
        <>
          <Text style={waitStyles.title}>{t("setupFriend.online.joiningGame", "Joined the game")}</Text>
          <Text style={waitStyles.sub}>{t("gameArena.gameOver.waitingForOpponent", "Waiting for the host to start…")}</Text>
          <ActivityIndicator color={colors.primary} style={{ marginTop: 16 }} />
        </>
      )}

      <TouchableOpacity style={waitStyles.leaveBtn} onPress={onLeave}>
        <Text style={waitStyles.leaveBtnText}>{t("gameArena.actions.resign", "Leave")}</Text>
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

// ─── Local Disconnect banner ───────────────────────────────────────────────────
function LocalDisconnectBanner({ visible }: { visible: boolean }) {
  const { t } = useTranslation();
  if (!visible) return null;
  return (
    <View style={localDisconnectStyles.container}>
      <WifiOff color={colors.danger} size={15} />
      <View style={{ flex: 1 }}>
        <Text style={localDisconnectStyles.title}>{t("gameArena.status.offlineTitle", "You're Offline")}</Text>
        <Text style={localDisconnectStyles.text}>{t("gameArena.status.offlineBody", "Trying to reconnect...")}</Text>
      </View>
      <ActivityIndicator size="small" color={colors.danger} />
    </View>
  );
}

const localDisconnectStyles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.dangerAlpha20 || "rgba(239,68,68,0.2)",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "rgba(239,68,68,0.3)",
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 12,
  },
  title: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: "900",
  },
  text: {
    color: colors.danger,
    fontSize: 11,
    fontWeight: "bold",
    opacity: 0.8,
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
  const { t } = useTranslation();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <TouchableOpacity style={modalStyles.backdrop} activeOpacity={1} onPress={onCancel}>
        <TouchableOpacity activeOpacity={1} onPress={() => {}}>
          <View style={modalStyles.card}>
            <View style={modalStyles.iconWrap}>
              <Flag color={colors.danger} size={28} />
            </View>
            <Text style={modalStyles.title}>{t("gameArena.resign.confirmTitle")}</Text>
            <Text style={modalStyles.body}>
              {t("gameArena.resign.confirmQuestion")}
            </Text>
            <View style={modalStyles.btns}>
              <TouchableOpacity
                style={[modalStyles.btn, modalStyles.btnSecondary]}
                onPress={onCancel}
              >
                <X color={colors.foreground} size={22} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[modalStyles.btn, modalStyles.btnDanger]}
                onPress={onConfirm}
              >
                <Check color="#fff" size={22} />
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
  bottomCard: {
    width: "100%",
    minWidth: "100%",
    borderRadius: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: Platform.OS === "ios" ? 40 : 24,
    paddingTop: 20,
    gap: 16,
    borderWidth: 0,
    borderTopWidth: 1,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    width: "100%",
  },
  absoluteBottom: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
});

// ─── Result modal ──────────────────────────────────────────────────────────────
// ─── Online Draw Offer Modal ──────────────────────────────────────────────────
function OnlineDrawOfferModal({
  visible,
  opponentName,
  onAccept,
  onDecline,
}: {
  visible: boolean;
  opponentName: string;
  onAccept: () => void;
  onDecline: () => void;
}) {
  const { t } = useTranslation();
  if (!visible) return null;
  return (
    <View style={modalStyles.absoluteBottom}>
      <View style={[modalStyles.card, modalStyles.bottomCard, { elevation: 8, shadowColor: "#000", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.3, shadowRadius: 8 }]}>
        <View style={modalStyles.headerRow}>
          <View style={[modalStyles.iconWrap, { marginBottom: 0, width: 44, height: 44, borderRadius: 12 }]}>
            <Handshake color="#38bdf8" size={22} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[modalStyles.title, { textAlign: "left", fontSize: 16 }]}>
              {t("gameArena.gameOver.drawOffer.title")}
            </Text>
            <Text style={[modalStyles.body, { textAlign: "left" }]}>
              {t("gameArena.gameOver.drawOffer.description", { name: opponentName })}
            </Text>
          </View>
        </View>
        <View style={[modalStyles.btns, { marginTop: 8 }]}>
          <TouchableOpacity style={[modalStyles.btn, modalStyles.btnSecondary]} onPress={onDecline}>
            <X color={colors.foreground} size={22} />
          </TouchableOpacity>
          <TouchableOpacity style={[modalStyles.btn, { backgroundColor: "#38bdf8" }]} onPress={onAccept}>
            <Check color="#000" size={22} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// ─── Online Draw Confirm Modal ────────────────────────────────────────────────
function OnlineDrawConfirmModal({
  visible,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  if (!visible) return null;
  return (
    <View style={modalStyles.absoluteBottom}>
      <View style={[modalStyles.card, modalStyles.bottomCard, { elevation: 8, shadowColor: "#000", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.3, shadowRadius: 8 }]}>
         <View style={modalStyles.headerRow}>
          <View style={[modalStyles.iconWrap, { marginBottom: 0, width: 44, height: 44, borderRadius: 12, backgroundColor: colors.primaryAlpha15, borderColor: colors.primaryAlpha30 }]}>
            <Handshake color={colors.primary} size={22} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[modalStyles.title, { textAlign: "left", fontSize: 16 }]}>
              {t("gameArena.gameOver.drawRequest.title")}
            </Text>
            <Text style={[modalStyles.body, { textAlign: "left" }]}>
              {t("gameArena.gameOver.drawRequest.description")}
            </Text>
          </View>
        </View>
        <View style={[modalStyles.btns, { marginTop: 8 }]}>
          <TouchableOpacity style={[modalStyles.btn, modalStyles.btnSecondary]} onPress={onCancel}>
            <X color={colors.foreground} size={22} />
          </TouchableOpacity>
          <TouchableOpacity style={[modalStyles.btn, { backgroundColor: colors.primary }]} onPress={onConfirm}>
            <Check color="#000" size={22} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// ─── Floating Emoji Animation ────────────────────────────────────────────────
function FloatingEmoji({ emoji, side }: { emoji: string; side: "TOP" | "BOTTOM" }) {
  const translateY = useSharedValue(0);
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.5);
  
  // Base offset near the name, varies slightly to avoid overlap
  const randomStartX = useRef(Math.random() * 20).current; 
  // Add slight random rotation
  const randomRot = useRef(`${(Math.random() - 0.5) * 20}deg`).current;

  useEffect(() => {
    opacity.value = withSequence(
      withTiming(1, { duration: 200 }),
      withTiming(1, { duration: 1500 }),
      withTiming(0, { duration: 1000 })
    );
    scale.value = withSpring(1.2);
    
    // Tiny vertical bounce on spawn, then stay horizontally aligned with the bar
    translateY.value = withSequence(
      withTiming(side === "TOP" ? 8 : -8, { duration: 400 }),
      withTiming(0, { duration: 2600 })
    );

    // Animate smoothly to the right, across the username bar
    translateX.value = withTiming(80 + Math.random() * 40, { duration: 3000 });
  }, [side]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: randomStartX + translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
      { rotate: randomRot },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        reactionStyles.floatingContainer,
        side === "TOP" ? reactionStyles.floatTop : reactionStyles.floatBottom,
        animatedStyle,
      ]}
    >
      <Text style={reactionStyles.emojiText}>{emoji}</Text>
    </Animated.View>
  );
}

// ─── Options Modal ─────────────────────────────────────────────────────────────
function OptionsModal({
  visible,
  isSoundMuted,
  onToggleSound,
  isReactionMuted,
  onToggleReaction,
  onClose,
}: {
  visible: boolean;
  isSoundMuted: boolean;
  onToggleSound: () => void;
  isReactionMuted: boolean;
  onToggleReaction: () => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={optionsStyles.backdrop} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={optionsStyles.card}>
          <View style={optionsStyles.header}>
            <View style={optionsStyles.headerIconWrap}>
              <Settings color={colors.textMuted} size={16} />
            </View>
            <Text style={optionsStyles.headerTitle}>{t("gameArena.actions.settings")}</Text>
            <TouchableOpacity onPress={onClose} style={optionsStyles.closeBtn}>
              <X color={colors.textMuted} size={18} />
            </TouchableOpacity>
          </View>

          <View style={optionsStyles.body}>
            <TouchableOpacity style={optionsStyles.row} onPress={onToggleSound}>
              <View style={[optionsStyles.rowIcon, { backgroundColor: "rgba(56,189,248,0.10)", borderColor: "rgba(56,189,248,0.20)" }]}>
                {isSoundMuted ? <VolumeX color="#38bdf8" size={20} /> : <Volume2 color="#38bdf8" size={20} />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={optionsStyles.rowTitle}>{t("gameArena.actions.muteSound")}</Text>
                <Text style={optionsStyles.rowSub}>{isSoundMuted ? t("gameArena.actions.unmute") : t("gameArena.actions.mute")}</Text>
              </View>
              <Switch
                value={!isSoundMuted}
                onValueChange={onToggleSound}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#fff"
              />
            </TouchableOpacity>

            <TouchableOpacity style={optionsStyles.row} onPress={onToggleReaction}>
              <View style={[optionsStyles.rowIcon, { backgroundColor: "rgba(251,146,60,0.10)", borderColor: "rgba(251,146,60,0.20)" }]}>
                <Smile color="#fb923c" size={20} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={optionsStyles.rowTitle}>{t("gameArena.actions.muteReactions")}</Text>
                <Text style={optionsStyles.rowSub}>{isReactionMuted ? t("gameArena.actions.unmute") : t("gameArena.actions.mute")}</Text>
              </View>
              <Switch
                value={!isReactionMuted}
                onValueChange={onToggleReaction}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#fff"
              />
            </TouchableOpacity>
          </View>

          <View style={optionsStyles.footer}>
            <TouchableOpacity style={optionsStyles.doneBtn} onPress={onClose}>
              <Text style={optionsStyles.doneBtnText}>{t("common.done")}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

// ─── Reaction Picker ───────────────────────────────────────────────────────────
const REACTION_LIST = ["👍", "👏", "🤣", "😮", "🔥", "🧠", "😠", "🙏"];

function ReactionPicker({
  visible,
  onSelect,
  onClose,
}: {
  visible: boolean;
  onSelect: (emoji: string) => void;
  onClose: () => void;
}) {
  if (!visible) return null;

  return (
    <View style={reactionStyles.pickerContainer}>
      <TouchableOpacity style={reactionStyles.backdrop} activeOpacity={1} onPress={onClose} />
      <View style={reactionStyles.pickerCard}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={reactionStyles.pickerContent}>
          {REACTION_LIST.map((emoji) => (
            <TouchableOpacity
              key={emoji}
              style={reactionStyles.emojiBtn}
              onPress={() => {
                onSelect(emoji);
                onClose();
              }}
            >
              <Text style={reactionStyles.emojiPickerText}>{emoji}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

const reactionStyles = StyleSheet.create({
  pickerContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    height: 1000,
    top: -1000,
    backgroundColor: "transparent",
  },
  pickerCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 16,
    paddingHorizontal: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 20,
  },
  pickerContent: {
    gap: 8,
    paddingHorizontal: 12,
  },
  emojiBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
  },
  emojiPickerText: {
    fontSize: 24,
  },
  floatingContainer: {
    position: "absolute",
    left: 70, // Start past the avatar, aligning with the player name
    zIndex: 2000,
  },
  floatTop: {
    top: 70,
  },
  floatBottom: {
    bottom: 120,
  },
  emojiText: {
    fontSize: 50,
  },
});

const optionsStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    backgroundColor: colors.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 4,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  headerTitle: {
    flex: 1,
    color: colors.foreground,
    fontSize: 18,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  closeBtn: { padding: 4 },
  body: { padding: 8 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    gap: 16,
    borderRadius: 16,
  },
  rowIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  rowTitle: { color: colors.foreground, fontSize: 15, fontWeight: "bold" },
  rowSub: { color: colors.textMuted, fontSize: 12 },
  footer: { padding: 16, borderTopWidth: 1, borderTopColor: colors.border },
  doneBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  doneBtnText: {
    color: colors.onPrimary,
    fontSize: 15,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
});

function ResultModal({
  visible,
  winner,
  reason,
  moveCount,
  myColorStr,
  onHome,
  onOfferRematch,
  onAcceptRematch,
  onDeclineRematch,
  onCancelRematch,
  rematchOffer,
  rematchOfferedByMe,
}: {
  visible: boolean;
  winner: "WHITE" | "BLACK" | "DRAW" | null;
  reason?: string;
  moveCount: number;
  myColorStr: "WHITE" | "BLACK" | null;
  onHome: () => void;
  onOfferRematch: () => void;
  onAcceptRematch: () => void;
  onDeclineRematch: () => void;
  onCancelRematch: () => void;
  rematchOffer: {
    offeredByUserId: string | null;
    status: "pending" | "accepted" | "declined" | "unavailable" | "cancelled" | null;
  };
  rematchOfferedByMe: boolean;
}) {
  const { t } = useTranslation();
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
    ? t("gameArena.gameOver.gameAborted")
    : isDraw
    ? t("freePlay.result.draw")
    : iWon
    ? t("gameArena.gameOver.youWon")
    : t("gameArena.gameOver.youLost");

  const reasonText = getEndgameReasonLabel(reason || "", iWon, isDraw, t);

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
              { label: t("gameArena.gameOver.moves"), value: String(moveCount) },
              {
                label: t("gameArena.gameOver.result"),
                value: isAborted ? "ABORT" : isDraw ? "DRAW" : iWon ? "WIN" : "LOSS",
              },
              { label: t("gameArena.gameOver.mode"), value: t("gameArena.gameOver.online") },
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
              {rematchOffer.offeredByUserId !== null && !rematchOfferedByMe ? (
                <>
                  <Text style={resStyles.rematchHint}>
                    {rematchOffer.status === "accepted"
                      ? t("gameArena.gameOver.rematchEntering")
                      : t("gameArena.gameOver.rematchRequested")}
                  </Text>
                  <View style={resStyles.rematchRow}>
                    <TouchableOpacity
                      style={[resStyles.rematchBtn, resStyles.rematchBtnDecline]}
                      onPress={onDeclineRematch}
                      disabled={rematchOffer.status === "accepted"}
                    >
                      <X color={colors.foreground} size={20} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[resStyles.rematchBtn, resStyles.rematchBtnAccept]}
                      onPress={onAcceptRematch}
                      disabled={rematchOffer.status === "accepted"}
                    >
                      {rematchOffer.status === "accepted" ? (
                        <ActivityIndicator color="#000" size="small" />
                      ) : (
                        <Check color="#000" size={20} />
                      )}
                    </TouchableOpacity>
                  </View>
                </>
              ) : rematchOfferedByMe ? (
                <View style={resStyles.rematchWaiting}>
                  <ActivityIndicator color={colors.primary} size="small" />
                  <Text style={resStyles.rematchWaitText}>
                    {rematchOffer.status === "accepted"
                      ? t("gameArena.gameOver.rematchAcceptedRedirecting")
                      : t("gameArena.gameOver.waitingForOpponent")}
                  </Text>
                  {rematchOffer.status !== "accepted" && (
                    <TouchableOpacity onPress={onCancelRematch} style={resStyles.rematchCancelBtn}>
                      <Text style={resStyles.rematchCancelText}>{t("common.cancel")}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : rematchOffer.status === "declined" ? (
                <View style={resStyles.rematchWaiting}>
                  <Text style={[resStyles.rematchWaitText, { color: colors.danger }]}>
                    {t("gameArena.gameOver.rematchDeclined")}
                  </Text>
                  <TouchableOpacity style={resStyles.rematchBtn} onPress={onOfferRematch}>
                    <Text style={resStyles.rematchBtnText}>{t("common.rematch")}</Text>
                  </TouchableOpacity>
                </View>
              ) : rematchOffer.status === "unavailable" ? (
                <View style={resStyles.rematchWaiting}>
                  <Text style={[resStyles.rematchWaitText, { color: colors.warning }]}>
                    {t("gameArena.gameOver.opponentUnavailable")}
                  </Text>
                  <TouchableOpacity style={resStyles.rematchBtn} onPress={onOfferRematch}>
                    <Text style={resStyles.rematchBtnText}>{t("common.rematch")}</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={resStyles.rematchRow}>
                  <TouchableOpacity style={resStyles.rematchBtn} onPress={onOfferRematch}>
                    <Text style={resStyles.rematchBtnText}>{t("common.rematch")}</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          <TouchableOpacity style={resStyles.homeBtn} onPress={onHome}>
            <ArrowLeft color={colors.textMuted} size={16} />
            <Text style={resStyles.homeBtnText}>{t("gameArena.gameOver.backToLobby")}</Text>
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
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const userId = user?.id;

  const [showResignModal, setShowResignModal] = useState(false);
  const [showDrawConfirmModal, setShowDrawConfirmModal] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [isReactionMuted, setIsReactionMuted] = useState(false);
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

  // ── Draw offer notification ───────────────────────────────────────────────
  const prevDrawOfferByRef = useRef<string | null>(null);
  useEffect(() => {
    const offeredBy = game.drawOffer.offeredByUserId;
    if (offeredBy && offeredBy !== prevDrawOfferByRef.current) {
      // Only play if it's the opponent offering
      const myId = game.myColorStr === "WHITE" ? game.players.white?.id : game.players.black?.id;
      if (offeredBy !== myId) {
        audio.playNotification();
      }
    }
    prevDrawOfferByRef.current = offeredBy;
  }, [game.drawOffer.offeredByUserId, game.myColorStr, game.players, audio]);

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

  const drawOfferedByMe = game.drawOfferedByMe;

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
            if (game.isWaiting && isHost) {
              game.abort();
            }
            if (game.result || game.isWaiting) router.replace(exitRoute as any);
            else router.back();
          }}
        >
          <ArrowLeft color={colors.foreground} size={20} />
        </TouchableOpacity>

        <View style={styles.titleArea}>
          <Text style={styles.titleBadge}>{t("gameArena.status.onlineMatch")}</Text>
          <Text style={styles.titleText} numberOfLines={1}>
            {game.players.white || game.players.black
              ? `${playerDisplayName(game.players.white)} vs ${playerDisplayName(game.players.black)}`
              : "Waiting for players…"}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => setShowOptionsModal(true)}
        >
          <Settings color={colors.textMuted} size={20} />
        </TouchableOpacity>
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
          onLeave={() => {
            if (isHost && game.isWaiting) {
              game.abort();
            }
            router.replace(exitRoute as any);
          }}
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
                <Text style={styles.toMoveText}>{t("gameArena.status.toMove")}</Text>
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
               disabled={!!game.result || game.currentPlayer !== game.myColor || isViewingHistory || (!game.connected)}
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
                <Text style={styles.toMoveText}>{t("gameArena.status.toMove")}</Text>
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


          {/* ── Disconnect banner ──────────────────────────────────────── */}
          <DisconnectBanner
            visible={!game.opponentConnected && !game.result && game.connected}
            secondsRemaining={game.disconnectSecondsRemaining}
          />
          <LocalDisconnectBanner visible={!game.connected && !game.result} />

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
                <Text style={[styles.actionBtnLabel, { color: colors.danger }]}>{t("gameArena.actions.abort")}</Text>
              </TouchableOpacity>
            )}

            {/* Draw offer / cancel */}
            {game.moveCount > 0 && !game.result && (
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => {
                  if (drawOfferedByMe) game.cancelDraw();
                  else setShowDrawConfirmModal(true);
                }}
              >
                <Handshake
                  color={drawOfferedByMe ? colors.primary : colors.foreground}
                  size={22}
                />
                <Text style={[styles.actionBtnLabel, drawOfferedByMe && { color: colors.primary }]}>
                  {drawOfferedByMe ? t("common.cancel") : t("gameArena.actions.draw")}
                </Text>
              </TouchableOpacity>
            )}

             {/* Resign */}
            {game.moveCount > 0 && !game.result && (
              <TouchableOpacity style={styles.actionBtn} onPress={() => setShowResignModal(true)}>
                <Flag color={colors.foreground} size={22} />
                <Text style={[styles.actionBtnLabel, { color: colors.foreground }]}>{t("gameArena.actions.resign")}</Text>
              </TouchableOpacity>
            )}

            {/* Reaction */}
            {!game.result && !isReactionMuted && (
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => setShowReactionPicker(true)}
              >
                <Smile color={colors.foreground} size={22} />
                <Text style={styles.actionBtnLabel}>{t("gameArena.actions.react", "React")}</Text>
              </TouchableOpacity>
            )}
          </View>
        </>
      )}

      <ReactionPicker
        visible={showReactionPicker}
        onSelect={game.sendReaction}
        onClose={() => setShowReactionPicker(false)}
      />

      <OptionsModal
        visible={showOptionsModal}
        isSoundMuted={audio.isMuted}
        onToggleSound={audio.toggleMute}
        isReactionMuted={isReactionMuted}
        onToggleReaction={() => setIsReactionMuted(!isReactionMuted)}
        onClose={() => setShowOptionsModal(false)}
      />

      {/* ── Floating Reactions ────────────────────────────────────────────── */}
      {!isReactionMuted && game.activeReactions.map((r) => {
        const isMe = r.userId === userId;
        return (
          <FloatingEmoji
            key={r.id}
            emoji={r.emoji}
            side={isMe ? "BOTTOM" : "TOP"}
          />
        );
      })}

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
        onHome={() => router.replace(exitRoute as any)}
        onOfferRematch={game.offerRematch}
        onAcceptRematch={game.acceptRematch}
        onDeclineRematch={game.declineRematch}
        onCancelRematch={game.cancelRematch}
        rematchOffer={game.rematchOffer}
        rematchOfferedByMe={game.rematchOfferedByMe}
      />

      <OnlineDrawOfferModal
        visible={game.drawOffer.offeredByUserId !== null && !drawOfferedByMe && !game.result}
        opponentName={playerDisplayName(topColor === game.myColorStr ? bottomPlayer : topPlayer)}
        onAccept={game.acceptDraw}
        onDecline={game.declineDraw}
      />

      <OnlineDrawConfirmModal
        visible={showDrawConfirmModal}
        onCancel={() => setShowDrawConfirmModal(false)}
        onConfirm={() => {
          setShowDrawConfirmModal(false);
          game.offerDraw();
        }}
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
