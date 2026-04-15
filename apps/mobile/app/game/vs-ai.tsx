import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  SafeAreaView,
  Platform,
  Image,
  ActivityIndicator,
  ScrollView,
  Dimensions,
  Switch,
  Vibration,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ArrowLeft,
  X,
  Minus,
  ChevronLeft,
  ChevronRight,
  Skull,
  RotateCcw,
  Settings,
  AlertTriangle,
  ArrowRight,
  Crown,
  Flag,
  Undo2,
  Volume2,
  VolumeX,
} from "lucide-react-native";
import { colors } from "../../src/theme/colors";
import { DraughtsBoard, HighlightType } from "../../src/components/game/DraughtsBoard";
import { useAiGame, type PlayerColorParam } from "../../src/hooks/useAiGame";
import { getBotByLevel, getTierForLevel, BOT_IMAGES, TIERS } from "../../src/lib/game/bots";
import { useMkaguzi } from "../../src/lib/game/mkaguzi-mobile";
import { useGameAudio } from "../../src/hooks/useGameAudio";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// ─── Tier unlock data (matches web version) ───────────────────────────────────
const TIER_UNLOCK_DATA: Record<number, {
  label: string; title: string; body: string; cta: string; accentColor: string;
}> = {
  6:  { label: "CASUAL TIER UNLOCKED", title: "The warmup is over.", body: "Your next opponents have been watching. They know your patterns. Don't get comfortable.", cta: "I'm ready.", accentColor: colors.win },
  10: { label: "COMPETITIVE TIER UNLOCKED", title: "Something stronger awakens.", body: "You've stepped into harder territory. These opponents calculate faster than you think. Every mistake will be punished.", cta: "I understand the risk.", accentColor: colors.danger },
  14: { label: "EXPERT TIER UNLOCKED", title: "They know no mercy.", body: "Few players reach this tier. Fewer survive it. Your opponent sees 12 moves ahead. You've been warned.", cta: "Show me what's waiting.", accentColor: colors.danger },
  17: { label: "MASTER TIER UNLOCKED", title: "This is the end.", body: "You've come further than most dare to try. The final opponents are relentless. There is no coming back.", cta: "Face it.", accentColor: colors.danger },
};

// ─── Route params ──────────────────────────────────────────────────────────────
interface VsAiParams {
  botLevel: string;
  playerColor: string;
  timeSeconds: string;
}

// ─── Timer formatting ──────────────────────────────────────────────────────────
function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

// ─── Captured-pieces mini row ─────────────────────────────────────────────────
function CapturedDots({ count, color }: { count: number; color: "WHITE" | "BLACK" }) {
  if (count === 0) return null;
  return (
    <View style={capturedStyles.row}>
      {Array.from({ length: Math.min(count, 12) }).map((_, i) => (
        <View
          key={i}
          style={[
            capturedStyles.dot,
            { backgroundColor: color === "WHITE" ? colors.pieceWhite : colors.pieceBlack,
              borderColor: color === "WHITE" ? "#c8b49a" : "#3a3028" },
          ]}
        />
      ))}
      {count > 12 && (
        <Text style={capturedStyles.extra}>+{count - 12}</Text>
      )}
    </View>
  );
}

const capturedStyles = StyleSheet.create({
  row: { flexDirection: "row", flexWrap: "wrap", gap: 3, alignItems: "center" },
  dot: { width: 9, height: 9, borderRadius: 5, borderWidth: 1 },
  extra: { color: colors.textMuted, fontSize: 10, fontWeight: "bold" },
});

