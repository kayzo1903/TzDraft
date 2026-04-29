import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated as RNAnimated,
  Modal,
} from "react-native";
import { Image as ExpoImage } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ArrowLeft,
  RotateCcw,
  CheckCircle,
  XCircle,
  TrendingUp,
  TrendingDown,
  Lightbulb,
  ArrowRight,
  User as UserIcon,
} from "lucide-react-native";
import { colors } from "../../src/theme/colors";
import { puzzleService } from "../../src/services/puzzle.service";
import { DraughtsBoard, type HighlightType } from "../../src/components/game/DraughtsBoard";
import { BoardState, Piece, Position, PieceType, PlayerColor } from "@tzdraft/mkaguzi-engine";
import { LoadingScreen } from "../../src/components/ui/LoadingScreen";
import { useAuthStore } from "../../src/auth/auth-store";

// ── Types ──────────────────────────────────────────────────────────────────────

interface PieceSnapshot { type: "MAN" | "KING"; color: "WHITE" | "BLACK"; position: number; }
interface SolutionMove  { from: number; to: number; captures?: number[]; }
type SolveState = "idle" | "correct" | "incorrect";
type DiagDir = "nw" | "ne" | "sw" | "se";

// ── PDN geometry ───────────────────────────────────────────────────────────────

const ALL_DIRS: DiagDir[] = ["nw", "ne", "sw", "se"];

function pdnAdjacent(sq: number): Record<DiagDir, number | null> {
  const group = Math.ceil(sq / 4);
  const pos   = (sq - 1) % 4;
  const odd   = group % 2 === 1;
  if (odd) return {
    nw: group > 1 ? sq - 4 : null,
    ne: group > 1 && pos < 3 ? sq - 3 : null,
    sw: group < 8 ? sq + 4 : null,
    se: group < 8 && pos < 3 ? sq + 5 : null,
  };
  return {
    nw: group > 1 && pos > 0 ? sq - 5 : null,
    ne: group > 1 ? sq - 4 : null,
    sw: group < 8 && pos > 0 ? sq + 3 : null,
    se: group < 8 ? sq + 4 : null,
  };
}

function pdnStep(sq: number, dir: DiagDir): number | null {
  return pdnAdjacent(sq)[dir];
}

function computeLegalMoves(pieces: PieceSnapshot[], side: "WHITE" | "BLACK"): Record<number, number[]> {
  const map    = new Map(pieces.map((p) => [p.position, p]));
  const opp    = side === "WHITE" ? "BLACK" : "WHITE";
  const manFwd: DiagDir[] = side === "WHITE" ? ["sw", "se"] : ["nw", "ne"];
  const mine   = pieces.filter((p) => p.color === side);

  const captureMap: Record<number, number[]> = {};
  let hasCaptures = false;

  for (const p of mine) {
    const dests: number[] = [];
    if (p.type === "MAN") {
      for (const dir of manFwd) {
        const over = pdnStep(p.position, dir);
        if (!over || map.get(over)?.color !== opp) continue;
        const land = pdnStep(over, dir);
        if (land && !map.has(land)) { dests.push(land); hasCaptures = true; }
      }
    } else {
      for (const dir of ALL_DIRS) {
        let cur = p.position, found = false;
        while (true) {
          const next = pdnStep(cur, dir);
          if (!next) break;
          const np = map.get(next);
          if (!found) {
            if (np) { if (np.color === side) break; found = true; }
          } else {
            if (np) break;
            dests.push(next); hasCaptures = true;
          }
          cur = next;
        }
      }
    }
    if (dests.length > 0) captureMap[p.position] = dests;
  }
  if (hasCaptures) return captureMap;

  const quietMap: Record<number, number[]> = {};
  for (const p of mine) {
    const dests: number[] = [];
    if (p.type === "MAN") {
      for (const dir of manFwd) {
        const t = pdnStep(p.position, dir);
        if (t && !map.has(t)) dests.push(t);
      }
    } else {
      for (const dir of ALL_DIRS) {
        let cur = p.position;
        while (true) {
          const next = pdnStep(cur, dir);
          if (!next || map.has(next)) break;
          dests.push(next); cur = next;
        }
      }
    }
    if (dests.length > 0) quietMap[p.position] = dests;
  }
  return quietMap;
}

