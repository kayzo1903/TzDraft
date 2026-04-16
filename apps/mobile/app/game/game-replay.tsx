import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Platform,
  Dimensions,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import { LoadingScreen } from "../../src/components/ui/LoadingScreen";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  SkipBack,
  SkipForward,
  RefreshCcw,
  Trophy,
  Minus,
  X as XIcon,
} from "lucide-react-native";
import { BoardState, Position } from "@tzdraft/mkaguzi-engine";
import { colors } from "../../src/theme/colors";
import { DraughtsBoard } from "../../src/components/game/DraughtsBoard";
import { historyService, GameReplayData, ReplayMove } from "../../src/lib/history-service";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// ── Board reconstruction ──────────────────────────────────────

function buildBoardHistory(moves: ReplayMove[]): BoardState[] {
  const boards: BoardState[] = [BoardState.createInitialBoard()];
  let current = boards[0];

  for (const m of moves) {
    // Remove captured pieces first
    for (const sq of m.capturedSquares) {
      current = current.removePiece(new Position(sq));
    }
    // Move piece (movePiece handles promotion automatically)
    current = current.movePiece(new Position(m.fromSquare), new Position(m.toSquare));
    boards.push(current);
  }

  return boards;
}

// ── Screen ────────────────────────────────────────────────────