// ─── Resign Modal ──────────────────────────────────────────────────────────────
function ResignModal({
  botName,
  visible,
  onConfirm,
  onCancel,
}: {
  botName: string;
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <TouchableOpacity
        style={modalStyles.backdrop}
        activeOpacity={1}
        onPress={onCancel}
      >
        <TouchableOpacity activeOpacity={1} onPress={() => {}}>
          <View style={modalStyles.resignCard}>
            {/* Warning header stripe */}
            <View style={modalStyles.resignHeader}>
              <View style={modalStyles.resignIconWrap}>
                <AlertTriangle color={colors.primary} size={20} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={modalStyles.resignTitleSmall}>CONFIRM RESIGN</Text>
                <Text style={modalStyles.resignTitle}>Resign this game?</Text>
              </View>
            </View>

            <Text style={modalStyles.resignBody}>
              Giving up against <Text style={{ color: colors.foreground, fontWeight: "bold" }}>{botName}</Text>?
              {"\n"}You won't earn progression from this game.
            </Text>

            <View style={modalStyles.resignBtns}>
              <TouchableOpacity
                style={[modalStyles.resignBtn, modalStyles.resignBtnSecondary]}
                onPress={onCancel}
              >
                <Text style={modalStyles.resignBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[modalStyles.resignBtn, modalStyles.resignBtnDanger]}
                onPress={onConfirm}
              >
                <Text style={modalStyles.resignBtnText}>Resign</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

// ─── Options Modal ─────────────────────────────────────────────────────────────
function OptionsModal({
  visible,
  isMuted,
  onToggleMute,
  onHome,
  onClose,
}: {
  visible: boolean;
  isMuted: boolean;
  onToggleMute: () => void;
  onHome: () => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity
        style={modalStyles.backdrop}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity activeOpacity={1} onPress={() => {}}>
          <View style={optionsStyles.card}>
            {/* Header */}
            <View style={optionsStyles.header}>
              <View style={optionsStyles.headerIconWrap}>
                <Settings color={colors.textMuted} size={16} />
              </View>
              <Text style={optionsStyles.headerTitle}>Settings</Text>
              <TouchableOpacity onPress={onClose} style={optionsStyles.closeBtn}>
                <X color={colors.textMuted} size={18} />
              </TouchableOpacity>
            </View>

            {/* Body */}
            <View style={optionsStyles.body}>
              <TouchableOpacity style={optionsStyles.row} onPress={onToggleMute}>
                <View style={[optionsStyles.rowIcon, { backgroundColor: "rgba(56,189,248,0.10)", borderColor: "rgba(56,189,248,0.20)" }]}>
                  {isMuted ? <VolumeX color="#38bdf8" size={20} /> : <Volume2 color="#38bdf8" size={20} />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={optionsStyles.rowTitle}>Sound Effects</Text>
                  <Text style={optionsStyles.rowSub}>{isMuted ? "Audio is currently muted" : "Audio is on"}</Text>
                </View>
                <Switch
                  value={!isMuted}
                  onValueChange={onToggleMute}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor="#fff"
                />
              </TouchableOpacity>

              <TouchableOpacity style={optionsStyles.row} onPress={onHome}>
                <View style={[optionsStyles.rowIcon, { backgroundColor: "rgba(245,158,11,0.10)", borderColor: "rgba(245,158,11,0.20)" }]}>
                  <ArrowLeft color="#f59e0b" size={20} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={optionsStyles.rowTitle}>Go to Lobby</Text>
                  <Text style={optionsStyles.rowSub}>Exit to main menu</Text>
                </View>
                <ChevronRight color={colors.textDisabled} size={16} />
              </TouchableOpacity>
            </View>

            <View style={optionsStyles.footer}>
              <TouchableOpacity style={optionsStyles.doneBtn} onPress={onClose}>
                <Text style={optionsStyles.doneBtnText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

// ─── Result Modal ──────────────────────────────────────────────────────────────
type GameOutcome = "win" | "loss" | "draw";

function ResultModal({
  visible,
  isPlayerWin,
  isDraw,
  botName,
  botLevel,
  botImageKey,
  moveCount,
  onRematch,
  onBack,
  onNextOpponent,
}: {
  visible: boolean;
  isPlayerWin: boolean;
  isDraw: boolean;
  botName: string;
  botLevel: number;
  botImageKey: string;
  moveCount: number;
  onRematch: () => void;
  onBack: () => void;
  onNextOpponent?: () => void;
}) {
  const outcome: GameOutcome = isPlayerWin ? "win" : isDraw ? "draw" : "loss";

  const cfg = {
    win: {
      label: "Victory!",
      sublabel: "You defeated",
      accentColor: "#f59e0b",
      borderColor: "rgba(245,158,11,0.35)",
      icon: <Crown color="#f59e0b" size={40} />,
    },
    loss: {
      label: "Defeated",
      sublabel: "Lost to",
      accentColor: "#94a3b8",
      borderColor: "rgba(148,163,184,0.25)",
      icon: null,
    },
    draw: {
      label: "Draw",
      sublabel: "Tied with",
      accentColor: "#38bdf8",
      borderColor: "rgba(56,189,248,0.30)",
      icon: <Minus color="#38bdf8" size={40} />,
    },
  }[outcome];

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={resultStyles.backdrop}>
        <View style={[resultStyles.card, { borderColor: cfg.borderColor }]}>

          {/* ── Bot portrait banner ── */}
          <View style={resultStyles.bannerWrap}>
            <Image
              source={BOT_IMAGES[botImageKey as keyof typeof BOT_IMAGES]}
              style={resultStyles.bannerImage}
              resizeMode="cover"
            />
            {/* Bottom scrim */}
            <View style={resultStyles.bannerScrim} />

            {/* Outcome info */}
            <View style={resultStyles.bannerContent}>
              {cfg.icon != null && (
                <View style={[resultStyles.outcomeIconWrap, { borderColor: cfg.accentColor + "66", backgroundColor: cfg.accentColor + "22" }]}>
                  {cfg.icon}
                </View>
              )}
              <Text style={[resultStyles.outcomeLabel, { color: cfg.accentColor }]}>{cfg.label}</Text>
              <Text style={resultStyles.outcomeSublabel}>
                {cfg.sublabel} <Text style={{ fontWeight: "bold", color: "#fff" }}>{botName}</Text>
              </Text>
            </View>

            {/* ELO badge */}
            <View style={[resultStyles.eloBadge, { borderColor: cfg.accentColor + "66", backgroundColor: cfg.accentColor + "22" }]}>
              <Text style={[resultStyles.eloBadgeText, { color: cfg.accentColor }]}>Lv.{botLevel}</Text>
            </View>
          </View>

          {/* ── Stats grid ── */}
          <View style={resultStyles.statsRow}>
            {[
              { label: "MOVES", value: String(moveCount) },
              { label: "BOT LEVEL", value: `Lv.${botLevel}` },
              { label: "RESULT", value: isPlayerWin ? "WIN" : isDraw ? "DRAW" : "LOSS" },
            ].map(({ label, value }, i) => (
              <View
                key={label}
                style={[
                  resultStyles.statCell,
                  i < 2 && { borderRightWidth: 1, borderRightColor: colors.border },
                ]}
              >
                <Text style={resultStyles.statLabel}>{label}</Text>
                <Text style={resultStyles.statValue}>{value}</Text>
              </View>
            ))}
          </View>

          {/* ── Action buttons ── */}
          <View style={[resultStyles.actions, { flexDirection: "column" }]}>
            {isPlayerWin && onNextOpponent && (
              <TouchableOpacity
                style={[resultStyles.btnPrimary, { backgroundColor: cfg.accentColor, width: "100%" }]}
                onPress={onNextOpponent}
              >
                <Text style={resultStyles.btnPrimaryText}>Next AI</Text>
                <ArrowRight color="#000" size={16} />
              </TouchableOpacity>
            )}
            <View style={{ flexDirection: "row", gap: 12, width: "100%" }}>
              <TouchableOpacity style={resultStyles.btnSecondary} onPress={onRematch}>
                <RotateCcw color={colors.foreground} size={16} />
                <Text style={resultStyles.btnSecondaryText}>Rematch</Text>
              </TouchableOpacity>
              <TouchableOpacity style={resultStyles.btnSecondary} onPress={onBack}>
                <Settings color={colors.foreground} size={16} />
                <Text style={resultStyles.btnSecondaryText}>Setup</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Main Screen ────────────────────────────────────────────────────────────────
export default function VsAiScreen() {
  const router = useRouter();
  const params = useLocalSearchParams() as unknown as VsAiParams;
  const { isReady, initError } = useMkaguzi();

  const botLevel = parseInt(params.botLevel ?? "1", 10);
  const playerColor = (params.playerColor ?? "RANDOM") as PlayerColorParam;
  const timeSeconds = parseInt(params.timeSeconds ?? "0", 10);

  const bot = getBotByLevel(botLevel);
  const tier = getTierForLevel(botLevel);

  const game = useAiGame(botLevel, playerColor, timeSeconds);

  const [showResignModal, setShowResignModal] = useState(false);
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [tierUnlock, setTierUnlock] = useState<(typeof TIER_UNLOCK_DATA)[number] | null>(null);

  // Move history scroll ref — auto-scroll to end
  const historyScrollRef = useRef<ScrollView>(null);
  useEffect(() => {
    if (game.moveHistory.length > 0) {
      historyScrollRef.current?.scrollToEnd({ animated: true });
    }
  }, [game.moveHistory.length]);

  // Audio system integration
  const audio = useGameAudio();
  const prevMoveCount = useRef(0);

  useEffect(() => {
    if (isReady && !game.result) {
      audio.playGameStart();
    }
  }, [isReady]);

  useEffect(() => {
    if (game.moveHistory.length > prevMoveCount.current) {
      const lastMove = game.moveHistory[game.moveHistory.length - 1];
      if (lastMove.captureCount > 0) {
        audio.playCapture(lastMove.captureCount);
      } else {
        audio.playMove();
      }
      prevMoveCount.current = game.moveHistory.length;
    } else if (game.moveHistory.length === 0) {
      prevMoveCount.current = 0;
    }
  }, [game.moveHistory]); // eslint-disable-line react-hooks/exhaustive-deps

  // Board shake — triggered by invalidMoveSignal
  const prevInvalidRef = useRef(0);
  const boardInvalidRef = useRef<(() => void) | null>(null);
  useEffect(() => {
    if (game.invalidMoveSignal !== prevInvalidRef.current) {
      prevInvalidRef.current = game.invalidMoveSignal;
      boardInvalidRef.current?.();
    }
  }, [game.invalidMoveSignal]);

  // Tier unlock detection — fire once when a new tier is reached
  const prevResultRef = useRef<typeof game.result>(null);
  useEffect(() => {
    if (!game.result) {
      prevResultRef.current = null;
    } else if (game.result && !prevResultRef.current) {
      prevResultRef.current = game.result;
      const isPlayerWin =
        game.result.winner !== null &&
        game.result.winner !== "DRAW" &&
        game.result.winner === (game.playerColor as unknown as string);
        
      const outcome = isPlayerWin ? "win" : game.result.winner === "DRAW" ? "draw" : "loss";
      audio.playGameEnd(outcome);

      if (isPlayerWin) {
        Vibration.vibrate([0, 400, 200, 400]); // Double pulse vibration on win
        const nextLevel = botLevel + 1;
        const tierData = TIER_UNLOCK_DATA[nextLevel];
        if (tierData) {
          setTimeout(() => setTierUnlock(tierData), 600);
        }
      }
    }
  }, [game.result, botLevel, game.playerColor, audio]);

  // ── Build highlights ──────────────────────────────────────────────────────
  const highlights: Record<number, HighlightType> = {};
  if (game.selectedSquare != null) {
    highlights[game.selectedSquare] = "selected";
  }
  for (const dest of game.validDestinations) {
    if (!highlights[dest]) highlights[dest] = "destination";
  }
  for (const cap of game.capturablePieces) {
    if (!highlights[cap]) highlights[cap] = "capturable";
  }

  // ── Result helpers ────────────────────────────────────────────────────────
  const playerColorStr = game.playerColor as unknown as string;
  const isPlayerWin =
    game.result?.winner != null &&
    game.result.winner !== "DRAW" &&
    game.result.winner === playerColorStr;
  const isDraw = game.result?.winner === "DRAW";

  // Resolve whose captured pieces to show in each row
  const botIsWhite = playerColorStr === "BLACK";
  const botCapturedCount = botIsWhite ? game.capturedBy.WHITE : game.capturedBy.BLACK;
  const playerCapturedCount = botIsWhite ? game.capturedBy.BLACK : game.capturedBy.WHITE;
  const opponentColor = botIsWhite ? "WHITE" : "BLACK";
  const humanColor = botIsWhite ? "BLACK" : "WHITE";

  // ── Loading screen ────────────────────────────────────────────────────────
  if (!isReady) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingCenter}>
          {initError ? (
            <>
              <Text style={[styles.loadingText, { color: colors.danger }]}>Engine failed to load</Text>
              <Text style={[styles.loadingText, { fontSize: 12, marginTop: 8, color: colors.textMuted }]}>{initError}</Text>
            </>
          ) : (
            <>
              <ActivityIndicator color={colors.primary} size="large" />
              <Text style={styles.loadingText}>Loading engine…</Text>
            </>
          )}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>

      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => { if (game.result) router.back(); else setShowResignModal(true); }}
        >
          <ArrowLeft color={colors.foreground} size={20} />
        </TouchableOpacity>

        <View style={styles.botTitleRow}>
          <Text style={[styles.tierBadge, { color: tier.color }]}>{tier.label.toUpperCase()}</Text>
          <Text style={styles.botNameText}>{bot.name}</Text>
          <Text style={styles.botEloText}>ELO {bot.elo}</Text>
        </View>

        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => setShowOptionsModal(true)}
        >
          <Settings color={colors.textMuted} size={20} />
        </TouchableOpacity>
      </View>

      {/* ── Opponent (bot) row ────────────────────────────────────────────── */}
      <View style={[styles.playerBar, styles.playerBarTop]}>
        <Image source={BOT_IMAGES[bot.imageKey]} style={styles.avatar} />
        <View style={styles.playerMeta}>
          <Text style={styles.playerNameText}>{bot.name}</Text>
          <CapturedDots count={botCapturedCount} color={humanColor as "WHITE" | "BLACK"} />
        </View>
        {timeSeconds > 0 && (
          <View style={[
            styles.timerBadge,
            game.currentPlayer !== game.playerColor && !game.result && styles.timerBadgeActive,
          ]}>
            <Text style={[
              styles.timerText,
              game.currentPlayer !== game.playerColor && !game.result && styles.timerTextActive,
            ]}>
              {formatTime(game.playerColor.toString() === "WHITE" ? game.timeLeft.BLACK : game.timeLeft.WHITE)}
            </Text>
          </View>
        )}
      </View>

      {/* ── Board ─────────────────────────────────────────────────────────── */}
      <View style={styles.boardWrapper}>
        <DraughtsBoard
          board={game.board}
          highlights={highlights}
          onSquarePress={game.selectSquare}
          onInvalidPress={() => {}}
          lastMove={game.lastMove}
          disabled={!!game.result || game.isAiThinking || game.currentPlayer !== game.playerColor}
          flipped={game.flipBoard}
        />
      </View>

      {/* ── Human player row ──────────────────────────────────────────────── */}
      <View style={[styles.playerBar, styles.playerBarBottom]}>
        <View style={[
          styles.colorChip,
          game.playerColor.toString() === "WHITE" ? styles.colorChipWhite : styles.colorChipBlack,
        ]} />
        <View style={styles.playerMeta}>
          <Text style={styles.playerNameText}>You</Text>
          <CapturedDots count={playerCapturedCount} color={opponentColor as "WHITE" | "BLACK"} />
        </View>
        {timeSeconds > 0 && (
          <View style={[
            styles.timerBadge,
            game.currentPlayer === game.playerColor && !game.result && styles.timerBadgeActive,
          ]}>
            <Text style={[
              styles.timerText,
              game.currentPlayer === game.playerColor && !game.result && styles.timerTextActive,
            ]}>
              {formatTime(game.playerColor.toString() === "WHITE" ? game.timeLeft.WHITE : game.timeLeft.BLACK)}
            </Text>
          </View>
        )}
      </View>

      {/* ── Move history strip (with chevron navigation) ─────────────────── */}
      <View style={styles.historyBar}>
        {/* Back chevron */}
        <TouchableOpacity
          style={[styles.historyChevron, game.moveHistory.length === 0 && styles.historyChevronDisabled]}
          disabled={game.moveHistory.length === 0}
          onPress={() => historyScrollRef.current?.scrollTo({ x: 0, animated: true })}
        >
          <ChevronLeft color={game.moveHistory.length === 0 ? colors.textDisabled : colors.textMuted} size={20} strokeWidth={3} />
        </TouchableOpacity>

        <ScrollView
          ref={historyScrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.historyContent}
          style={{ flex: 1 }}
        >
          {game.moveHistory.length === 0 ? (
            <Text style={styles.historyEmpty}>Waiting for first move…</Text>
          ) : (
            game.moveHistory.map((m, idx) => {
              const isLatest = idx === game.moveHistory.length - 1;
              const moveNum = Math.floor(idx / 2) + 1;
              const isWhiteMove = idx % 2 === 0;
              return (
                <React.Fragment key={idx}>
                  {isWhiteMove && (
                    <Text style={styles.historyMoveNum}>{moveNum}.</Text>
                  )}
                  <View style={[styles.historyPill, isLatest && styles.historyPillActive]}>
                    <Text style={[styles.historyPillText, isLatest && styles.historyPillTextActive]}>
                      {m.notation}
                    </Text>
                  </View>
                </React.Fragment>
              );
            })
          )}
        </ScrollView>

        {/* Forward chevron */}
        <TouchableOpacity
          style={[styles.historyChevron, game.moveHistory.length === 0 && styles.historyChevronDisabled]}
          disabled={game.moveHistory.length === 0}
          onPress={() => historyScrollRef.current?.scrollToEnd({ animated: true })}
        >
          <ChevronRight color={game.moveHistory.length === 0 ? colors.textDisabled : colors.textMuted} size={20} strokeWidth={3} />
        </TouchableOpacity>
      </View>

      {/* ── Bottom action bar (web-style icon strip) ───────────────────────── */}
      <View style={styles.actionBar}>
        {/* Settings */}
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => setShowOptionsModal(true)}
        >
          <Settings color={colors.textDisabled} size={22} />
          <Text style={styles.actionBtnLabel}>Settings</Text>
        </TouchableOpacity>

        {/* Resign */}
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => !game.result && setShowResignModal(true)}
          disabled={!!game.result}
        >
          <Flag color={game.result ? colors.textDisabled : colors.textDisabled} size={22} />
          <Text style={styles.actionBtnLabel}>Resign</Text>
        </TouchableOpacity>

        {/* Undo */}
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={game.undo}
          disabled={game.moveHistory.length < 1 || game.isAiThinking || !!game.result}
        >
          <Undo2
            color={
              game.moveHistory.length < 1 || game.isAiThinking || !!game.result
                ? colors.textDisabled
                : colors.foreground
            }
            size={22}
          />
          <Text style={[
            styles.actionBtnLabel,
            game.moveHistory.length > 0 && !game.isAiThinking && !game.result
              && { color: colors.foreground },
          ]}>
            Undo
          </Text>
        </TouchableOpacity>

        {/* Rematch / Reset */}
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={game.reset}
        >
          <RotateCcw color={colors.textDisabled} size={22} />
          <Text style={styles.actionBtnLabel}>Reset</Text>
        </TouchableOpacity>
      </View>

      {/* ── Resign modal ── */}
      <ResignModal
        botName={bot.name}
        visible={showResignModal}
        onConfirm={() => { setShowResignModal(false); game.resign(); }}
        onCancel={() => setShowResignModal(false)}
      />

      {/* ── Options modal ── */}
      <OptionsModal
        visible={showOptionsModal}
        isMuted={audio.isMuted}
        onToggleMute={audio.toggleMute}
        onHome={() => { setShowOptionsModal(false); router.back(); }}
        onClose={() => setShowOptionsModal(false)}
      />

      {/* ── Tier unlock overlay ── */}
      {tierUnlock && (
        <View style={tierStyles.overlay}>
          <View style={[tierStyles.card, { borderColor: tierUnlock.accentColor + "66" }]}>
            {/* Top glow bar */}
            <View style={[tierStyles.glowBar, { backgroundColor: tierUnlock.accentColor }]} />

            <View style={tierStyles.iconWrap}>
              <Skull color={tierUnlock.accentColor} size={36} />
            </View>

            <Text style={[tierStyles.label, { color: tierUnlock.accentColor }]}>
              {tierUnlock.label}
            </Text>
            <Text style={tierStyles.title}>{tierUnlock.title}</Text>
            <Text style={tierStyles.body}>{tierUnlock.body}</Text>

            <TouchableOpacity
              style={[tierStyles.ctaBtn, { borderColor: tierUnlock.accentColor, backgroundColor: tierUnlock.accentColor + "22" }]}
              onPress={() => setTierUnlock(null)}
            >
              <Text style={[tierStyles.ctaText, { color: tierUnlock.accentColor }]}>{tierUnlock.cta}</Text>
            </TouchableOpacity>

            {/* Bottom glow bar */}
            <View style={[tierStyles.glowBar, { backgroundColor: tierUnlock.accentColor + "80" }]} />
          </View>
        </View>
      )}

      {/* ── Result modal ── */}
      <ResultModal
        visible={!!game.result && !tierUnlock}
        isPlayerWin={isPlayerWin}
        isDraw={isDraw}
        botName={bot.name}
        botLevel={botLevel}
        botImageKey={bot.imageKey}
        moveCount={game.moveCount}
        onRematch={game.reset}
        onBack={() => router.back()}
        onNextOpponent={
          botLevel < 19
            ? () => router.replace({ pathname: "/game/vs-ai", params: { ...params, botLevel: (botLevel + 1).toString() } })
            : undefined
        }
      />

    </SafeAreaView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loadingCenter: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16 },
  loadingText: { color: colors.textMuted, fontSize: 16 },

  // Top bar
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  iconBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    alignItems: "center", justifyContent: "center",
  },
  botTitleRow: { flex: 1, alignItems: "center" },
  tierBadge: { fontSize: 9, fontWeight: "bold", letterSpacing: 1.5 },
  botNameText: { color: colors.foreground, fontSize: 15, fontWeight: "bold" },
  botEloText: { color: colors.textSubtle, fontSize: 11, fontWeight: "900" },

  // Player bars
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
  avatar: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: colors.surface,
  },
  playerMeta: { flex: 1, gap: 2 },
  playerNameText: { color: colors.foreground, fontSize: 13, fontWeight: "bold" },

  colorChip: { width: 22, height: 22, borderRadius: 11, borderWidth: 2 },
  colorChipWhite: { backgroundColor: colors.pieceWhite, borderColor: "#c8b49a" },
  colorChipBlack: { backgroundColor: colors.pieceBlack, borderColor: "#3a3028" },

  // Timer badge
  timerBadge: {
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
  },
  timerBadgeActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryAlpha10,
  },
  timerText: {
    color: colors.textMuted, fontSize: 14, fontWeight: "900",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  timerTextActive: { color: colors.foreground },

  // Board
  boardWrapper: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    paddingHorizontal: 8,
  },

  // History bar (with chevrons)
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
    color: colors.textDisabled, fontSize: 12, fontStyle: "italic",
    paddingHorizontal: 4,
  },
  historyMoveNum: {
    color: colors.textDisabled, fontSize: 10,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    marginLeft: 3,
  },
  historyPill: {
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6,
    backgroundColor: "transparent",
  },
  historyPillActive: { backgroundColor: colors.foreground },
  historyPillText: { color: colors.textMuted, fontSize: 12, fontWeight: "600" },
  historyPillTextActive: { color: colors.background, fontWeight: "bold" },

  // Bottom action bar (web-style)
  actionBar: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface + "66",
    paddingBottom: Platform.OS === "ios" ? 4 : 0,
    justifyContent: "space-around",
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

