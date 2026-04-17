import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  SafeAreaView,
  Platform,
  ScrollView,
  Dimensions,
  Switch,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Crown,
  Flag,
  FlipHorizontal2,
  Handshake,
  Minus,
  Settings,
  SmartphoneNfc,
  Volume2,
  VolumeX,
  X,
  AlertTriangle,
} from "lucide-react-native";
import { BoardState } from "@tzdraft/mkaguzi-engine";
import { colors } from "../../src/theme/colors";
import { DraughtsBoard, HighlightType } from "../../src/components/game/DraughtsBoard";
import { useLocalPvpGame } from "../../src/hooks/useLocalPvpGame";
import { useGameAudio } from "../../src/hooks/useGameAudio";
import { LoadingScreen } from "../../src/components/ui/LoadingScreen";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// ─── Route params ──────────────────────────────────────────────────────────────
interface FriendLocalParams {
  passDevice: string;       // "true" | "false"
  noFlip: string;           // "true" | "false"
  timeMinutes: string;      // "0" | "3" | "5" | "10" | "30"
  player1Color: string;     // "WHITE" | "BLACK"
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
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
  dot: { width: 9, height: 9, borderRadius: 5, borderWidth: 1 },
  extra: { color: colors.textMuted, fontSize: 10, fontWeight: "bold" },
});

// ─── Pass-device handoff overlay ──────────────────────────────────────────────
function PassDeviceOverlay({
  visible,
  playerName,
  onReady,
}: {
  visible: boolean;
  playerName: string;
  onReady: () => void;
}) {
  if (!visible) return null;
  return (
    <View style={passStyles.overlay}>
      <View style={passStyles.card}>
        <View style={passStyles.iconWrap}>
          <SmartphoneNfc color={colors.primary} size={40} />
        </View>
        <Text style={passStyles.label}>PASS THE DEVICE</Text>
        <Text style={passStyles.name}>{playerName}</Text>
        <Text style={passStyles.sub}>It's your turn</Text>
        <TouchableOpacity style={passStyles.btn} onPress={onReady}>
          <Text style={passStyles.btnText}>I'm ready</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const passStyles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 50,
    backgroundColor: "rgba(0,0,0,0.92)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: colors.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    padding: 32,
    gap: 12,
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primaryAlpha10,
    borderWidth: 1,
    borderColor: colors.primaryAlpha30,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  label: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  name: {
    color: colors.foreground,
    fontSize: 26,
    fontWeight: "900",
  },
  sub: {
    color: colors.textMuted,
    fontSize: 14,
  },
  btn: {
    marginTop: 16,
    width: "100%",
    height: 56,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  btnText: {
    color: colors.onPrimary,
    fontSize: 18,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
});

// ─── Draw offer modal ──────────────────────────────────────────────────────────
// Two-phase: offerer confirms → opponent sees accept/decline.
function DrawOfferModal({
  visible,
  phase,
  offererName,
  opponentName,
  onConfirmOffer,
  onAccept,
  onDecline,
  onCancel,
}: {
  visible: boolean;
  phase: "confirm" | "respond";
  offererName: string;
  opponentName: string;
  onConfirmOffer: () => void;
  onAccept: () => void;
  onDecline: () => void;
  onCancel: () => void;
}) {
  if (phase === "confirm") {
    return (
      <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
        <TouchableOpacity style={modalStyles.backdrop} activeOpacity={1} onPress={onCancel}>
          <TouchableOpacity activeOpacity={1} onPress={() => {}}>
            <View style={modalStyles.card}>
              <View style={[modalStyles.header, { backgroundColor: "rgba(56,189,248,0.07)" }]}>
                <View style={[modalStyles.headerIcon, { backgroundColor: "rgba(56,189,248,0.12)", borderColor: "rgba(56,189,248,0.30)" }]}>
                  <Handshake color="#38bdf8" size={20} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[modalStyles.headerSub, { color: "rgba(56,189,248,0.75)" }]}>DRAW OFFER</Text>
                  <Text style={modalStyles.headerTitle}>Offer a draw?</Text>
                </View>
              </View>
              <Text style={modalStyles.body}>
                <Text style={{ color: colors.foreground, fontWeight: "bold" }}>{offererName}</Text>
                {" "}wants to offer a draw. Pass the device to{" "}
                <Text style={{ color: colors.foreground, fontWeight: "bold" }}>{opponentName}</Text>
                {" "}to respond.
              </Text>
              <View style={modalStyles.btns}>
                <TouchableOpacity style={[modalStyles.btn, modalStyles.btnSecondary]} onPress={onCancel}>
                  <Text style={modalStyles.btnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[modalStyles.btn, { backgroundColor: "#38bdf8" }]} onPress={onConfirmOffer}>
                  <Text style={[modalStyles.btnText, { color: "#000" }]}>Offer Draw</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    );
  }

  // phase === "respond"
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={[modalStyles.backdrop, { justifyContent: "center" }]}>
        <TouchableOpacity activeOpacity={1} onPress={() => {}}>
          <View style={modalStyles.card}>
            <View style={[modalStyles.header, { backgroundColor: "rgba(56,189,248,0.07)" }]}>
              <View style={[modalStyles.headerIcon, { backgroundColor: "rgba(56,189,248,0.12)", borderColor: "rgba(56,189,248,0.30)" }]}>
                <Handshake color="#38bdf8" size={20} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[modalStyles.headerSub, { color: "rgba(56,189,248,0.75)" }]}>DRAW OFFERED</Text>
                <Text style={modalStyles.headerTitle}>{opponentName}, respond</Text>
              </View>
            </View>
            <Text style={modalStyles.body}>
              <Text style={{ color: colors.foreground, fontWeight: "bold" }}>{offererName}</Text>
              {" "}is offering a draw. Do you accept?
            </Text>
            <View style={modalStyles.btns}>
              <TouchableOpacity style={[modalStyles.btn, modalStyles.btnDanger]} onPress={onDecline}>
                <Text style={modalStyles.btnText}>Decline</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[modalStyles.btn, { backgroundColor: "#38bdf8" }]} onPress={onAccept}>
                <Text style={[modalStyles.btnText, { color: "#000" }]}>Accept</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

