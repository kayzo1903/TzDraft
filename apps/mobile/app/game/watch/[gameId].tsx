import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  ScrollView,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Image } from "expo-image";
import {
  ArrowLeft,
  Crown,
  Handshake,
  Radio,
  User as UserIcon,
  WifiOff,
  X,
} from "lucide-react-native";
import { PlayerColor } from "@tzdraft/mkaguzi-engine";
import { colors } from "../../../src/theme/colors";
import { useSpectatorGame } from "../../../src/hooks/useSpectatorGame";
import { DraughtsBoard } from "../../../src/components/game/DraughtsBoard";

const { width: W } = Dimensions.get("window");
const BOARD_SIZE = Math.min(W - 16, 420);

/* ─── Helpers ───────────────────────────────────────────────────────────── */

function formatTime(ms: number): string {
  if (ms < 10_000) {
    const tenths = Math.floor(ms / 100);
    return `${Math.floor(tenths / 10)}.${tenths % 10}`;
  }
  const secs = Math.ceil(ms / 1000);
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

/* ─── Player Bar ─────────────────────────────────────────────────────────── */

function PlayerBar({
  name,
  rating,
  avatarUrl,
  timeMs,
  isActive,
  isTop,
}: {
  name: string;
  rating: number;
  avatarUrl?: string | null;
  timeMs: number | null;
  isActive: boolean;
  isTop?: boolean;
}) {
  const lowTime = timeMs !== null && timeMs < 10_000;
  return (
    <View style={[barStyles.container, isTop && barStyles.containerTop]}>
      <View style={barStyles.left}>
        <View style={[barStyles.avatarWrap, isActive && barStyles.avatarActive]}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={barStyles.avatar} contentFit="cover" />
          ) : (
            <View style={[barStyles.avatar, barStyles.avatarPlaceholder]}>
              <UserIcon size={18} color={colors.textDisabled} />
            </View>
          )}
        </View>
        <View>
          <Text style={barStyles.name} numberOfLines={1}>{name}</Text>
          <Text style={barStyles.rating}>{rating}</Text>
        </View>
      </View>

      {timeMs !== null && (
        <View style={[barStyles.clock, lowTime && barStyles.clockLow]}>
          <Text style={[barStyles.clockText, lowTime && barStyles.clockTextLow]}>
            {formatTime(timeMs)}
          </Text>
        </View>
      )}
    </View>
  );
}

const barStyles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  containerTop: {
    borderTopWidth: 0,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  left: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1, minWidth: 0 },
  avatarWrap: {
    width: 40, height: 40, borderRadius: 20,
    borderWidth: 2, borderColor: "transparent",
  },
  avatarActive: { borderColor: colors.primary },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surfaceElevated },
  avatarPlaceholder: { alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: colors.border },
  name: { color: colors.foreground, fontSize: 14, fontWeight: "700" },
  rating: { color: colors.textMuted, fontSize: 11, fontWeight: "600", marginTop: 1 },
  clock: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    minWidth: 72,
    alignItems: "center",
  },
  clockLow: { backgroundColor: "rgba(239,68,68,0.15)" },
  clockText: { color: colors.foreground, fontSize: 18, fontWeight: "900", fontVariant: ["tabular-nums"] },
  clockTextLow: { color: colors.danger },
});

/* ─── Result Card ────────────────────────────────────────────────────────── */

function ResultCard({
  winner,
  reason,
  whiteName,
  blackName,
  onBack,
}: {
  winner: "WHITE" | "BLACK" | "DRAW" | null;
  reason?: string;
  whiteName: string;
  blackName: string;
  onBack: () => void;
}) {
  let icon = <X size={28} color={colors.textMuted} />;
  let title = "Game Aborted";
  let subtitle = "";
  let accent: string = colors.border;

  if (winner === "DRAW") {
    icon = <Handshake size={28} color="#38bdf8" />;
    title = "Draw";
    subtitle = reason ? reason.replace(/-/g, " ") : "";
    accent = "#38bdf8";
  } else if (winner === "WHITE" || winner === "BLACK") {
    const winnerName = winner === "WHITE" ? whiteName : blackName;
    icon = <Crown size={28} color={colors.warning} />;
    title = `${winnerName} wins`;
    subtitle = reason ? `by ${reason.replace(/-/g, " ")}` : "";
    accent = colors.warning;
  }

  return (
    <View style={[resultStyles.card, { borderColor: accent + "50" }]}>
      <View style={[resultStyles.iconWrap, { backgroundColor: accent + "18" }]}>
        {icon}
      </View>
      <Text style={resultStyles.title}>{title}</Text>
      {!!subtitle && <Text style={resultStyles.subtitle}>{subtitle}</Text>}
      <TouchableOpacity style={resultStyles.backBtn} onPress={onBack}>
        <Text style={resultStyles.backBtnText}>Back to Watch Lobby</Text>
      </TouchableOpacity>
    </View>
  );
}

const resultStyles = StyleSheet.create({
  card: {
    margin: 14,
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    alignItems: "center",
    gap: 8,
  },
  iconWrap: {
    width: 64, height: 64, borderRadius: 20,
    alignItems: "center", justifyContent: "center",
    marginBottom: 8,
  },
  title: { color: colors.foreground, fontSize: 20, fontWeight: "900", textTransform: "uppercase" },
  subtitle: { color: colors.textMuted, fontSize: 13 },
  backBtn: {
    marginTop: 16,
    backgroundColor: colors.surfaceElevated,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 24,
    paddingVertical: 11,
  },
  backBtnText: { color: colors.foreground, fontSize: 14, fontWeight: "bold" },
});

/* ─── Screen ─────────────────────────────────────────────────────────────── */