export default function GameReplayScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { id, opponentName, result } = useLocalSearchParams<{
    id: string;
    opponentName: string;
    result: "WIN" | "LOSS" | "DRAW";
  }>();

  const [data, setData] = useState<GameReplayData | null>(null);
  const [boards, setBoards] = useState<BoardState[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [posIndex, setPosIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const historyScrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (!id) return;
    historyService
      .getReplay(id)
      .then((d) => {
        setData(d);
        setBoards(buildBoardHistory(d.moves));
        setPosIndex(0);
      })
      .catch(() => setError(t("history.replayError", "Failed to load replay.")))
      .finally(() => setIsLoading(false));
  }, [id, t]);

  useEffect(() => {
    if (posIndex > 0) {
      historyScrollRef.current?.scrollToEnd({ animated: true });
    }
  }, [posIndex]);

  if (isLoading) return <LoadingScreen />;

  if (error || !data) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error ?? t("history.replayError", "Replay not found.")}</Text>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <ArrowLeft color={colors.foreground} size={16} />
            <Text style={styles.backBtnText}>{t("common.back", "Back")}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const moves = data.moves;
  const lastIndex = boards.length - 1;
  const currentBoard = boards[posIndex] ?? boards[0];
  const lastMove =
    posIndex > 0
      ? { from: moves[posIndex - 1].fromSquare, to: moves[posIndex - 1].toSquare }
      : null;

  const goTo = (idx: number) => setPosIndex(Math.max(0, Math.min(lastIndex, idx)));

  const whiteDisplay = data.players.white?.displayName ?? "White";
  const blackDisplay = data.players.black?.displayName ?? "AI";
  const resultColor =
    result === "WIN" ? colors.win : result === "LOSS" ? colors.danger : colors.textSubtle;
  const ResultIcon = result === "WIN" ? Trophy : result === "LOSS" ? XIcon : Minus;

  return (
    <SafeAreaView style={styles.root}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
          <ArrowLeft color={colors.foreground} size={20} />
        </TouchableOpacity>
        <View style={styles.titleBlock}>
          <Text style={styles.titleBadge}>{t("history.replayBadge", "GAME REPLAY")}</Text>
          <Text style={styles.title} numberOfLines={1}>
            {whiteDisplay} vs {blackDisplay}
          </Text>
          <Text style={styles.titleSub}>
            {posIndex === 0
              ? t("studies.startPosition", "Start position")
              : `${t("studies.move", "Move")} ${posIndex} / ${lastIndex}`}
          </Text>
        </View>
        <TouchableOpacity style={styles.iconBtn} onPress={() => setFlipped((f) => !f)}>
          <RefreshCcw color={colors.textMuted} size={20} />
        </TouchableOpacity>
      </View>

      {/* Scrollable content */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Board */}
        <View style={styles.boardWrapper}>
          <DraughtsBoard
            board={currentBoard}
            highlights={{}}
            onSquarePress={() => {}}
            onInvalidPress={() => {}}
            lastMove={lastMove}
            disabled
            flipped={flipped}
          />
        </View>

        {/* Move info strip */}
        <View style={styles.moveStrip}>
          {posIndex === 0 ? (
            <Text style={styles.moveStripText}>{t("studies.startPosition", "Start position")}</Text>
          ) : (
            <>
              <View
                style={[
                  styles.colorDot,
                  {
                    backgroundColor:
                      moves[posIndex - 1].player === "WHITE" ? colors.pieceWhite : colors.pieceBlack,
                  },
                ]}
              />
              <Text style={styles.moveStripText}>
                {Math.ceil(posIndex / 2)}. {moves[posIndex - 1].notation}
              </Text>
              <Text style={styles.moveStripSide}>
                {moves[posIndex - 1].player === "WHITE"
                  ? t("setupAi.colors.white", "White")
                  : t("setupAi.colors.black", "Black")}
              </Text>
            </>
          )}
        </View>

        {/* Result card */}
        <View style={styles.resultCard}>
          <View style={styles.resultRow}>
            <ResultIcon size={18} color={resultColor} />
            <Text style={[styles.resultLabel, { color: resultColor }]}>
              {result === "WIN"
                ? t("history.won", "You Won")
                : result === "LOSS"
                ? t("history.lost", "You Lost")
                : t("history.draw", "Draw")}
            </Text>
          </View>
          <View style={styles.resultMeta}>
            <Text style={styles.resultMetaText}>
              {moves.length} {t("studies.moves", "moves")}
              {"  ·  "}
              {data.game.endReason
                ? data.game.endReason.replace(/_/g, " ").toLowerCase()
                : ""}
              {"  ·  "}
              {data.game.endedAt
                ? new Date(data.game.endedAt).toLocaleDateString(undefined, {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })
                : ""}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* History bar */}
      <View style={styles.historyBar}>
        <TouchableOpacity
          style={[styles.histChevron, posIndex === 0 && styles.histChevronDisabled]}
          disabled={posIndex === 0}
          onPress={() => goTo(posIndex - 1)}
        >
          <ChevronLeft
            color={posIndex === 0 ? colors.textDisabled : colors.textMuted}
            size={20}
            strokeWidth={3}
          />
        </TouchableOpacity>

        <ScrollView
          ref={historyScrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.histContent}
          style={{ flex: 1 }}
        >
          {moves.map((m, idx) => {
            const movePos = idx + 1;
            const isActive = posIndex === movePos;
            const isWhiteMove = idx % 2 === 0;
            const moveNum = Math.floor(idx / 2) + 1;
            return (
              <React.Fragment key={m.id}>
                {isWhiteMove && <Text style={styles.histMoveNum}>{moveNum}.</Text>}
                <TouchableOpacity
                  style={[styles.histPill, isActive && styles.histPillActive]}
                  onPress={() => goTo(movePos)}
                >
                  <Text style={[styles.histPillText, isActive && styles.histPillTextActive]}>
                    {m.notation}
                  </Text>
                </TouchableOpacity>
              </React.Fragment>
            );
          })}
        </ScrollView>

        <TouchableOpacity
          style={[styles.histChevron, posIndex === lastIndex && styles.histChevronDisabled]}
          disabled={posIndex === lastIndex}
          onPress={() => goTo(posIndex + 1)}
        >
          <ChevronRight
            color={posIndex === lastIndex ? colors.textDisabled : colors.textMuted}
            size={20}
            strokeWidth={3}
          />
        </TouchableOpacity>
      </View>

      {/* Nav controls */}
      <View style={styles.navBar}>
        <TouchableOpacity style={styles.navBtn} onPress={() => goTo(0)} disabled={posIndex === 0}>
          <SkipBack color={posIndex === 0 ? colors.textDisabled : colors.foreground} size={22} />
          <Text style={[styles.navLabel, posIndex > 0 && { color: colors.foreground }]}>
            {t("studies.start", "Start")}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navBtn} onPress={() => goTo(posIndex - 1)} disabled={posIndex === 0}>
          <ChevronLeft
            color={posIndex === 0 ? colors.textDisabled : colors.foreground}
            size={26}
            strokeWidth={3}
          />
          <Text style={[styles.navLabel, posIndex > 0 && { color: colors.foreground }]}>
            {t("studies.prev", "Prev")}
          </Text>
        </TouchableOpacity>

        <View style={styles.posCounter}>
          <Text style={styles.posCounterText}>
            {posIndex}/{lastIndex}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.navBtn}
          onPress={() => goTo(posIndex + 1)}
          disabled={posIndex === lastIndex}
        >
          <ChevronRight
            color={posIndex === lastIndex ? colors.textDisabled : colors.foreground}
            size={26}
            strokeWidth={3}
          />
          <Text style={[styles.navLabel, posIndex < lastIndex && { color: colors.foreground }]}>
            {t("studies.next", "Next")}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navBtn}
          onPress={() => goTo(lastIndex)}
          disabled={posIndex === lastIndex}
        >
          <SkipForward
            color={posIndex === lastIndex ? colors.textDisabled : colors.foreground}
            size={22}
          />
          <Text style={[styles.navLabel, posIndex < lastIndex && { color: colors.foreground }]}>
            {t("studies.end", "End")}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    padding: 24,
  },
  errorText: { color: colors.textMuted, fontSize: 14, textAlign: "center" },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  backBtnText: { color: colors.foreground, fontSize: 14, fontWeight: "bold" },

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  titleBlock: { flex: 1, alignItems: "center" },
  titleBadge: { color: colors.primary, fontSize: 9, fontWeight: "bold", letterSpacing: 1.5 },
  title: {
    color: colors.foreground,
    fontSize: 15,
    fontWeight: "bold",
    maxWidth: SCREEN_WIDTH * 0.5,
  },
  titleSub: { color: colors.textSubtle, fontSize: 11, fontWeight: "900" },

  scrollContent: { paddingBottom: 16 },
  boardWrapper: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    paddingHorizontal: 8,
  },

  moveStrip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface + "88",
    minHeight: 36,
  },
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: colors.border,
  },
  moveStripText: {
    color: colors.foreground,
    fontSize: 13,
    fontWeight: "bold",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  moveStripSide: { color: colors.textDisabled, fontSize: 11, marginLeft: "auto" },

  resultCard: {
    marginHorizontal: 14,
    marginTop: 12,
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    gap: 10,
  },
  resultRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  resultLabel: {
    fontSize: 16,
    fontWeight: "900",
  },
  resultMeta: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 10,
  },
  resultMetaText: {
    color: colors.textDisabled,
    fontSize: 11,
    fontWeight: "600",
    textTransform: "capitalize",
  },

  historyBar: {
    height: 46,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface + "88",
  },
  histChevron: {
    width: 38,
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  histChevronDisabled: { opacity: 0.3 },
  histContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 4,
    gap: 3,
  },
  histMoveNum: {
    color: colors.textDisabled,
    fontSize: 10,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    marginLeft: 3,
  },
  histPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: "transparent",
  },
  histPillActive: { backgroundColor: colors.foreground },
  histPillText: { color: colors.textMuted, fontSize: 12, fontWeight: "600" },
  histPillTextActive: { color: colors.background, fontWeight: "bold" },

  navBar: {
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface + "66",
    paddingBottom: Platform.OS === "ios" ? 4 : 0,
  },
  navBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    gap: 3,
  },
  navLabel: {
    color: colors.textDisabled,
    fontSize: 9,
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  posCounter: {
    width: 56,
    alignItems: "center",
    justifyContent: "center",
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.border,
    paddingVertical: 10,
  },
  posCounterText: { color: colors.primary, fontSize: 12, fontWeight: "900" },
});