function findCaptured(pieces: PieceSnapshot[], from: number, to: number, side: "WHITE" | "BLACK"): number[] {
  const map = new Map(pieces.map((p) => [p.position, p]));
  for (const dir of ALL_DIRS) {
    let cur = from, oppSq: number | null = null;
    while (true) {
      const next = pdnStep(cur, dir);
      if (!next) break;
      const p = map.get(next);
      if (p) {
        if (p.color === side) break;
        if (oppSq !== null) break;
        oppSq = next;
      } else if (oppSq !== null && next === to) return [oppSq];
      else if (oppSq === null && next === to) break;
      cur = next;
    }
  }
  return [];
}

function applyMoveToPieces(pieces: PieceSnapshot[], from: number, to: number, captured: number[]): PieceSnapshot[] {
  const side = pieces.find((p) => p.position === from)!.color;
  const promoted = (side === "WHITE" && to >= 29) || (side === "BLACK" && to <= 4);
  return pieces
    .filter((p) => !captured.includes(p.position))
    .map((p) => p.position === from
      ? { ...p, position: to, type: promoted && p.type === "MAN" ? "KING" as const : p.type }
      : p
    );
}

function piecesToBoardState(pieces: PieceSnapshot[]): BoardState {
  return new BoardState(
    pieces.map((pc) =>
      new Piece(
        pc.type === "KING" ? PieceType.KING : PieceType.MAN,
        pc.color === "WHITE" ? PlayerColor.WHITE : PlayerColor.BLACK,
        new Position(pc.position),
      )
    )
  );
}

function computePoints(correct: boolean, secs: number, difficulty: number): number {
  if (correct) return secs < 4 ? 4 : secs <= 8 ? 3 : 2;
  return -Math.max(10, 14 - difficulty);
}

function fmtTime(secs: number): string {
  return `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`;
}