// ─── Modal Styles ──────────────────────────────────────────────────────────────
const modalStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },

  // Resign card
  resignCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    overflow: "hidden",
    width: Math.min(SCREEN_WIDTH - 48, 360),
    borderWidth: 1,
    borderColor: colors.border,
  },
  resignHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: "rgba(249,115,22,0.07)",
  },
  resignIconWrap: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: "rgba(249,115,22,0.12)",
    borderWidth: 1, borderColor: "rgba(249,115,22,0.30)",
    alignItems: "center", justifyContent: "center",
  },
  resignTitleSmall: {
    color: "rgba(249,115,22,0.75)",
    fontSize: 9, fontWeight: "bold", letterSpacing: 1.5,
  },
  resignTitle: {
    color: colors.foreground,
    fontSize: 15, fontWeight: "bold", marginTop: 1,
  },
  resignBody: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 20,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  resignBtns: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 18,
    paddingBottom: 18,
  },
  resignBtn: {
    flex: 1, height: 46, borderRadius: 12,
    alignItems: "center", justifyContent: "center",
  },
  resignBtnSecondary: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1, borderColor: colors.border,
  },
  resignBtnDanger: { backgroundColor: colors.danger },
  resignBtnText: { color: colors.foreground, fontSize: 14, fontWeight: "bold" },
});