export default function SpectatorScreen() {
  const { gameId } = useLocalSearchParams<{ gameId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const {
    board,
    moveCount,
    moveHistory,
    lastMove,
    currentPlayer,
    players,
    result,
    isLoading,
    timeLeft,
    connected,
    reconnecting,
    gameData,
  } = useSpectatorGame(gameId);

  const whiteName =
    players.white?.displayName || players.white?.username || "White";
  const blackName =
    players.black?.displayName || players.black?.username || "Black";
  const whiteRating = players.white?.rating?.rating ?? 1200;
  const blackRating = players.black?.rating?.rating ?? 1200;
  const whiteAvatar = players.white?.avatarUrl ?? null;
  const blackAvatar = players.black?.avatarUrl ?? null;

  const isActive = gameData?.status === "ACTIVE";

  // Spectators see board from White's natural orientation (no flip)
  const flipBoard = false;

  if (isLoading) {
    return (
      <SafeAreaView style={styles.root} edges={["top", "left", "right"]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Joining spectator view…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={["top", "left", "right"]}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={22} color={colors.foreground} />
        </TouchableOpacity>
        <View style={styles.topBarCenter}>
          {isActive ? (
            <View style={styles.livePill}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE</Text>
            </View>
          ) : result ? (
            <Text style={styles.topBarStatus}>Game over</Text>
          ) : (
            <ActivityIndicator size="small" color={colors.primary} />
          )}
          <Text style={styles.topBarMoves}>{moveCount} moves</Text>
        </View>
        <View style={{ width: 44 }} />
      </View>

      {/* Offline banner */}
      {(!connected || reconnecting) && (
        <View style={styles.offlineBanner}>
          <WifiOff size={13} color={colors.warning} />
          <Text style={styles.offlineBannerText}>
            {reconnecting ? "Reconnecting…" : "Offline — board may be out of sync"}
          </Text>
        </View>
      )}

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24, flexGrow: 1, justifyContent: "center" }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Black player bar (top — opponent side) */}
        <PlayerBar
          name={blackName}
          rating={blackRating}
          avatarUrl={blackAvatar}
          timeMs={timeLeft?.BLACK ?? null}
          isActive={isActive && currentPlayer === PlayerColor.BLACK}
          isTop
        />

        {/* Board */}
        <View style={styles.boardWrap}>
          <DraughtsBoard
            board={board}
            highlights={{}}
            onSquarePress={() => {}}
            lastMove={lastMove}
            disabled
            flipped={flipBoard}
          />
        </View>

        {/* White player bar (bottom — home side) */}
        <PlayerBar
          name={whiteName}
          rating={whiteRating}
          avatarUrl={whiteAvatar}
          timeMs={timeLeft?.WHITE ?? null}
          isActive={isActive && currentPlayer === PlayerColor.WHITE}
        />

        {/* Spectator notice */}
        {isActive && !result && (
          <View style={styles.spectatorNote}>
            <Radio size={12} color={colors.win} />
            <Text style={styles.spectatorNoteText}>You are spectating · board updates live</Text>
          </View>
        )}

        {/* Result card */}
        {result && (
          <ResultCard
            winner={result.winner}
            reason={result.reason}
            whiteName={whiteName}
            blackName={blackName}
            onBack={() => router.back()}
          />
        )}

        {/* Move history strip */}
        {moveHistory.length > 0 && (
          <View style={styles.historySection}>
            <Text style={styles.historyLabel}>Move History</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.historyScroll}
            >
              {moveHistory.map((m) => (
                <View
                  key={m.moveNumber}
                  style={[
                    styles.historyChip,
                    m.player === "WHITE" ? styles.historyChipWhite : styles.historyChipBlack,
                  ]}
                >
                  <Text style={styles.historyNum}>{m.moveNumber}.</Text>
                  <Text style={styles.historyNotation}>{m.notation || `${m.from}→${m.to}`}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

/* ─── Styles ─────────────────────────────────────────────────────────────── */

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },

  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16 },
  loadingText: { color: colors.textMuted, fontSize: 14, fontWeight: "600" },

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    height: 56,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    width: 44, height: 44, borderRadius: 12,
    alignItems: "center", justifyContent: "center",
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
  },
  topBarCenter: { flexDirection: "row", alignItems: "center", gap: 8 },
  livePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(239,68,68,0.1)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#ef4444" },
  liveText: { color: "#ef4444", fontSize: 10, fontWeight: "900" },
  topBarStatus: { color: colors.textMuted, fontSize: 13, fontWeight: "600" },
  topBarMoves: { color: colors.textSubtle, fontSize: 12 },

  offlineBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(245,158,11,0.08)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(245,158,11,0.22)",
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  offlineBannerText: { color: colors.warning, fontSize: 12, fontWeight: "bold" },

  content: { flexGrow: 1 },

  boardWrap: {
    width: BOARD_SIZE,
    height: BOARD_SIZE,
    alignSelf: "center",
    marginVertical: 6,
  },

  spectatorNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "center",
    marginTop: 10,
  },
  spectatorNoteText: { color: colors.textSubtle, fontSize: 12 },

  historySection: { marginTop: 16, paddingHorizontal: 14 },
  historyLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 8,
  },
  historyScroll: { gap: 6, paddingBottom: 4 },
  historyChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  historyChipWhite: {
    backgroundColor: "rgba(250,250,249,0.05)",
    borderColor: "rgba(250,250,249,0.15)",
  },
  historyChipBlack: {
    backgroundColor: "rgba(20,18,16,0.4)",
    borderColor: colors.border,
  },
  historyNum: { color: colors.textSubtle, fontSize: 10 },
  historyNotation: { color: colors.foreground, fontSize: 11, fontWeight: "700" },
});