// ─── Resign confirmation modal ─────────────────────────────────────────────────
function ResignModal({
  visible,
  playerName,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  playerName: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <TouchableOpacity style={modalStyles.backdrop} activeOpacity={1} onPress={onCancel}>
        <TouchableOpacity activeOpacity={1} onPress={() => {}}>
          <View style={modalStyles.card}>
            <View style={modalStyles.header}>
              <View style={modalStyles.headerIcon}>
                <AlertTriangle color={colors.danger} size={20} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={modalStyles.headerSub}>CONFIRM RESIGN</Text>
                <Text style={modalStyles.headerTitle}>Resign this game?</Text>
              </View>
            </View>
            <Text style={modalStyles.body}>
              <Text style={{ color: colors.foreground, fontWeight: "bold" }}>{playerName}</Text>
              {" "}will forfeit this match.
            </Text>
            <View style={modalStyles.btns}>
              <TouchableOpacity style={[modalStyles.btn, modalStyles.btnSecondary]} onPress={onCancel}>
                <Text style={modalStyles.btnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[modalStyles.btn, modalStyles.btnDanger]} onPress={onConfirm}>
                <Text style={modalStyles.btnText}>Resign</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

// ─── Options modal ─────────────────────────────────────────────────────────────
function OptionsModal({
  visible,
  isMuted,
  onToggleMute,
  passDevice,
  onTogglePassDevice,
  noFlip,
  onToggleNoFlip,
  onHome,
  onClose,
}: {
  visible: boolean;
  isMuted: boolean;
  onToggleMute: () => void;
  passDevice: boolean;
  onTogglePassDevice: () => void;
  noFlip: boolean;
  onToggleNoFlip: () => void;
  onHome: () => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={modalStyles.backdrop} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} onPress={() => {}}>
          <View style={optStyles.card}>
            <View style={optStyles.header}>
              <View style={optStyles.headerIcon}>
                <Settings color={colors.textMuted} size={16} />
              </View>
              <Text style={optStyles.headerTitle}>Settings</Text>
              <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
                <X color={colors.textMuted} size={18} />
              </TouchableOpacity>
            </View>

            <View style={optStyles.body}>
              <TouchableOpacity style={optStyles.row} onPress={onToggleMute}>
                <View style={[optStyles.rowIcon, { backgroundColor: "rgba(56,189,248,0.10)", borderColor: "rgba(56,189,248,0.20)" }]}>
                  {isMuted ? <VolumeX color="#38bdf8" size={20} /> : <Volume2 color="#38bdf8" size={20} />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={optStyles.rowTitle}>Sound Effects</Text>
                  <Text style={optStyles.rowSub}>{isMuted ? "Audio is muted" : "Audio is on"}</Text>
                </View>
                <Switch
                  value={!isMuted}
                  onValueChange={onToggleMute}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor="#fff"
                />
              </TouchableOpacity>

              <TouchableOpacity style={optStyles.row} onPress={onTogglePassDevice}>
                <View style={[optStyles.rowIcon, { backgroundColor: colors.primaryAlpha10, borderColor: colors.primaryAlpha30 }]}>
                  <SmartphoneNfc color={colors.primary} size={20} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={optStyles.rowTitle}>Pass-device screen</Text>
                  <Text style={optStyles.rowSub}>{passDevice ? "Handoff overlay enabled" : "No handoff overlay"}</Text>
                </View>
                <Switch
                  value={passDevice}
                  onValueChange={onTogglePassDevice}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor="#fff"
                />
              </TouchableOpacity>

              <TouchableOpacity style={optStyles.row} onPress={onToggleNoFlip}>
                <View style={[optStyles.rowIcon, { backgroundColor: colors.primaryAlpha10, borderColor: colors.primaryAlpha30 }]}>
                  <FlipHorizontal2 color={colors.primary} size={20} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={optStyles.rowTitle}>Fixed board</Text>
                  <Text style={optStyles.rowSub}>{noFlip ? "Board stays fixed" : "Auto-flips each turn"}</Text>
                </View>
                <Switch
                  value={noFlip}
                  onValueChange={onToggleNoFlip}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor="#fff"
                />
              </TouchableOpacity>

              <TouchableOpacity style={optStyles.row} onPress={onHome}>
                <View style={[optStyles.rowIcon, { backgroundColor: "rgba(245,158,11,0.10)", borderColor: "rgba(245,158,11,0.20)" }]}>
                  <ArrowLeft color="#f59e0b" size={20} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={optStyles.rowTitle}>Exit to Lobby</Text>
                  <Text style={optStyles.rowSub}>Return to main menu</Text>
                </View>
                <ChevronRight color={colors.textDisabled} size={16} />
              </TouchableOpacity>
            </View>

            <View style={optStyles.footer}>
              <TouchableOpacity style={optStyles.doneBtn} onPress={onClose}>
                <Text style={optStyles.doneBtnText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

// ─── Result modal ──────────────────────────────────────────────────────────────
function ResultModal({
  visible,
  winner,
  reason,
  moveCount,
  player1Name,
  player2Name,
  player1Color,
  onHome,
}: {
  visible: boolean;
  winner: "WHITE" | "BLACK" | "DRAW";
  reason: string;
  moveCount: number;
  player1Name: string;
  player2Name: string;
  player1Color: "WHITE" | "BLACK";
  onHome: () => void;
}) {
  const isDraw = winner === "DRAW";
  const winnerName = isDraw
    ? ""
    : winner === player1Color
    ? player1Name
    : player2Name;

  const accentColor = isDraw ? "#38bdf8" : colors.primary;
  const borderColor = isDraw ? "rgba(56,189,248,0.30)" : colors.primaryAlpha30;

  const reasonText =
    reason === "resign"
      ? "by resignation"
      : reason === "time"
      ? "on time"
      : reason === "agreement"
      ? "by mutual agreement"
      : "no moves available";

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={resStyles.backdrop}>
        <View style={[resStyles.card, { borderColor }]}>
          <View style={resStyles.top}>
            <View style={[resStyles.iconWrap, { borderColor: accentColor + "66", backgroundColor: accentColor + "22" }]}>
              {isDraw ? <Minus color={accentColor} size={36} /> : <Crown color={accentColor} size={36} />}
            </View>
            <Text style={[resStyles.title, { color: accentColor }]}>
              {isDraw ? "Draw" : `${winnerName} Wins`}
            </Text>
            <Text style={resStyles.subtitle}>{isDraw ? reasonText : reasonText}</Text>
          </View>

          <View style={resStyles.statsRow}>
            {[
              { label: "MOVES", value: String(moveCount) },
              { label: "RESULT", value: isDraw ? "DRAW" : "WIN" },
              { label: "MODE", value: "LOCAL" },
            ].map(({ label, value }, i) => (
              <View
                key={label}
                style={[resStyles.statCell, i < 2 && { borderRightWidth: 1, borderRightColor: colors.border }]}
              >
                <Text style={resStyles.statLabel}>{label}</Text>
                <Text style={resStyles.statValue}>{value}</Text>
              </View>
            ))}
          </View>

          <View style={resStyles.actions}>
            <TouchableOpacity style={[resStyles.btnPrimary, { backgroundColor: accentColor, flex: 1 }]} onPress={onHome}>
              <ArrowLeft color="#000" size={16} />
              <Text style={resStyles.btnPrimaryText}>Back to Setup</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Main screen ───────────────────────────────────────────────────────────────
export default function FriendLocalScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const params = useLocalSearchParams() as unknown as FriendLocalParams;

  const [passDevice, setPassDevice] = useState(params.passDevice === "true");
  const [noFlip, setNoFlip] = useState(params.noFlip === "true");
  const timeMinutes = parseInt(params.timeMinutes ?? "0", 10);
  const player1Color = (params.player1Color ?? "WHITE") as "WHITE" | "BLACK";

  const game = useLocalPvpGame({ passDevice, noFlip, timeMinutes, player1Color });
  const audio = useGameAudio();

  const [showResignModal, setShowResignModal] = useState(false);
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  // "confirm" = offerer sees confirm screen; "respond" = opponent sees accept/decline
  const [drawPhase, setDrawPhase] = useState<"confirm" | "respond" | null>(null);

  // ── History scrubbing ──────────────────────────────────────────────────────
  const [viewingMoveIndex, setViewingMoveIndex] = useState<number | null>(null);
  const historyScrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    setViewingMoveIndex(null);
  }, [game.moveHistory.length]);

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

  useEffect(() => {
    if (game.moveHistory.length > 0 && viewingMoveIndex === null) {
      historyScrollRef.current?.scrollToEnd({ animated: true });
    }
  }, [game.moveHistory.length, viewingMoveIndex]);

  const handlePrevMove = () => setViewingMoveIndex(Math.max(0, activeIndex - 1));
  const handleNextMove = () => {
    if (activeIndex + 1 >= liveIndex) setViewingMoveIndex(null);
    else setViewingMoveIndex(activeIndex + 1);
  };

  // ── Audio ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (game.isReady) audio.playGameStart();
  }, [game.isReady]); // eslint-disable-line react-hooks/exhaustive-deps

  const prevMoveCount = useRef(0);
  useEffect(() => {
    if (game.moveHistory.length > prevMoveCount.current) {
      const last = game.moveHistory[game.moveHistory.length - 1];
      if (last.captureCount > 0) audio.playCapture(last.captureCount);
      else audio.playMove();
      prevMoveCount.current = game.moveHistory.length;
    } else if (game.moveHistory.length === 0) {
      prevMoveCount.current = 0;
    }
  }, [game.moveHistory.length, audio]);

  const prevResultRef = useRef<typeof game.result>(null);
  useEffect(() => {
    if (game.result && !prevResultRef.current) {
      prevResultRef.current = game.result;
      audio.playGameEnd(game.result.winner === "DRAW" ? "draw" : "win");
    }
    if (!game.result) prevResultRef.current = null;
  }, [game.result, audio]);

  // ── Board highlights ───────────────────────────────────────────────────────
  const highlights: Record<number, HighlightType> = {};
  if (!isViewingHistory) {
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
  // Top bar = opponent of bottom bar. When board is flipped (black's turn), black is at bottom.
  const bottomColor: "WHITE" | "BLACK" = game.flipBoard ? "BLACK" : "WHITE";
  const topColor: "WHITE" | "BLACK" = game.flipBoard ? "WHITE" : "BLACK";
  const bottomPlayerName = game.playerName(bottomColor);
  const topPlayerName = game.playerName(topColor);
  const bottomCaptured = bottomColor === "WHITE" ? capturedByWhite : capturedByBlack;
  const topCaptured = topColor === "WHITE" ? capturedByWhite : capturedByBlack;
  // Captured dots show pieces the opponent lost (i.e. pieces of the other color)
  const bottomCapturedColor: "WHITE" | "BLACK" = bottomColor === "WHITE" ? "BLACK" : "WHITE";
  const topCapturedColor: "WHITE" | "BLACK" = topColor === "WHITE" ? "BLACK" : "WHITE";
  const isTimedGame = timeMinutes > 0;

  if (!game.isReady) {
    return <LoadingScreen message={t("game.loadingEngine", "Initializing Engine...")} />;
  }

  return (
    <SafeAreaView style={styles.container}>

      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => {
            if (game.result) router.replace("/game/setup-friend");
            else router.back();
          }}
        >
          <ArrowLeft color={colors.foreground} size={20} />
        </TouchableOpacity>

        <View style={styles.titleArea}>
          <Text style={styles.titleBadge}>LOCAL MATCH</Text>
          <Text style={styles.titleText}>Pass & Play</Text>
          <Text style={styles.titleSub}>{game.player1Name} vs {game.player2Name}</Text>
        </View>

        <TouchableOpacity style={styles.iconBtn} onPress={() => setShowOptionsModal(true)}>
          <Settings color={colors.textMuted} size={20} />
        </TouchableOpacity>
      </View>

      {/* ── Top player bar ────────────────────────────────────────────────── */}
      <View style={[styles.playerBar, styles.playerBarTop]}>
        <View style={[styles.colorChip, topColor === "WHITE" ? styles.chipWhite : styles.chipBlack]} />
        <View style={styles.playerMeta}>
          <Text style={styles.playerName}>{topPlayerName}</Text>
          <CapturedDots count={topCaptured} color={topCapturedColor} />
        </View>
        {game.currentPlayerStr === topColor && !game.result && !game.awaitingHandoff && (
          <View style={styles.toMoveChip}>
            <Text style={styles.toMoveText}>To Move</Text>
          </View>
        )}
        {isTimedGame && (
          <View style={[
            styles.timerChip,
            game.currentPlayerStr === topColor && !game.result && styles.timerChipActive,
          ]}>
            <Text style={[
              styles.timerText,
              game.currentPlayerStr === topColor && !game.result && styles.timerTextActive,
            ]}>
              {formatTime(game.timeLeft[topColor])}
            </Text>
          </View>
        )}
      </View>

      {/* ── Board ─────────────────────────────────────────────────────────── */}
      <View style={styles.boardWrapper}>
        <DraughtsBoard
          board={displayBoard}
          highlights={highlights}
          onSquarePress={game.selectSquare}
          onInvalidPress={() => game.selectSquare(-1)}
          lastMove={displayLastMove}
          disabled={isViewingHistory || !!game.result || game.awaitingHandoff}
          flipped={game.flipBoard}
        />
      </View>

      {/* ── Bottom player bar ─────────────────────────────────────────────── */}
      <View style={[styles.playerBar, styles.playerBarBottom]}>
        <View style={[styles.colorChip, bottomColor === "WHITE" ? styles.chipWhite : styles.chipBlack]} />
        <View style={styles.playerMeta}>
          <Text style={styles.playerName}>{bottomPlayerName}</Text>
          <CapturedDots count={bottomCaptured} color={bottomCapturedColor} />
        </View>
        {game.currentPlayerStr === bottomColor && !game.result && !game.awaitingHandoff && (
          <View style={styles.toMoveChip}>
            <Text style={styles.toMoveText}>To Move</Text>
          </View>
        )}
        {isTimedGame && (
          <View style={[
            styles.timerChip,
            game.currentPlayerStr === bottomColor && !game.result && styles.timerChipActive,
          ]}>
            <Text style={[
              styles.timerText,
              game.currentPlayerStr === bottomColor && !game.result && styles.timerTextActive,
            ]}>
              {formatTime(game.timeLeft[bottomColor])}
            </Text>
          </View>
        )}
      </View>

      {/* ── Move history strip ─────────────────────────────────────────────── */}
      <View style={styles.historyBar}>
        <TouchableOpacity
          style={[styles.historyChevron, activeIndex === 0 && styles.historyChevronDisabled]}
          disabled={activeIndex === 0}
          onPress={handlePrevMove}
        >
          <ChevronLeft color={activeIndex === 0 ? colors.textDisabled : colors.textMuted} size={20} strokeWidth={3} />
        </TouchableOpacity>

        <ScrollView
          ref={historyScrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.historyContent}
          style={{ flex: 1 }}
        >
          {game.moveHistory.length === 0 ? (
            <Text style={styles.historyEmpty}>Game starts when first move is played…</Text>
          ) : (
            game.moveHistory.map((m, idx) => {
              const moveIndex = idx + 1;
              const isViewing = activeIndex === moveIndex;
              const moveNum = Math.floor(idx / 2) + 1;
              const isWhiteMove = idx % 2 === 0;
              return (
                <React.Fragment key={idx}>
                  {isWhiteMove && (
                    <Text style={styles.historyMoveNum}>{moveNum}.</Text>
                  )}
                  <TouchableOpacity
                    style={[styles.historyPill, isViewing && styles.historyPillActive]}
                    onPress={() => setViewingMoveIndex(moveIndex === liveIndex ? null : moveIndex)}
                  >
                    <Text style={[styles.historyPillText, isViewing && styles.historyPillTextActive]}>
                      {m.notation}
                    </Text>
                  </TouchableOpacity>
                </React.Fragment>
              );
            })
          )}
        </ScrollView>

        <TouchableOpacity
          style={[styles.historyChevron, activeIndex === liveIndex && styles.historyChevronDisabled]}
          disabled={activeIndex === liveIndex}
          onPress={handleNextMove}
        >
          <ChevronRight color={activeIndex === liveIndex ? colors.textDisabled : colors.textMuted} size={20} strokeWidth={3} />
        </TouchableOpacity>
      </View>

      {/* ── Action bar ────────────────────────────────────────────────────── */}
      <View style={styles.actionBar}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => setShowOptionsModal(true)}>
          <Settings color={colors.textDisabled} size={22} />
          <Text style={styles.actionBtnLabel}>Settings</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionBtn}
          disabled={!!game.result || game.awaitingHandoff}
          onPress={() => { if (!game.result) setDrawPhase("confirm"); }}
        >
          <Handshake color={game.result || game.awaitingHandoff ? colors.textDisabled : colors.foreground} size={22} />
          <Text style={[
            styles.actionBtnLabel,
            !game.result && !game.awaitingHandoff && { color: colors.foreground },
          ]}>
            Draw
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionBtn}
          disabled={!!game.result || game.awaitingHandoff}
          onPress={() => { if (!game.result) setShowResignModal(true); }}
        >
          <Flag color={game.result || game.awaitingHandoff ? colors.textDisabled : colors.foreground} size={22} />
          <Text style={[
            styles.actionBtnLabel,
            !game.result && !game.awaitingHandoff && { color: colors.foreground },
          ]}>
            Resign
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Pass-device overlay ────────────────────────────────────────────── */}
      <PassDeviceOverlay
        visible={game.awaitingHandoff}
        playerName={game.handoffPlayerName}
        onReady={game.acknowledgeHandoff}
      />

      {/* ── Draw offer modal ─────────────────────────────────────────────────── */}
      <DrawOfferModal
        visible={drawPhase !== null}
        phase={drawPhase ?? "confirm"}
        offererName={game.playerName(game.currentPlayerStr)}
        opponentName={game.playerName(game.currentPlayerStr === "WHITE" ? "BLACK" : "WHITE")}
        onConfirmOffer={() => setDrawPhase("respond")}
        onAccept={() => { setDrawPhase(null); game.acceptDraw(); }}
        onDecline={() => setDrawPhase(null)}
        onCancel={() => setDrawPhase(null)}
      />

      {/* ── Resign modal ────────────────────────────────────────────────────── */}
      <ResignModal
        visible={showResignModal}
        playerName={game.playerName(game.currentPlayerStr)}
        onConfirm={() => { setShowResignModal(false); game.resign(); }}
        onCancel={() => setShowResignModal(false)}
      />

      {/* ── Options modal ────────────────────────────────────────────────────── */}
      <OptionsModal
        visible={showOptionsModal}
        isMuted={audio.isMuted}
        onToggleMute={audio.toggleMute}
        passDevice={passDevice}
        onTogglePassDevice={() => setPassDevice((v) => !v)}
        noFlip={noFlip}
        onToggleNoFlip={() => setNoFlip((v) => !v)}
        onHome={() => { setShowOptionsModal(false); router.replace("/game/setup-friend"); }}
        onClose={() => setShowOptionsModal(false)}
      />

      {/* ── Result modal ─────────────────────────────────────────────────────── */}
      {game.result && (
        <ResultModal
          visible={!!game.result}
          winner={game.result.winner}
          reason={game.result.reason}
          moveCount={game.moveCount}
          player1Name={game.player1Name}
          player2Name={game.player2Name}
          player1Color={game.player1Color}
          onHome={() => router.replace("/game/setup-friend")}
        />
      )}
    </SafeAreaView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  iconBtn: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    alignItems: "center", justifyContent: "center",
  },
  titleArea: { flex: 1, alignItems: "center" },
  titleBadge: { color: colors.primary, fontSize: 9, fontWeight: "bold", letterSpacing: 1.5 },
  titleText: { color: colors.foreground, fontSize: 15, fontWeight: "bold" },
  titleSub: { color: colors.textSubtle, fontSize: 11, fontWeight: "900" },

  playerBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 6,
    gap: 10,
    borderColor: colors.border,
  },
  playerBarTop: { borderBottomWidth: 1, backgroundColor: colors.surface + "55" },
  playerBarBottom: { borderTopWidth: 1, backgroundColor: colors.surface + "55" },

  colorChip: { width: 22, height: 22, borderRadius: 11, borderWidth: 2 },
  chipWhite: { backgroundColor: colors.pieceWhite, borderColor: "#c8b49a" },
  chipBlack: { backgroundColor: colors.pieceBlack, borderColor: "#3a3028" },

  playerMeta: { flex: 1, gap: 2 },
  playerName: { color: colors.foreground, fontSize: 13, fontWeight: "bold" },

  toMoveChip: {
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  toMoveText: {
    color: colors.primary, fontSize: 10, fontWeight: "900",
    letterSpacing: 1, textTransform: "uppercase",
  },

  timerChip: {
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
  },
  timerChipActive: { borderColor: colors.primary, backgroundColor: colors.primaryAlpha10 },
  timerText: {
    color: colors.textMuted, fontSize: 14, fontWeight: "900",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  timerTextActive: { color: colors.foreground },

  boardWrapper: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    paddingHorizontal: 8,
  },

  historyBar: {
    height: 46,
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface + "88",
  },
  historyChevron: {
    width: 38, height: "100%",
    alignItems: "center", justifyContent: "center",
    paddingHorizontal: 6,
  },
  historyChevronDisabled: { opacity: 0.3 },
  historyContent: {
    flexDirection: "row", alignItems: "center", paddingHorizontal: 4, gap: 3,
  },
  historyEmpty: {
    color: colors.textDisabled, fontSize: 12, fontStyle: "italic", paddingHorizontal: 4,
  },
  historyMoveNum: {
    color: colors.textDisabled, fontSize: 10,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    marginLeft: 3,
  },
  historyPill: {
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: "transparent",
  },
  historyPillActive: { backgroundColor: colors.foreground },
  historyPillText: { color: colors.textMuted, fontSize: 12, fontWeight: "600" },
  historyPillTextActive: { color: colors.background, fontWeight: "bold" },

  actionBar: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface + "66",
    paddingBottom: Platform.OS === "ios" ? 4 : 0,
    justifyContent: "space-around",
  },
  actionBtn: {
    flex: 1, alignItems: "center", justifyContent: "center",
    paddingVertical: 10, gap: 4,
  },
  actionBtnLabel: {
    color: colors.textDisabled, fontSize: 9,
    fontWeight: "bold", textTransform: "uppercase", letterSpacing: 0.8,
  },
});