function speedLabel(secs: number): string {
  if (secs < 4) return "Lightning Fast! ⚡";
  if (secs <= 8) return "Great Solve!";
  return "Well Done!";
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function PuzzlePlayerScreen() {
  const { id, continuous }  = useLocalSearchParams<{ id?: string, continuous?: string }>();
  const router  = useRouter();
  const { user } = useAuthStore();

  const [puzzle,        setPuzzle]        = useState<any | null>(null);
  const [pieces,        setPieces]        = useState<PieceSnapshot[]>([]);
  const [solveState,    setSolveState]    = useState<SolveState>("idle");
  const [selectedSq,    setSelectedSq]    = useState<number | null>(null);
  const [targets,       setTargets]       = useState<number[]>([]);
  const [elapsed,       setElapsed]       = useState(0);
  const [finalTime,     setFinalTime]     = useState(0);
  const [points,        setPoints]        = useState<number | null>(null);
  const [displayPoints, setDisplayPoints] = useState(0);
  const [puzzleRating,  setPuzzleRating]  = useState<number>(1000);
  const [displayRating, setDisplayRating] = useState<number>(1000);
  const [showSolution,  setShowSolution]  = useState(false);
  const [loading,       setLoading]       = useState(true);
  const [continuousQueue, setContinuousQueue] = useState<string[]>([]);
  
  const isContinuous = continuous === "true";

  const timerRef          = useRef<ReturnType<typeof setInterval> | null>(null);
  const countUpRef        = useRef<ReturnType<typeof setInterval> | null>(null);
  const ratingCountRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const failedOnceRef     = useRef(false);
  const submittingRef     = useRef(false);
  const alreadyAttemptedRef = useRef(false);

  // Badge scale pulse
  const scaleAnim = useRef(new RNAnimated.Value(1)).current;
  // Result strip slide-down from above board
  const stripAnim = useRef(new RNAnimated.Value(-60)).current;

  // ── Animated count-up when points arrive ────────────────────────────────────
  useEffect(() => {
    if (points === null) { setDisplayPoints(0); return; }
    if (countUpRef.current) clearInterval(countUpRef.current);

    const target  = Math.abs(points);
    const steps   = 18;
    const delay   = 500 / steps; // ~28ms per step → total 500ms
    let step = 0;
    setDisplayPoints(0);

    countUpRef.current = setInterval(() => {
      step++;
      setDisplayPoints(Math.round((step / steps) * target));
      if (step >= steps) {
        if (countUpRef.current) clearInterval(countUpRef.current);
        setDisplayPoints(target);
      }
    }, delay);

    // Pulse badge
    RNAnimated.sequence([
      RNAnimated.timing(scaleAnim, { toValue: 1.4, duration: 160, useNativeDriver: true }),
      RNAnimated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }),
    ]).start();

    return () => { if (countUpRef.current) clearInterval(countUpRef.current); };
  }, [points]);

  // ── Rating count-up/down — starts immediately when points are set ────────────
  useEffect(() => {
    if (points === null) return;
    if (ratingCountRef.current) clearInterval(ratingCountRef.current);

    const oldRating = puzzleRating;
    const newRating = puzzleRating + points;
    const steps     = 28;
    const duration  = 800;
    let step = 0;
    setDisplayRating(oldRating);

    ratingCountRef.current = setInterval(() => {
      step++;
      setDisplayRating(Math.round(oldRating + (step / steps) * (newRating - oldRating)));
      if (step >= steps) {
        if (ratingCountRef.current) clearInterval(ratingCountRef.current);
        setDisplayRating(newRating);
      }
    }, duration / steps);

    return () => { if (ratingCountRef.current) clearInterval(ratingCountRef.current); };
  }, [points]);

  // Slide result strip in when solveState changes
  useEffect(() => {
    if (solveState !== "idle") {
      stripAnim.setValue(-60);
      RNAnimated.spring(stripAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 70,
        friction: 10,
      }).start();
    }
  }, [solveState]);

  // ── Timer ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (solveState === "idle") {
      timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [solveState]);

  useEffect(() => {
    if (isContinuous) {
      startContinuousMode();
    } else if (id) {
      loadPuzzle(id);
    }
  }, [id, continuous]);

  const startContinuousMode = async () => {
    setLoading(true);
    const res = await puzzleService.listPaged({ limit: 50 });
    // Randomize to create a fresh puzzle rush experience
    const ids = res.data.map(p => p.id).sort(() => Math.random() - 0.5);
    if (ids.length > 0) {
      setContinuousQueue(ids.slice(1));
      await loadPuzzle(ids[0]);
    } else {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (isContinuous && continuousQueue.length > 0) {
      const nextId = continuousQueue[0];
      setContinuousQueue(q => q.slice(1));
      loadPuzzle(nextId);
    } else {
      router.push("/game/puzzles" as any);
    }
  };

  const loadPuzzle = async (puzzleId: string) => {
    setLoading(true);
    resetStateImmediate();
    const [p, rating] = await Promise.all([
      puzzleService.getById(puzzleId),
      puzzleService.getMyRating(),
    ]);
    if (p) {
      setPuzzle(p);
      setPieces(p.pieces as PieceSnapshot[]);
      alreadyAttemptedRef.current = p.alreadyAttempted ?? false;
    }
    setPuzzleRating(rating);
    setDisplayRating(rating);
    setLoading(false);
  };

  const resetStateImmediate = () => {
    setSolveState("idle");
    setSelectedSq(null);
    setTargets([]);
    setElapsed(0);
    setFinalTime(0);
    setPoints(null);
    setDisplayPoints(0);
    setShowSolution(false);
    submittingRef.current = false;
    failedOnceRef.current = false;
    if (ratingCountRef.current) clearInterval(ratingCountRef.current);
    stripAnim.setValue(-60);
    scaleAnim.setValue(1);
  };

  const resetPuzzle = () => {
    if (!puzzle) return;
    setPieces(puzzle.pieces as PieceSnapshot[]);
    resetStateImmediate();
  };

  const handleSquarePress = (pdn: number) => {
    if (solveState !== "idle" || submittingRef.current || !puzzle) return;

    const sideToMove = puzzle.sideToMove as "WHITE" | "BLACK";
    const legal      = computeLegalMoves(pieces, sideToMove);
    const piece      = pieces.find((p) => p.position === pdn);

    if (piece && piece.color === sideToMove && legal[pdn]) {
      setSelectedSq(pdn);
      setTargets(legal[pdn] ?? []);
      return;
    }

    if (selectedSq !== null && targets.includes(pdn)) {
      submittingRef.current = true;
      const captured   = findCaptured(pieces, selectedSq, pdn, sideToMove);
      const nextPieces = applyMoveToPieces(pieces, selectedSq, pdn, captured);

      setPieces(nextPieces);
      setSelectedSq(null);
      setTargets([]);
      setFinalTime(elapsed);

      const sol     = (puzzle.solution as SolutionMove[]) ?? [];
      const correct = sol.length > 0 && sol[0].from === selectedSq && sol[0].to === pdn;
      setSolveState(correct ? "correct" : "incorrect");

      const isRetry        = failedOnceRef.current;
      const noRating       = isRetry || alreadyAttemptedRef.current;
      if (!correct) failedOnceRef.current = true;

      const earned = noRating ? 0 : computePoints(correct, elapsed, puzzle.difficulty);
      setPoints(earned);

      if (!noRating) {
        puzzleService
          .attempt(puzzle.id, [{ from: selectedSq, to: pdn, captures: captured }], elapsed)
          .catch(() => {});
      }
      return;
    }

    setSelectedSq(null);
    setTargets([]);
  };

  if (loading) return <LoadingScreen />;
  if (!puzzle) return (
    <View style={styles.errorWrap}>
      <Text style={styles.errorText}>Puzzle not found</Text>
    </View>
  );

  const boardState   = piecesToBoardState(pieces);
  const highlights: Record<number, HighlightType> = {};
  if (selectedSq !== null) highlights[selectedSq] = "selected";
  targets.forEach((t) => { highlights[t] = "destination"; });

  // Visual hint: Show green dots for the next correct move
  if (showSolution && puzzle?.solution && (puzzle.solution as any[]).length > 0) {
    const nextMove = (puzzle.solution as SolutionMove[])[0];
    highlights[nextMove.from] = "hint";
    highlights[nextMove.to]   = "hint";
  }

  const isCorrect    = solveState === "correct";
  const isRetry      = failedOnceRef.current && solveState === "incorrect";
  const playerName   = user?.displayName ?? user?.username ?? "You";
  const avatarUrl    = user?.avatarUrl ?? user?.image;
  const opponentSide = puzzle.sideToMove === "WHITE" ? "Black" : "White";

  // points sign for display
  const pointsSign   = points !== null && points > 0 ? "+" : points !== null && points < 0 ? "−" : "";

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <ArrowLeft color={colors.foreground} size={20} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Tactical Puzzle</Text>
          <Text style={styles.puzzleId}>
            {(puzzle.theme as string).replace(/-/g, " ")}
            {"  "}{"★".repeat(puzzle.difficulty)}
          </Text>
        </View>
        <TouchableOpacity style={styles.iconBtn} onPress={resetPuzzle}>
          <RotateCcw color={colors.textMuted} size={18} />
        </TouchableOpacity>
      </View>

      {/* Body — no scroll, matches vs-ai layout */}
      <View style={styles.body}>

        {/* Opponent bar (top) */}
        <View style={styles.playerBar}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarEmoji}>
              {puzzle.sideToMove === "WHITE" ? "⚫" : "⚪"}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.playerName}>{opponentSide}</Text>
          </View>
          <Text style={styles.timerLabel}>
            {solveState === "idle" ? fmtTime(elapsed) : fmtTime(finalTime)}
          </Text>
        </View>

        {/* Result Modal — replaces inline strip */}
        <Modal
          visible={solveState !== "idle" && points !== null}
          transparent
          animationType="fade"
          onRequestClose={() => {}}
        >
          <View style={modalStyles.backdrop}>
            <View style={[modalStyles.card, { borderColor: isCorrect ? colors.win + "44" : colors.danger + "44" }]}>
              {/* Header with icon */}
              <View style={[modalStyles.header, { backgroundColor: isCorrect ? colors.win + "15" : colors.danger + "15" }]}>
                {isCorrect
                  ? <CheckCircle color={colors.win} size={48} strokeWidth={2.5} />
                  : <XCircle color={colors.danger} size={48} strokeWidth={2.5} />
                }
                <Text style={[modalStyles.title, { color: isCorrect ? colors.win : colors.danger }]}>
                  {isCorrect ? speedLabel(finalTime) : "Wrong Move"}
                </Text>
                <Text style={modalStyles.subtitle}>
                  {isCorrect
                    ? `Solved in ${fmtTime(finalTime)}`
                    : isRetry ? "Practice — no points" : "Study the line to improve"}
                </Text>
              </View>

              {/* Stats row */}
              <View style={modalStyles.statsRow}>
                <View style={modalStyles.stat}>
                  <Text style={modalStyles.statLabel}>POINTS</Text>
                  <View style={modalStyles.statValueRow}>
                    {isCorrect
                      ? <TrendingUp color={colors.win} size={16} />
                      : <TrendingDown color={colors.danger} size={16} />
                    }
                    <Text style={[modalStyles.statValue, { color: isCorrect ? colors.win : colors.danger }]}>
                      {pointsSign}{displayPoints}
                    </Text>
                  </View>
                </View>
                <View style={[modalStyles.stat, { borderLeftWidth: 1, borderLeftColor: colors.border }]}>
                  <Text style={modalStyles.statLabel}>PUZZLE RATING</Text>
                  <View style={modalStyles.statValueRow}>
                    {isCorrect
                      ? <TrendingUp color={colors.win} size={16} />
                      : <TrendingDown color={colors.danger} size={16} />
                    }
                    <Text style={[modalStyles.statValue, { color: isCorrect ? colors.win : colors.danger }]}>
                      {displayRating}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Actions */}
              <View style={modalStyles.actions}>
                <TouchableOpacity
                  style={[modalStyles.btn, modalStyles.btnSecondary]}
                  onPress={resetPuzzle}
                >
                  <RotateCcw color={colors.foreground} size={20} />
                  <Text style={modalStyles.btnTextSecondary}>{isCorrect ? "Review" : "Try Again"}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[modalStyles.btn, modalStyles.btnPrimary, { backgroundColor: isCorrect ? colors.win : colors.primary }]}
                  onPress={handleNext}
                >
                  <ArrowRight color={isCorrect ? "#000" : "#fff"} size={20} />
                  <Text style={[modalStyles.btnTextPrimary, { color: isCorrect ? "#000" : "#fff" }]}>Next Puzzle</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Board — fills remaining space */}
        <View style={styles.boardWrap}>
          <DraughtsBoard
            board={boardState}
            highlights={highlights}
            onSquarePress={handleSquarePress}
            disabled={solveState !== "idle"}
            flipped={puzzle.sideToMove === "BLACK"}
            noFrame={true}
          />
        </View>



        {/* Player bar — near board */}
        <View style={[styles.playerBar, styles.playerBarMe]}>
          <View style={styles.avatarCircle}>
            {avatarUrl ? (
              <ExpoImage
                source={avatarUrl}
                style={styles.avatarImg}
                contentFit="cover"
                transition={200}
              />
            ) : (
              <UserIcon color={colors.textDisabled} size={18} />
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.playerName}>{playerName}</Text>
            <Text style={styles.playerSub}>Puzzle Rating</Text>
          </View>
          <View style={[
            styles.ratingBadge,
            solveState !== "idle" && {
              borderColor: isCorrect ? "rgba(16,185,129,0.45)" : "rgba(239,68,68,0.45)",
              backgroundColor: isCorrect ? "rgba(16,185,129,0.08)" : "rgba(239,68,68,0.08)",
            },
          ]}>
            {solveState !== "idle" ? (
              <>
                {isCorrect
                  ? <TrendingUp color={colors.win} size={13} />
                  : <TrendingDown color={colors.danger} size={13} />
                }
                <Text style={[
                  styles.ratingBadgeText,
                  { color: isCorrect ? colors.win : colors.danger },
                ]}>
                  {displayRating}
                </Text>
              </>
            ) : (
              <Text style={styles.ratingBadgeText}>{displayRating}</Text>
            )}
          </View>
        </View>

        {/* Action row — prominent buttons right below player tag */}
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.inlineActionBtn} onPress={() => router.back()}>
            <ArrowLeft color={colors.textMuted} size={20} />
            <Text style={styles.inlineActionLabel}>Back</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.inlineActionBtn} onPress={resetPuzzle}>
            <RotateCcw color={colors.textMuted} size={20} />
            <Text style={styles.inlineActionLabel}>{solveState === "idle" ? "Reset" : "Retry"}</Text>
          </TouchableOpacity>

          {(solveState !== "idle" || failedOnceRef.current) && !isCorrect && puzzle?.solution && (puzzle.solution as any[]).length > 0 && (
            <TouchableOpacity
              style={styles.inlineActionBtn}
              onPress={() => setShowSolution((s) => !s)}
            >
              <Lightbulb color={showSolution ? colors.primary : colors.textMuted} size={20} />
              <Text style={[styles.inlineActionLabel, showSolution && { color: colors.primary }]}>
                Hint
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.inlineActionBtn}
            onPress={handleNext}
          >
            <ArrowRight color={colors.textMuted} size={20} />
            <Text style={styles.inlineActionLabel}>Next</Text>
          </TouchableOpacity>
        </View>

      </View>
    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: colors.background },
  errorWrap:  { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background },
  errorText:  { color: colors.danger, fontSize: 16 },

  // Header
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerCenter: { alignItems: "center", flex: 1 },
  headerTitle:  { color: colors.foreground, fontSize: 14, fontWeight: "900", textTransform: "uppercase", letterSpacing: 1 },
  puzzleId:     { color: colors.primary, fontSize: 10, fontWeight: "bold", textTransform: "uppercase", marginTop: 2, letterSpacing: 0.5 },
  iconBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    alignItems: "center", justifyContent: "center",
  },

  // Body
  body: { flex: 1, paddingHorizontal: 12, justifyContent: "center" },

  // Board
  boardWrap: {
    alignItems: "center", justifyContent: "center",
    paddingVertical: 10,
  },

  // Player bars
  playerBar: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  playerBarMe: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: 4,
  },
  avatarCircle: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border,
    alignItems: "center", justifyContent: "center", overflow: "hidden",
  },
  avatarImg:   { width: 36, height: 36, borderRadius: 18 },
  avatarEmoji: { fontSize: 18 },
  playerName:  { color: colors.foreground, fontSize: 13, fontWeight: "800" },
  playerSub:   { color: colors.textMuted, fontSize: 10, marginTop: 1 },
  timerLabel:  { color: colors.textMuted, fontSize: 13, fontFamily: "monospace" },
  ratingBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 10, borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  ratingBadgeText: { color: colors.foreground, fontSize: 14, fontWeight: "900" },

  // Action Row (Inline)
  actionRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 0,
    paddingVertical: 4,
  },
  inlineActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
  },
  inlineActionLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
});

// ── Modal Styles ──────────────────────────────────────────────────────────────

const modalStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    backgroundColor: colors.background,
    borderRadius: 24,
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 20,
  },
  header: {
    alignItems: "center",
    paddingVertical: 30,
    gap: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: "900",
    textAlign: "center",
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: "600",
  },
  statsRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  stat: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 18,
    gap: 4,
  },
  statLabel: {
    color: colors.textDisabled,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.5,
  },
  statValueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statValue: {
    color: colors.foreground,
    fontSize: 22,
    fontWeight: "800",
  },
  actions: {
    padding: 20,
    gap: 12,
  },
  btn: {
    height: 52,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  btnSecondary: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  btnPrimary: {
    // Background dynamic
  },
  btnTextSecondary: {
    color: colors.foreground,
    fontSize: 15,
    fontWeight: "bold",
  },
  btnTextPrimary: {
    fontSize: 15,
    fontWeight: "bold",
  },
});
