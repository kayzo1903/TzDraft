import React, { useRef, useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Dimensions,
  ScrollView,
  Modal,
  Switch,
  TextInput,
  KeyboardAvoidingView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  RotateCcw,
  Settings,
  Undo2,
  RefreshCcw,
  ChevronLeft,
  ChevronRight,
  User,
  X,
  Volume2,
  VolumeX,
  Crown,
  Minus,
  BookmarkPlus,
  BookmarkPlus as BookmarkIcon,
  BookMarked,
  LogIn,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Edit3,
  type LucideIcon,
} from "lucide-react-native";
import { ActivityIndicator } from "react-native";
import { BoardState, PlayerColor } from "@tzdraft/mkaguzi-engine";
import { colors } from "../../src/theme/colors";
import { getEndgameReasonLabel } from "../../src/lib/game/rules";
import { DraughtsBoard, HighlightType } from "../../src/components/game/DraughtsBoard";
import { useFreeGame } from "../../src/hooks/useFreeGame";
import { useGameAudio } from "../../src/hooks/useGameAudio";
import { useAuthStore } from "../../src/auth/auth-store";
import { studyService } from "../../src/services/study.service";
import { LoadingScreen } from "../../src/components/ui/LoadingScreen";
import { ThemedModal } from "../../src/components/ui/ThemedModal";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// --- Endgame Countdown Indicator ---
function EndgameCountdownIndicator({
  remaining,
  favoredColor,
  t,
}: {
  remaining: number;
  favoredColor: string | null;
  t: (key: string, options?: any) => string;
}) {
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

// --- Captured pieces dots ---
function CapturedDots({ count, color }: { count: number; color: "WHITE" | "BLACK" }) {
  if (count === 0) return null;
  return (
    <View style={capturedStyles.row}>
      {Array.from({ length: Math.min(count, 12) }).map((_, i) => (
        <View
          key={i}
          style={[
            capturedStyles.dot,
            {
              backgroundColor: color === "WHITE" ? colors.pieceWhite : colors.pieceBlack,
              borderColor: color === "WHITE" ? "#c8b49a" : "#3a3028",
            },
          ]}
        />
      ))}
      {count > 12 && <Text style={capturedStyles.extra}>+{count - 12}</Text>}
    </View>
  );
}

const capturedStyles = StyleSheet.create({
  row: { flexDirection: "row", flexWrap: "wrap", gap: 3, alignItems: "center" },
  dot: { width: 9, height: 9, borderRadius: 5, borderWidth: 1 },
  extra: { color: colors.textMuted, fontSize: 10, fontWeight: "bold" },
});

// --- Options Modal ---
function OptionsModal({
  visible,
  isMuted,
  onToggleMute,
  onHome,
  onStudies,
  onClose,
  showStudies,
}: {
  visible: boolean;
  isMuted: boolean;
  onToggleMute: () => void;
  onHome: () => void;
  onStudies: () => void;
  onClose: () => void;
  showStudies: boolean;
}) {
  const { t } = useTranslation();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={modalStyles.backdrop} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} onPress={() => {}}>
          <View style={optionsStyles.card}>
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
              <TouchableOpacity style={optionsStyles.row} onPress={onToggleMute}>
                <View style={[optionsStyles.rowIcon, { backgroundColor: "rgba(56,189,248,0.10)", borderColor: "rgba(56,189,248,0.20)" }]}>
                  {isMuted ? <VolumeX color="#38bdf8" size={20} /> : <Volume2 color="#38bdf8" size={20} />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={optionsStyles.rowTitle}>{t("gameArena.actions.mute")}</Text>
                  <Text style={optionsStyles.rowSub}>{isMuted ? t("gameArena.actions.mute") : t("gameArena.actions.unmute")}</Text>
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
                  <Text style={optionsStyles.rowTitle}>{t("gameArena.actions.home")}</Text>
                  <Text style={optionsStyles.rowSub}>{t("gameArena.gameOver.backToLobby")}</Text>
                </View>
                <ChevronRight color={colors.textDisabled} size={16} />
              </TouchableOpacity>

              {showStudies && (
                <TouchableOpacity style={optionsStyles.row} onPress={onStudies}>
                  <View style={[optionsStyles.rowIcon, { backgroundColor: colors.primaryAlpha10, borderColor: colors.primaryAlpha30 }]}>
                    <BookMarked color={colors.primary} size={20} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={optionsStyles.rowTitle}>{t("studies.title")}</Text>
                    <Text style={optionsStyles.rowSub}>{t("studies.homeSubtitle")}</Text>
                  </View>
                  <ChevronRight color={colors.textDisabled} size={16} />
                </TouchableOpacity>
              )}
            </View>

            <View style={optionsStyles.footer}>
              <TouchableOpacity style={optionsStyles.doneBtn} onPress={onClose}>
                <Text style={optionsStyles.doneBtnText}>{t("common.done")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

// --- Save Feedback Modal (success / error) ---
function SaveFeedbackModal({
  visible,
  type,
  title,
  message,
  onClose,
}: {
  visible: boolean;
  type: "success" | "error";
  title: string;
  message: string;
  onClose: () => void;
}) {
  const isSuccess = type === "success";
  const icon = isSuccess ? CheckCircle2 : AlertCircle;
  const accent = isSuccess ? colors.primary : colors.danger;
  const bg = isSuccess ? colors.primaryAlpha15 : colors.dangerAlpha20;

  return (
    <ThemedModal
      visible={visible}
      onClose={onClose}
      label={isSuccess ? "SAVE SUCCESSFUL" : "SAVE FAILED"}
      title={title}
      subtitle={message}
      icon={icon}
      iconColor={accent}
      iconBg={bg}
      actions={[{ label: "Got it", onPress: onClose, type: "primary" }]}
    />
  );
}

// --- Login Required Modal ---
function LoginRequiredModal({
  visible,
  onClose,
  onLogin,
}: {
  visible: boolean;
  onClose: () => void;
  onLogin: () => void;
}) {
  const { t } = useTranslation();
  return (
    <ThemedModal
      visible={visible}
      onClose={onClose}
      label="AUTHENTICATION REQUIRED"
      title={t("freePlay.save.loginRequired", "Login Required")}
      subtitle={t("freePlay.save.loginMessage", "You need an account to save studies. Your saved games help us build puzzles and playbooks for the community.")}
      icon={LogIn}
      actions={[
        { label: t("common.cancel", "Cancel"), onPress: onClose },
        { label: t("freePlay.save.loginAction", "Log In"), onPress: onLogin, type: "primary" },
      ]}
    />
  );
}

// --- Save Study Modal ---
function SaveStudyModal({
  visible,
  isSaving,
  onClose,
  onSave,
}: {
  visible: boolean;
  isSaving: boolean;
  onClose: () => void;
  onSave: (name: string, description: string) => void;
}) {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  // Reset fields each time the modal opens
  useEffect(() => {
    if (visible) {
      setName("");
      setDescription("");
    }
  }, [visible]);

  const canSave = name.trim().length > 0 && !isSaving;

  return (
    <ThemedModal
      visible={visible}
      onClose={onClose}
      label="PLAYBOOK COLLECTION"
      title={t("freePlay.save.title", "Save Study")}
      icon={BookmarkIcon}
      dismissable={!isSaving}
      actions={[
        { label: t("common.cancel", "Cancel"), onPress: onClose },
        { label: t("freePlay.save.saveAction", "Save"), onPress: () => onSave(name.trim(), description.trim()), type: "primary", loading: isSaving },
      ]}
    >
      <View style={{ gap: 12 }}>
        <View>
          <Text style={saveStyles.fieldLabel}>{t("freePlay.save.nameLabel", "Name")} *</Text>
          <TextInput
            style={saveStyles.input}
            placeholder={t("freePlay.save.namePlaceholder", "e.g. King endgame pattern")}
            placeholderTextColor={colors.textDisabled}
            value={name}
            onChangeText={setName}
            maxLength={120}
            editable={!isSaving}
            returnKeyType="next"
          />
        </View>

        <View>
          <Text style={saveStyles.fieldLabel}>{t("freePlay.save.descLabel", "Description (optional)")}</Text>
          <TextInput
            style={[saveStyles.input, saveStyles.inputMultiline]}
            placeholder={t("freePlay.save.descPlaceholder", "Describe what makes this position interesting…")}
            placeholderTextColor={colors.textDisabled}
            value={description}
            onChangeText={setDescription}
            maxLength={500}
            multiline
            numberOfLines={3}
            editable={!isSaving}
            textAlignVertical="top"
          />
        </View>

        <Text style={saveStyles.helpText}>
          {t("freePlay.save.helpText", "Saved studies may be used by the TzDraft team to create puzzles and playbooks.")}
        </Text>
      </View>
    </ThemedModal>
  );
}

// --- Result Modal ---
function FreePlayResultModal({
  visible,
  winner,
  reason,
  moveCount,
  onReset,
  onHome,
}: {
  visible: boolean;
  winner: "WHITE" | "BLACK" | "DRAW";
  reason: string;
  moveCount: number;
  onReset: () => void;
  onHome: () => void;
}) {
  const { t } = useTranslation();
  const isDraw = winner === "DRAW";
  const accentColor = isDraw ? "#38bdf8" : colors.primary;
  const borderColor = isDraw ? "rgba(56,189,248,0.30)" : colors.primaryAlpha30;

  const title = isDraw 
    ? t("freePlay.result.draw") 
    : winner === "WHITE" 
      ? t("freePlay.result.whiteWins") 
      : t("freePlay.result.blackWins");
  
  const subtitle = isDraw 
    ? getEndgameReasonLabel(reason, false, true, t)
    : winner === "WHITE"
      ? t("freePlay.result.noMovesForBlack")
      : t("freePlay.result.noMovesForWhite");

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={resultStyles.backdrop}>
        <View style={[resultStyles.card, { borderColor }]}>
          {/* Icon + title */}
          <View style={resultStyles.topSection}>
            <View style={[resultStyles.iconWrap, { borderColor: accentColor + "66", backgroundColor: accentColor + "22" }]}>
              {isDraw
                ? <Minus color={accentColor} size={36} />
                : <Crown color={accentColor} size={36} />}
            </View>
            <Text style={[resultStyles.title, { color: accentColor }]}>{title}</Text>
            <Text style={resultStyles.subtitle}>{subtitle}</Text>
          </View>

          {/* Stats */}
          <View style={resultStyles.statsRow}>
            {[
              { label: t("gameArena.gameOver.moves"), value: String(moveCount) },
              { label: t("gameArena.gameOver.result"), value: isDraw ? t("freePlay.result.draw") : "WIN" },
              { label: t("gameArena.gameOver.mode"), value: t("studies.badge") },
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

          {/* Actions */}
          <View style={resultStyles.actions}>
            <TouchableOpacity style={resultStyles.btnSecondary} onPress={onReset}>
              <RotateCcw color={colors.foreground} size={16} />
              <Text style={resultStyles.btnSecondaryText}>{t("gameArena.actions.reset")}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[resultStyles.btnPrimary, { backgroundColor: accentColor }]} onPress={onHome}>
              <ArrowLeft color="#000" size={16} />
              <Text style={resultStyles.btnPrimaryText}>{t("gameArena.actions.home")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function FreePlayScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const game = useFreeGame();
  const audio = useGameAudio();
  const { isAuthenticated, user } = useAuthStore();
  const isGuest = user?.accountType === "GUEST";
  const hasSession = isAuthenticated && !isGuest;

  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSavePress = () => {
    if (!hasSession) {
      setShowLoginModal(true);
    } else {
      setShowSaveModal(true);
    }
  };

  const handleSave = async (name: string, description: string) => {
    setIsSaving(true);
    try {
      await studyService.saveStudy({
        name,
        description: description || undefined,
        fenHistory: game.fenHistory,
        moveHistory: game.moveHistory,
        moveCount: game.moveCount,
      });
      setShowSaveModal(false);
      setShowSuccessModal(true);
    } catch (err) {
      setShowErrorModal(true);
    } finally {
      setIsSaving(false);
    }
  };

  // History scrolling & scrubbing
  const [viewingMoveIndex, setViewingMoveIndex] = useState<number | null>(null);
  const historyScrollRef = useRef<ScrollView>(null);

  // Return to live board when a new move is played
  useEffect(() => {
    setViewingMoveIndex(null);
  }, [game.moveHistory.length]);

  const liveIndex = game.moveHistory.length;
  const activeIndex = viewingMoveIndex !== null ? viewingMoveIndex : liveIndex;
  const isViewingHistory = viewingMoveIndex !== null && viewingMoveIndex < liveIndex;

  // Correct board + last-move for the viewed position
  const displayFen = activeIndex === liveIndex ? game.fen : (game.fenHistory[activeIndex] || game.fen);
  const displayBoard = activeIndex === liveIndex ? game.board : BoardState.fromFen(displayFen);
  const displayLastMove = activeIndex === liveIndex
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

  // Audio — game start
  useEffect(() => {
    if (game.isReady) {
      audio.playGameStart();
    }
  }, [game.isReady]); // eslint-disable-line react-hooks/exhaustive-deps

  // Audio — move sounds
  const prevMoveCount = useRef(0);
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
  }, [game.moveHistory.length, audio]);

  // Audio — game end
  const prevResultRef = useRef<typeof game.result>(null);
  useEffect(() => {
    if (game.result && !prevResultRef.current) {
      prevResultRef.current = game.result;
      audio.playGameEnd(game.result.winner === "DRAW" ? "draw" : "win");
    }
    if (!game.result) {
      prevResultRef.current = null;
    }
  }, [game.result, audio]);

  // Highlights (only for live board)
  const highlights: Record<number, HighlightType> = {};
  if (game.selectedSquare != null) {
    highlights[game.selectedSquare] = "selected";
  }
  for (const dest of game.validDestinations) {
    highlights[dest] = "destination";
  }
  for (const cap of game.capturablePieces) {
    if (!highlights[cap]) highlights[cap] = "capturable";
  }

  // Captured pieces
  const allPieces = game.board.getAllPieces();
  const whitePiecesCount = allPieces.filter((p) => p.color === "WHITE").length;
  const blackPiecesCount = allPieces.filter((p) => p.color === "BLACK").length;
  const capturedByWhite = 12 - blackPiecesCount;
  const capturedByBlack = 12 - whitePiecesCount;

  if (!game.isReady) {
    return <LoadingScreen message={t("game.loadingEngine", "Initializing Engine...")} />;
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* --- Top Bar --- */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
          <ArrowLeft color={colors.foreground} size={20} />
        </TouchableOpacity>

        <View style={styles.botTitleRow}>
          <Text style={[styles.tierBadge, { color: colors.primary }]}>{t("studies.badge")}</Text>
          <Text style={styles.botNameText}>{t("freePlay.title")}</Text>
          <Text style={styles.botEloText}>ANALYSIS MODE</Text>
        </View>

        <TouchableOpacity style={styles.iconBtn} onPress={() => setShowOptionsModal(true)}>
          <Settings color={colors.textMuted} size={20} />
        </TouchableOpacity>
      </View>

      {/* --- Game Area (Centered) --- */}
      <View style={styles.gameArea}>
        {/* --- Black / Opponent Row --- */}
        <View style={[styles.playerBar, styles.playerBarTop]}>
          <View style={[styles.avatar, { alignItems: "center", justifyContent: "center", backgroundColor: colors.surface }]}>
            <User color={colors.textDisabled} size={20} />
          </View>
          <View style={styles.playerMeta}>
            <Text style={styles.playerNameText}>{t("setupAi.colors.black", "Black Pieces")}</Text>
            <CapturedDots count={capturedByBlack} color="WHITE" />
          </View>
          {game.currentPlayer === "BLACK" && !game.result && (
            <View style={styles.toMoveContainer}>
              <Text style={styles.toMoveText}>{t("gameArena.status.yourMove")}</Text>
            </View>
          )}
        </View>

        {/* --- Board --- */}
        <View style={styles.boardWrapper}>
          <DraughtsBoard
            board={displayBoard}
            highlights={isViewingHistory ? {} : highlights}
            onSquarePress={game.selectSquare}
            onInvalidPress={() => game.selectSquare(-1)}
            lastMove={displayLastMove}
            disabled={isViewingHistory || !!game.result}
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
              t={t}
            />
          )}
        </View>

        {/* --- White / Human Row --- */}
        <View style={[styles.playerBar, styles.playerBarBottom]}>
          <View style={[styles.colorChip, styles.colorChipWhite]} />
          <View style={styles.playerMeta}>
            <Text style={styles.playerNameText}>{t("setupAi.colors.white", "White Pieces")}</Text>
            <CapturedDots count={capturedByWhite} color="BLACK" />
          </View>
          {game.currentPlayer === "WHITE" && !game.result && (
            <View style={styles.toMoveContainer}>
              <Text style={styles.toMoveText}>{t("gameArena.status.yourMove")}</Text>
            </View>
          )}
        </View>
      </View>

      {/* --- History Bar --- */}
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
            <Text style={styles.historyEmpty}>{t("vs-ai.waitingForFirstMove", "Ready for training…")}</Text>
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

      {/* --- Action Bar --- */}
      <View style={styles.actionBar}>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={handleSavePress}
          disabled={game.moveHistory.length === 0}
        >
          <BookmarkPlus
            color={game.moveHistory.length > 0 ? colors.primary : colors.textDisabled}
            size={22}
          />
          <Text style={[styles.actionBtnLabel, game.moveHistory.length > 0 && { color: colors.primary }]}>
            {t("freePlay.save.saveAction", "Save")}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} onPress={game.toggleFlip}>
          <RefreshCcw color={colors.foreground} size={22} />
          <Text style={[styles.actionBtnLabel, { color: colors.foreground }]}>{t("gameArena.actions.flip", "Flip")}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionBtn}
          onPress={game.undo}
          disabled={game.moveHistory.length === 0 || !!game.result}
        >
          <Undo2
            color={game.moveHistory.length > 0 && !game.result ? colors.foreground : colors.textDisabled}
            size={22}
          />
          <Text style={[styles.actionBtnLabel, game.moveHistory.length > 0 && !game.result && { color: colors.foreground }]}>
            {t("gameArena.actions.undo")}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} onPress={game.reset}>
          <RotateCcw color={game.moveHistory.length > 0 ? colors.foreground : colors.textDisabled} size={22} />
          <Text style={[styles.actionBtnLabel, game.moveHistory.length > 0 && { color: colors.foreground }]}>
            {t("gameArena.actions.reset")}
          </Text>
        </TouchableOpacity>
      </View>

      {/* --- Options Modal --- */}
      <OptionsModal
        visible={showOptionsModal}
        isMuted={audio.isMuted}
        onToggleMute={audio.toggleMute}
        onHome={() => { setShowOptionsModal(false); router.replace("/"); }}
        onStudies={() => { setShowOptionsModal(false); router.push("/game/studies"); }}
        onClose={() => setShowOptionsModal(false)}
        showStudies={hasSession}
      />

      {/* --- Login Required Modal --- */}
      <LoginRequiredModal
        visible={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onLogin={() => { setShowLoginModal(false); router.push("/(auth)/login"); }}
      />

      {/* --- Save Study Modal --- */}
      <SaveStudyModal
        visible={showSaveModal}
        isSaving={isSaving}
        onClose={() => setShowSaveModal(false)}
        onSave={handleSave}
      />

      {/* --- Save Success Modal --- */}
      <SaveFeedbackModal
        visible={showSuccessModal}
        type="success"
        onClose={() => setShowSuccessModal(false)}
        title={t("freePlay.save.successTitle", "Study Saved")}
        message={t("freePlay.save.successMessage", "Your study has been saved. Thank you for contributing!")}
      />

      {/* --- Save Error Modal --- */}
      <SaveFeedbackModal
        visible={showErrorModal}
        type="error"
        onClose={() => setShowErrorModal(false)}
        title={t("common.error", "Error")}
        message={t("freePlay.save.errorMessage", "Failed to save the study. Please try again.")}
      />

      {/* --- Result Modal --- */}
      {game.result && (
        <FreePlayResultModal
          visible={!!game.result}
          winner={game.result.winner}
          reason={game.result.reason}
          moveCount={game.moveCount}
          onReset={game.reset}
          onHome={() => router.replace("/")}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  gameArea: {
    flex: 1,
    justifyContent: "center",
  },
  loadingCenter: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16 },
  loadingText: { color: colors.textMuted, fontSize: 16 },

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
  botTitleRow: { flex: 1, alignItems: "center" },
  tierBadge: { fontSize: 9, fontWeight: "bold", letterSpacing: 1.5 },
  botNameText: { color: colors.foreground, fontSize: 15, fontWeight: "bold" },
  botEloText: { color: colors.textSubtle, fontSize: 11, fontWeight: "900" },

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

  toMoveContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginLeft: "auto",
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  toMoveText: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1,
    textTransform: "uppercase",
  },

  colorChip: { width: 22, height: 22, borderRadius: 11, borderWidth: 2 },
  colorChipWhite: { backgroundColor: colors.pieceWhite, borderColor: "#c8b49a" },

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

// --- Modal Styles ---
const modalStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
});