// ─── Shared modal styles ───────────────────────────────────────────────────────
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
    borderRadius: 20,
    overflow: "hidden",
    width: Math.min(SCREEN_WIDTH - 48, 360),
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: "rgba(239,68,68,0.07)",
  },
  headerIcon: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: "rgba(239,68,68,0.12)",
    borderWidth: 1, borderColor: "rgba(239,68,68,0.30)",
    alignItems: "center", justifyContent: "center",
  },
  headerSub: { color: "rgba(239,68,68,0.75)", fontSize: 9, fontWeight: "bold", letterSpacing: 1.5 },
  headerTitle: { color: colors.foreground, fontSize: 15, fontWeight: "bold", marginTop: 1 },
  body: {
    color: colors.textMuted, fontSize: 13, lineHeight: 20,
    paddingHorizontal: 18, paddingVertical: 14,
  },
  btns: { flexDirection: "row", gap: 10, paddingHorizontal: 18, paddingBottom: 18 },
  btn: { flex: 1, height: 46, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  btnSecondary: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1, borderColor: colors.border,
  },
  btnDanger: { backgroundColor: colors.danger },
  btnText: { color: colors.foreground, fontSize: 14, fontWeight: "bold" },
});

// ─── Options modal styles ──────────────────────────────────────────────────────
const optStyles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface, borderRadius: 20, overflow: "hidden",
    width: Math.min(SCREEN_WIDTH - 48, 360), borderWidth: 1, borderColor: colors.border,
  },
  header: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingHorizontal: 18, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerIcon: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: colors.border,
    alignItems: "center", justifyContent: "center",
  },
  headerTitle: { flex: 1, color: colors.foreground, fontSize: 15, fontWeight: "bold" },
  body: { padding: 14, gap: 8 },
  row: {
    flexDirection: "row", alignItems: "center", gap: 12,
    padding: 14, borderRadius: 14,
    backgroundColor: colors.surfaceElevated + "88",
    borderWidth: 1, borderColor: colors.border,
  },
  rowIcon: {
    width: 40, height: 40, borderRadius: 12,
    borderWidth: 1, alignItems: "center", justifyContent: "center",
  },
  rowTitle: { color: colors.foreground, fontSize: 13, fontWeight: "bold" },
  rowSub: { color: colors.textDisabled, fontSize: 11, marginTop: 1 },
  footer: { padding: 14, paddingTop: 4 },
  doneBtn: {
    height: 46, borderRadius: 12,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1, borderColor: colors.border,
    alignItems: "center", justifyContent: "center",
  },
  doneBtnText: { color: colors.foreground, fontSize: 14, fontWeight: "bold" },
});

