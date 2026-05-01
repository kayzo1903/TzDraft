import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
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
} from "lucide-react-native";
import { BoardState } from "@tzdraft/mkaguzi-engine";
import { colors } from "../../src/theme/colors";
import { DraughtsBoard } from "../../src/components/game/DraughtsBoard";
import { studyService, type SavedStudyDetail } from "../../src/services/study.service";
import type { FreeMoveRecord } from "../../src/hooks/useFreeGame";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function StudyReplayScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { id, name } = useLocalSearchParams<{ id: string; name: string }>();

  const [study, setStudy] = useState<SavedStudyDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Current position index (0 = start, study.fenHistory.length - 1 = last)
  const [posIndex, setPosIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const historyScrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (!id) return;
    studyService.getStudy(id)
      .then((data) => { setStudy(data); setPosIndex(0); })
      .catch(() => setError(t("studies.loadError", "Failed to load study.")))
      .finally(() => setIsLoading(false));
  }, [id, t]);

  // Auto-scroll history bar to active pill
  useEffect(() => {
    if (posIndex > 0) {
      historyScrollRef.current?.scrollToEnd({ animated: true });
    }
  }, [posIndex]);

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (error || !study) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error ?? t("studies.loadError", "Study not found.")}</Text>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <ArrowLeft color={colors.foreground} size={16} />
            <Text style={styles.backBtnText}>{t("common.back", "Back")}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const fenHistory = study.fenHistory as string[];
  const moveHistory = study.moveHistory as FreeMoveRecord[];
  const totalPositions = fenHistory.length; // includes start position
  const lastIndex = totalPositions - 1;

  const currentFen = fenHistory[posIndex] ?? fenHistory[0];
  const currentBoard = BoardState.fromFen(currentFen);
  const lastMove = posIndex > 0
    ? { from: moveHistory[posIndex - 1].from, to: moveHistory[posIndex - 1].to }
    : null;

  const goTo = (idx: number) => setPosIndex(Math.max(0, Math.min(lastIndex, idx)));

  return (
    <SafeAreaView style={styles.root}>
      {/* Top bar — fixed */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
          <ArrowLeft color={colors.foreground} size={20} />
        </TouchableOpacity>
        <View style={styles.titleBlock}>
          <Text style={styles.titleBadge}>{t("studies.replayBadge", "STUDY REPLAY")}</Text>
          <Text style={styles.title} numberOfLines={1}>{name ?? study.name}</Text>
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

      {/* Scrollable middle: board + move strip + description */}
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
              <View style={[styles.colorDot, { backgroundColor: moveHistory[posIndex - 1].player === "WHITE" ? colors.pieceWhite : colors.pieceBlack }]} />
              <Text style={styles.moveStripText}>
                {Math.ceil(posIndex / 2)}. {moveHistory[posIndex - 1].notation}
              </Text>
              <Text style={styles.moveStripSide}>
                {moveHistory[posIndex - 1].player === "WHITE"
                  ? t("setupAi.colors.white", "White")
                  : t("setupAi.colors.black", "Black")}
              </Text>
            </>
          )}
        </View>

        {/* Description card */}
        {(study.name || study.description) && (
          <View style={styles.descCard}>
            <Text style={styles.descName}>{study.name}</Text>
            {study.description ? (
              <Text style={styles.descBody}>{study.description}</Text>
            ) : (
              <Text style={styles.descEmpty}>{t("studies.noDescription", "No description provided.")}</Text>
            )}
            <View style={styles.descMeta}>
              <Text style={styles.descMetaText}>
                {study.moveCount} {t("studies.moves", "moves")}
                {"  ·  "}
                {new Date(study.createdAt).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* History bar — fixed */}
      <View style={styles.historyBar}>
        <TouchableOpacity
          style={[styles.histChevron, posIndex === 0 && styles.histChevronDisabled]}
          disabled={posIndex === 0}
          onPress={() => goTo(posIndex - 1)}
        >
          <ChevronLeft color={posIndex === 0 ? colors.textDisabled : colors.textMuted} size={20} strokeWidth={3} />
        </TouchableOpacity>

        <ScrollView
          ref={historyScrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.histContent}
          style={{ flex: 1 }}
        >
          {moveHistory.map((m, idx) => {
            const movePos = idx + 1;
            const isActive = posIndex === movePos;
            const isWhiteMove = idx % 2 === 0;
            const moveNum = Math.floor(idx / 2) + 1;
            return (
              <React.Fragment key={idx}>
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
          <ChevronRight color={posIndex === lastIndex ? colors.textDisabled : colors.textMuted} size={20} strokeWidth={3} />
        </TouchableOpacity>
      </View>

      {/* Navigation controls */}
      <View style={styles.navBar}>
        <TouchableOpacity style={styles.navBtn} onPress={() => goTo(0)} disabled={posIndex === 0}>
          <SkipBack color={posIndex === 0 ? colors.textDisabled : colors.foreground} size={22} />
          <Text style={[styles.navLabel, posIndex > 0 && { color: colors.foreground }]}>
            {t("studies.start", "Start")}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navBtn} onPress={() => goTo(posIndex - 1)} disabled={posIndex === 0}>
          <ChevronLeft color={posIndex === 0 ? colors.textDisabled : colors.foreground} size={26} strokeWidth={3} />
          <Text style={[styles.navLabel, posIndex > 0 && { color: colors.foreground }]}>
            {t("studies.prev", "Prev")}
          </Text>
        </TouchableOpacity>

        <View style={styles.posCounter}>
          <Text style={styles.posCounterText}>{posIndex}/{lastIndex}</Text>
        </View>

        <TouchableOpacity style={styles.navBtn} onPress={() => goTo(posIndex + 1)} disabled={posIndex === lastIndex}>
          <ChevronRight color={posIndex === lastIndex ? colors.textDisabled : colors.foreground} size={26} strokeWidth={3} />
          <Text style={[styles.navLabel, posIndex < lastIndex && { color: colors.foreground }]}>
            {t("studies.next", "Next")}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navBtn} onPress={() => goTo(lastIndex)} disabled={posIndex === lastIndex}>
          <SkipForward color={posIndex === lastIndex ? colors.textDisabled : colors.foreground} size={22} />
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
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16, padding: 24 },
  errorText: { color: colors.textMuted, fontSize: 14, textAlign: "center" },
  backBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
  },
  backBtnText: { color: colors.foreground, fontSize: 14, fontWeight: "bold" },

  topBar: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 12, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  iconBtn: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    alignItems: "center", justifyContent: "center",
  },
  titleBlock: { flex: 1, alignItems: "center" },
  titleBadge: { color: colors.primary, fontSize: 9, fontWeight: "bold", letterSpacing: 1.5 },
  title: { color: colors.foreground, fontSize: 15, fontWeight: "bold", maxWidth: SCREEN_WIDTH * 0.5 },
  titleSub: { color: colors.textSubtle, fontSize: 11, fontWeight: "900" },

  scrollContent: {
    paddingBottom: 16,
  },
  boardWrapper: {
    alignItems: "center", justifyContent: "center",
    paddingVertical: 6, paddingHorizontal: 8,
  },
  descCard: {
    marginHorizontal: 14,
    marginTop: 12,
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    gap: 8,
  },
  descName: {
    color: colors.foreground,
    fontSize: 16,
    fontWeight: "900",
  },
  descBody: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 22,
  },
  descEmpty: {
    color: colors.textDisabled,
    fontSize: 13,
    fontStyle: "italic",
  },
  descMeta: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 10,
    marginTop: 4,
  },
  descMetaText: {
    color: colors.textDisabled,
    fontSize: 11,
    fontWeight: "600",
  },

  moveStrip: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 16, paddingVertical: 8,
    borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surface + "88",
    minHeight: 36,
  },
  colorDot: { width: 10, height: 10, borderRadius: 5, borderWidth: 1, borderColor: colors.border },
  moveStripText: { color: colors.foreground, fontSize: 13, fontWeight: "bold", fontFamily: Platform.OS === "ios" ? "Courier" : "monospace" },
  moveStripSide: { color: colors.textDisabled, fontSize: 11, marginLeft: "auto" },

  historyBar: {
    height: 46, flexDirection: "row", alignItems: "center",
    borderBottomWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surface + "88",
  },
  histChevron: { width: 38, height: "100%", alignItems: "center", justifyContent: "center", paddingHorizontal: 6 },
  histChevronDisabled: { opacity: 0.3 },
  histContent: { flexDirection: "row", alignItems: "center", paddingHorizontal: 4, gap: 3 },
  histMoveNum: { color: colors.textDisabled, fontSize: 10, fontFamily: Platform.OS === "ios" ? "Courier" : "monospace", marginLeft: 3 },
  histPill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: "transparent" },
  histPillActive: { backgroundColor: colors.foreground },
  histPillText: { color: colors.textMuted, fontSize: 12, fontWeight: "600" },
  histPillTextActive: { color: colors.background, fontWeight: "bold" },

  navBar: {
    flexDirection: "row", alignItems: "center",
    borderTopWidth: 1, borderTopColor: colors.border,
    backgroundColor: colors.surface + "66",
    paddingBottom: Platform.OS === "ios" ? 4 : 0,
  },
  navBtn: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 10, gap: 3 },
  navLabel: { color: colors.textDisabled, fontSize: 9, fontWeight: "bold", textTransform: "uppercase", letterSpacing: 0.8 },
  posCounter: {
    width: 56, alignItems: "center", justifyContent: "center",
    borderLeftWidth: 1, borderRightWidth: 1, borderColor: colors.border,
    paddingVertical: 10,
  },
  posCounterText: { color: colors.primary, fontSize: 12, fontWeight: "900" },
});