// --- Options Card Styles ---
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

// --- Save Feedback Modal Styles ---
const feedbackStyles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    width: Math.min(SCREEN_WIDTH - 64, 320),
    alignItems: "center",
    padding: 32,
    gap: 12,
  },
  iconWrap: {
    width: 72, height: 72, borderRadius: 36,
    borderWidth: 1.5,
    alignItems: "center", justifyContent: "center",
    marginBottom: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: 0.3,
    textAlign: "center",
  },
  message: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 4,
  },
  btn: {
    width: "100%",
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  btnText: {
    color: "#000",
    fontSize: 15,
    fontWeight: "bold",
  },
});

// --- Save / Login Modal Styles ---
const saveStyles = StyleSheet.create({
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
    width: 32, height: 32, borderRadius: 16,
    borderWidth: 1,
    alignItems: "center", justifyContent: "center",
  },
  headerTitle: { flex: 1, color: colors.foreground, fontSize: 15, fontWeight: "bold" },
  closeBtn: { padding: 4 },
  body: { padding: 18, gap: 4 },
  fieldLabel: {
    color: colors.textSubtle,
    fontSize: 11,
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  input: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: colors.foreground,
    fontSize: 14,
  },
  inputMultiline: {
    minHeight: 72,
    paddingTop: 10,
  },
  helpText: {
    color: colors.textDisabled,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 12,
    fontStyle: "italic",
  },
  loginMsg: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  footer: {
    flexDirection: "row",
    gap: 10,
    padding: 16,
    paddingTop: 8,
  },
  cancelBtn: {
    flex: 1, height: 46, borderRadius: 12,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1, borderColor: colors.border,
    alignItems: "center", justifyContent: "center",
  },
  cancelBtnText: { color: colors.foreground, fontSize: 14, fontWeight: "bold" },
  saveBtn: {
    flex: 1.4, height: 46, borderRadius: 12,
    backgroundColor: colors.primary,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
  },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnText: { color: "#000", fontSize: 14, fontWeight: "bold" },
});

// --- Result Modal Styles ---
const resultStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.88)",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  card: {
    width: Math.min(SCREEN_WIDTH - 32, 400),
    backgroundColor: colors.surface,
    borderRadius: 24,
    borderWidth: 1,
    overflow: "hidden",
  },
  topSection: {
    alignItems: "center",
    paddingVertical: 28,
    paddingHorizontal: 24,
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.02)",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  iconWrap: {
    width: 72, height: 72, borderRadius: 36,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1.5,
    marginBottom: 4,
  },
  title: {
    fontSize: 26, fontWeight: "900", letterSpacing: 0.5,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: "center",
  },
  statsRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  statCell: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 14,
    gap: 4,
  },
  statLabel: {
    color: colors.textDisabled,
    fontSize: 9,
    fontWeight: "bold",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  statValue: {
    color: colors.foreground,
    fontSize: 18,
    fontWeight: "900",
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    padding: 16,
  },
  btnSecondary: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  btnSecondaryText: { color: colors.foreground, fontSize: 14, fontWeight: "bold" },
  btnPrimary: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  btnPrimaryText: { color: "#000", fontSize: 14, fontWeight: "bold" },
});