// ─── Result modal styles ───────────────────────────────────────────────────────
const resStyles = StyleSheet.create({
  backdrop: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.88)",
    alignItems: "center", justifyContent: "center", padding: 16,
  },
  card: {
    width: Math.min(SCREEN_WIDTH - 32, 400),
    backgroundColor: colors.surface,
    borderRadius: 24, borderWidth: 1, overflow: "hidden",
  },
  top: {
    alignItems: "center", paddingVertical: 28, paddingHorizontal: 24, gap: 8,
    backgroundColor: "rgba(255,255,255,0.02)",
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  iconWrap: {
    width: 72, height: 72, borderRadius: 36,
    alignItems: "center", justifyContent: "center", borderWidth: 1.5, marginBottom: 4,
  },
  title: { fontSize: 26, fontWeight: "900", letterSpacing: 0.5 },
  subtitle: { color: colors.textMuted, fontSize: 13, textAlign: "center" },
  statsRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: colors.border },
  statCell: { flex: 1, alignItems: "center", paddingVertical: 14, gap: 4 },
  statLabel: {
    color: colors.textDisabled, fontSize: 9,
    fontWeight: "bold", letterSpacing: 1, textTransform: "uppercase",
  },
  statValue: { color: colors.foreground, fontSize: 18, fontWeight: "900" },
  actions: { flexDirection: "row", gap: 10, padding: 16 },
  btnSecondary: {
    flex: 1, height: 48, borderRadius: 12,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1, borderColor: colors.border,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
  },
  btnSecondaryText: { color: colors.foreground, fontSize: 14, fontWeight: "bold" },
  btnPrimary: {
    flex: 1, height: 48, borderRadius: 12,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
  },
  btnPrimaryText: { color: "#000", fontSize: 14, fontWeight: "bold" },
});