// ─── Options Card Styles ───────────────────────────────────────────────────────
const optionsStyles = StyleSheet.create({
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
    gap: 10,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerIconWrap: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1, borderColor: colors.border,
    alignItems: "center", justifyContent: "center",
  },
  headerTitle: { flex: 1, color: colors.foreground, fontSize: 15, fontWeight: "bold" },
  closeBtn: { padding: 4 },
  body: { padding: 14, gap: 8 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    backgroundColor: colors.surfaceElevated + "88",
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowIcon: {
    width: 40, height: 40, borderRadius: 12,
    borderWidth: 1,
    alignItems: "center", justifyContent: "center",
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

// ─── Result Modal Styles ───────────────────────────────────────────────────────
const resultStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.88)",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  card: {
    width: Math.min(SCREEN_WIDTH - 24, 460),
    backgroundColor: "#050505",
    borderRadius: 24,
    borderWidth: 1,
    overflow: "hidden",
  },

  // Banner — taller for more impact
  bannerWrap: {
    width: "100%",
    height: 230,
    position: "relative",
  },
  bannerImage: {
    width: "100%",
    height: "100%",
  },
  bannerScrim: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "70%",
    backgroundColor: "rgba(5,5,5,0.75)",
    opacity: 0.9,
  },
  bannerContent: {
    position: "absolute",
    bottom: 16,
    left: 0,
    right: 0,
    alignItems: "center",
    gap: 5,
  },
  outcomeIconWrap: {
    width: 68, height: 68, borderRadius: 34,
    borderWidth: 2,
    alignItems: "center", justifyContent: "center",
    marginBottom: 6,
  },
  outcomeLabel: {
    fontSize: 30, fontWeight: "900", letterSpacing: -0.5,
  },
  outcomeSublabel: {
    color: "rgba(255,255,255,0.70)", fontSize: 15,
  },
  eloBadge: {
    position: "absolute",
    top: 12, right: 12,
    borderRadius: 20, borderWidth: 1,
    paddingHorizontal: 12, paddingVertical: 5,
  },
  eloBadgeText: {
    fontSize: 12, fontWeight: "bold",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },

  // Stats — more breathing room
  statsRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  statCell: {
    flex: 1, alignItems: "center",
    paddingVertical: 16,
  },
  statLabel: {
    color: colors.textDisabled,
    fontSize: 10, fontWeight: "bold", letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  statValue: {
    color: colors.foreground,
    fontSize: 18, fontWeight: "bold", marginTop: 4,
  },

  // Action buttons — taller and more padded
  actions: {
    flexDirection: "row",
    gap: 12,
    padding: 20,
  },
  btnSecondary: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 52, borderRadius: 14,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1, borderColor: colors.border,
  },
  btnSecondaryText: { color: colors.foreground, fontSize: 15, fontWeight: "bold" },
  btnPrimary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 52, borderRadius: 14,
  },
  btnPrimaryText: { color: "#000", fontSize: 15, fontWeight: "bold" },
});

// ─── Tier Overlay Styles ───────────────────────────────────────────────────────
const tierStyles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "rgba(10,0,0,0.96)",
  },
  card: {
    width: "100%", maxWidth: 360,
    backgroundColor: "#050505",
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
    alignItems: "center",
  },
  glowBar: { width: "100%", height: 2 },
  iconWrap: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center", justifyContent: "center",
    marginTop: 24, marginBottom: 8,
  },
  label: {
    fontSize: 10, fontWeight: "900",
    letterSpacing: 3, textTransform: "uppercase",
    marginBottom: 8,
  },
  title: {
    color: "#fff", fontSize: 20, fontWeight: "900",
    textAlign: "center", paddingHorizontal: 20, marginBottom: 12,
  },
  body: {
    color: "rgba(255,255,255,0.55)", fontSize: 13,
    textAlign: "center", paddingHorizontal: 20, lineHeight: 20, marginBottom: 24,
  },
  ctaBtn: {
    width: "80%", borderWidth: 1, borderRadius: 14,
    paddingVertical: 14, marginBottom: 24, alignItems: "center",
  },
  ctaText: { fontSize: 14, fontWeight: "bold" },
});
