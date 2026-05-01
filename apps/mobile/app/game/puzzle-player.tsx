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
import { useGameAudio } from "../../src/hooks/useGameAudio";
import { DraughtsBoard, type HighlightType } from "../../src/components/game/DraughtsBoard";
import { BoardState, Piece, Position, PieceType, PlayerColor } from "@tzdraft/mkaguzi-engine";
import { LoadingScreen } from "../../src/components/ui/LoadingScreen";
import { useAuthStore } from "../../src/auth/auth-store";

// ── Types ──────────────────────────────────────────────────────────────────────

interface PieceSnapshot { type: "MAN" | "KING"; color: "WHITE" | "BLACK"; position: number; }
interface SolutionMove  { from: number; to: number; captures?: number[]; isOpp?: boolean; }
type SolveState = "idle" | "correct" | "incorrect";
type IntroPhase = "none" | "setup" | "reveal" | "ready";
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
  if (secs < 4) return "Haraka Sana! ⚡";
  if (secs <= 8) return "Umefaulu Vizuri!";
  return "Hongera!";
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
  const [introPhase,    setIntroPhase]    = useState<IntroPhase>("none");
  const [introHighlights, setIntroHighlights] = useState<Record<number, HighlightType>>({});
  const [playerMoveIndex, setPlayerMoveIndex] = useState(0);
  const [oppAnimating,  setOppAnimating]  = useState(false);
  const [oppHighlights, setOppHighlights] = useState<Record<number, HighlightType>>({});

  const isContinuous = continuous === "true";

  const audio = useGameAudio();

  const timerRef          = useRef<ReturnType<typeof setInterval> | null>(null);
  const countUpRef        = useRef<ReturnType<typeof setInterval> | null>(null);
  const ratingCountRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const introT1Ref        = useRef<ReturnType<typeof setTimeout> | null>(null);
  const introT2Ref        = useRef<ReturnType<typeof setTimeout> | null>(null);
  const oppT1Ref          = useRef<ReturnType<typeof setTimeout> | null>(null);
  const oppT2Ref          = useRef<ReturnType<typeof setTimeout> | null>(null);
  const collectedMovesRef = useRef<Array<{ from: number; to: number; captures: number[] }>>([]);
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

  // ── Timer — only runs once the intro animation completes ────────────────────
  useEffect(() => {
    const introReady = introPhase === "none" || introPhase === "ready";
    if (solveState === "idle" && introReady) {
      timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [solveState, introPhase]);

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

  const runIntro = (p: any) => {
    const setupMove = p.setupMove as SolutionMove | null;
    const setupPieces = p.setupPieces as PieceSnapshot[] | null;

    if (!setupMove || !setupPieces) {
      setIntroPhase("none");
      setPieces(p.pieces as PieceSnapshot[]);
      return;
    }

    // Clear any in-flight intro timeouts
    if (introT1Ref.current) clearTimeout(introT1Ref.current);
    if (introT2Ref.current) clearTimeout(introT2Ref.current);

    // Phase 1: show board before opponent's move, highlight the from-square
    setPieces(setupPieces);
    setIntroHighlights({ [setupMove.from]: "selected" });
    setIntroPhase("setup");

    // Phase 2 (500ms): apply opponent's move, highlight to-square + captured pieces
    introT1Ref.current = setTimeout(() => {
      setPieces(p.pieces as PieceSnapshot[]);
      const hl: Record<number, HighlightType> = { [setupMove.to]: "destination" };
      (setupMove.captures ?? []).forEach((sq) => { hl[sq] = "capturable"; });
      setIntroHighlights(hl);
      setIntroPhase("reveal");

      if ((setupMove.captures ?? []).length > 0) {
        audio.playCapture((setupMove.captures ?? []).length);
      } else {
        audio.playMove();
      }

      // Phase 3 (900ms): clear intro, hand control to player
      introT2Ref.current = setTimeout(() => {
        setIntroHighlights({});
        setIntroPhase("ready");
      }, 900);
    }, 500);
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
      alreadyAttemptedRef.current = p.alreadyAttempted ?? false;
      runIntro(p);
    }
    setPuzzleRating(rating);
    setDisplayRating(rating);
    setLoading(false);
  };

  const clearOppAnimation = () => {
    if (oppT1Ref.current) clearTimeout(oppT1Ref.current);
    if (oppT2Ref.current) clearTimeout(oppT2Ref.current);
    setOppAnimating(false);
    setOppHighlights({});
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
    setIntroPhase("none");
    setIntroHighlights({});
    setPlayerMoveIndex(0);
    clearOppAnimation();
    collectedMovesRef.current = [];
    submittingRef.current = false;
    failedOnceRef.current = false;
    if (ratingCountRef.current) clearInterval(ratingCountRef.current);
    if (introT1Ref.current) clearTimeout(introT1Ref.current);
    if (introT2Ref.current) clearTimeout(introT2Ref.current);
    stripAnim.setValue(-60);
    scaleAnim.setValue(1);
  };

  const resetPuzzle = () => {
    if (!puzzle) return;
    resetStateImmediate();
    runIntro(puzzle);
  };

  // Retry from the result modal — preserves failedOnceRef so hint is immediately available
  const retryPuzzle = () => {
    if (!puzzle) return;
    setSolveState("idle");
    setSelectedSq(null);
    setTargets([]);
    setElapsed(0);
    setFinalTime(0);
    setPoints(null);
    setDisplayPoints(0);
    setShowSolution(false);
    setIntroPhase("none");
    setIntroHighlights({});
    setPlayerMoveIndex(0);
    clearOppAnimation();
    collectedMovesRef.current = [];
    submittingRef.current = false;
    // intentionally keep failedOnceRef.current = true → hint button stays visible
    if (ratingCountRef.current) clearInterval(ratingCountRef.current);
    if (introT1Ref.current) clearTimeout(introT1Ref.current);
    if (introT2Ref.current) clearTimeout(introT2Ref.current);
    stripAnim.setValue(-60);
    scaleAnim.setValue(1);
    runIntro(puzzle);
  };

  // Animate the opponent's response move, then call onDone when board is ready
  const animateOppMove = (
    move: SolutionMove,
    currentPieces: PieceSnapshot[],
    onDone: (afterPieces: PieceSnapshot[]) => void,
  ) => {
    if (oppT1Ref.current) clearTimeout(oppT1Ref.current);
    if (oppT2Ref.current) clearTimeout(oppT2Ref.current);

    setOppHighlights({ [move.from]: "selected" });
    setOppAnimating(true);

    oppT1Ref.current = setTimeout(() => {
      const captured   = move.captures ?? [];
      const afterPieces = applyMoveToPieces(currentPieces, move.from, move.to, captured);
      setPieces(afterPieces);
      const hl: Record<number, HighlightType> = { [move.to]: "destination" };
      captured.forEach((sq) => { hl[sq] = "capturable"; });
      setOppHighlights(hl);
      if (captured.length > 0) audio.playCapture(captured.length);
      else audio.playMove();

      oppT2Ref.current = setTimeout(() => {
        setOppHighlights({});
        setOppAnimating(false);
        onDone(afterPieces);
      }, 700);
    }, 450);
  };

  const handleSquarePress = (pdn: number) => {
    if (solveState !== "idle" || submittingRef.current || !puzzle) return;
    if (introPhase === "setup" || introPhase === "reveal") return;
    if (oppAnimating) return;

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
      const captured    = findCaptured(pieces, selectedSq, pdn, sideToMove);
      const nextPieces  = applyMoveToPieces(pieces, selectedSq, pdn, captured);
      setPieces(nextPieces);
      setSelectedSq(null);
      setTargets([]);

      const sol         = (puzzle.solution as SolutionMove[]) ?? [];
      const playerMoves = sol.filter((m) => !m.isOpp);
      const expected    = playerMoves[playerMoveIndex];
      const correct     = !!expected && expected.from === selectedSq && expected.to === pdn;

      if (!correct) {
        setFinalTime(elapsed);
        const isRetry  = failedOnceRef.current;
        const noRating = isRetry || alreadyAttemptedRef.current;
        failedOnceRef.current = true;
        const earned = noRating ? 0 : computePoints(false, elapsed, puzzle.difficulty);
        setPoints(earned);
        setSolveState("incorrect");
        submittingRef.current = false;
        return;
      }

      // Collect the player's move for final submission
      collectedMovesRef.current.push({ from: selectedSq, to: pdn, captures: captured });
      const nextPlayerIdx = playerMoveIndex + 1;

      // Find the opponent response that follows this player move in the full solution array
      const expectedPos  = sol.indexOf(expected);
      const oppEntry     = sol[expectedPos + 1];
      const hasOppMove   = oppEntry?.isOpp === true;
      const hasMorePlayer = nextPlayerIdx < playerMoves.length;

      if (hasOppMove && hasMorePlayer) {
        // Animate opponent's response, then unlock for next player move
        setPlayerMoveIndex(nextPlayerIdx);
        animateOppMove(oppEntry, nextPieces, () => {
          submittingRef.current = false;
        });
        return;
      }

      // All player moves done → puzzle solved
      setFinalTime(elapsed);
      const isRetry  = failedOnceRef.current;
      const noRating = isRetry || alreadyAttemptedRef.current;
      const earned   = noRating ? 0 : computePoints(true, elapsed, puzzle.difficulty);
      setPoints(earned);
      setSolveState("correct");

      if (!noRating) {
        puzzleService
          .attempt(puzzle.id, collectedMovesRef.current, elapsed)
          .catch(() => {});
      }
      return;
    }

    setSelectedSq(null);
    setTargets([]);
  };

  if (loading) return <LoadingScreen />;
  if (!puzzle) return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace("/game/puzzles" as any)} style={styles.iconBtn}>
          <ArrowLeft color={colors.foreground} size={20} />
        </TouchableOpacity>
      </View>
      <View style={styles.errorWrap}>
        <Text style={styles.errorText}>Puzzle hii imeisha muda wake au haipatikani tena</Text>
        <TouchableOpacity onPress={() => router.replace("/game/puzzles" as any)} style={styles.retryBtn}>
          <Text style={styles.retryBtnText}>Angalia Puzzles</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );

  const boardState   = piecesToBoardState(pieces);
  const isInIntro    = introPhase === "setup" || introPhase === "reveal";

  const highlights: Record<number, HighlightType> = isInIntro
    ? introHighlights
    : oppAnimating
      ? oppHighlights
      : {};

  if (!isInIntro && !oppAnimating) {
    if (selectedSq !== null) highlights[selectedSq] = "selected";
    targets.forEach((t) => { highlights[t] = "destination"; });

    // Visual hint: Show green dots for the current player move in the solution
    if (showSolution && puzzle?.solution) {
      const sol         = (puzzle.solution as SolutionMove[]).filter((m) => !m.isOpp);
      const nextMove    = sol[playerMoveIndex];
      if (nextMove) {
        highlights[nextMove.from] = "hint";
        highlights[nextMove.to]   = "hint";
      }
    }
  }

  const isCorrect    = solveState === "correct";
  const isRetry      = failedOnceRef.current && solveState === "incorrect";
  const playerName   = user?.displayName ?? user?.username ?? "You";
  const avatarUrl    = user?.avatarUrl ?? user?.image;
  const opponentSide = puzzle.sideToMove === "WHITE" ? "Nyeusi" : "Nyeupe";

  // points sign for display
  const pointsSign   = points !== null && points > 0 ? "+" : points !== null && points < 0 ? "−" : "";

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace("/game/puzzles" as any)} style={styles.iconBtn}>
          <ArrowLeft color={colors.foreground} size={20} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Puzzle ya Mbinu</Text>
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

        {/* Intro / opponent-response banner */}
        {(isInIntro || oppAnimating) && (
          <View style={styles.introBanner}>
            <Text style={styles.introBannerText}>
              {isInIntro
                ? (introPhase === "setup" ? "Hii ilikuwa hatua ya mpinzani…" : "Zamu yako — tafuta hatua bora!")
                : "Mpinzani anajibu…"}
            </Text>
          </View>
        )}

        {/* Result Modal */}
        <Modal
          visible={solveState !== "idle" && points !== null}
          transparent
          animationType="fade"
          onRequestClose={() => {}}
        >
          <View style={modalStyles.backdrop}>
            <View style={[modalStyles.card, { borderColor: isCorrect ? colors.win + "44" : colors.danger + "44" }]}>

              {/* Header */}
              <View style={[modalStyles.header, { backgroundColor: isCorrect ? colors.win + "15" : colors.danger + "15" }]}>
                {isCorrect
                  ? <CheckCircle color={colors.win} size={52} strokeWidth={2.5} />
                  : <XCircle color={colors.danger} size={52} strokeWidth={2.5} />
                }
                <Text style={[modalStyles.title, { color: isCorrect ? colors.win : colors.danger }]}>
                  {isCorrect ? speedLabel(finalTime) : "Hatua Mbaya"}
                </Text>
                <Text style={modalStyles.subtitle}>
                  {isCorrect
                    ? `Umecheza kwa ${fmtTime(finalTime)}`
                    : isRetry
                      ? "Kujaribu tena — hakuna pointi"
                      : "Angalia nafasi na ujaribu tena"}
                </Text>
              </View>

              {/* Stats row */}
              <View style={modalStyles.statsRow}>
                <View style={modalStyles.stat}>
                  <Text style={modalStyles.statLabel}>POINTI</Text>
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
                  <Text style={modalStyles.statLabel}>KIWANGO CHA PUZZLE</Text>
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
                {/* Primary action — full width */}
                {isCorrect ? (
                  <TouchableOpacity
                    style={[modalStyles.btn, { backgroundColor: colors.win }]}
                    onPress={handleNext}
                  >
                    <ArrowRight color="#000" size={20} />
                    <Text style={[modalStyles.btnTextPrimary, { color: "#000" }]}>Puzzle Ijayo</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={[modalStyles.btn, { backgroundColor: colors.primary }]}
                    onPress={retryPuzzle}
                  >
                    <RotateCcw color="#fff" size={18} />
                    <Text style={[modalStyles.btnTextPrimary, { color: "#fff" }]}>Jaribu Tena</Text>
                  </TouchableOpacity>
                )}

                {/* Secondary row — Next Puzzle + Home */}
                <View style={modalStyles.secondaryRow}>
                  {isCorrect ? (
                    <TouchableOpacity
                      style={[modalStyles.btn, modalStyles.btnSecondary, { flex: 1 }]}
                      onPress={retryPuzzle}
                    >
                      <RotateCcw color={colors.textMuted} size={16} />
                      <Text style={modalStyles.btnTextSecondary}>Cheza Tena</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={[modalStyles.btn, modalStyles.btnSecondary, { flex: 1 }]}
                      onPress={handleNext}
                    >
                      <ArrowRight color={colors.textMuted} size={16} />
                      <Text style={modalStyles.btnTextSecondary}>Puzzle Ijayo</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={[modalStyles.btn, modalStyles.btnSecondary, { flex: 1 }]}
                    onPress={() => router.replace("/game/puzzles" as any)}
                  >
                    <ArrowLeft color={colors.textMuted} size={16} />
                    <Text style={modalStyles.btnTextSecondary}>Puzzles</Text>
                  </TouchableOpacity>
                </View>
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
            disabled={solveState !== "idle" || isInIntro || oppAnimating}
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
            <Text style={styles.playerSub}>{solveState !== "idle" ? "Pointi Zilizopatikana" : "Kiwango cha Puzzle"}</Text>
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
                  {pointsSign}{displayPoints}
                </Text>
              </>
            ) : (
              <Text style={styles.ratingBadgeText}>{displayRating}</Text>
            )}
          </View>
        </View>

        {/* Action row — prominent buttons right below player tag */}
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.inlineActionBtn} onPress={() => router.replace("/game/puzzles" as any)}>
            <ArrowLeft color={colors.textMuted} size={20} />
            <Text style={styles.inlineActionLabel}>Rudi</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.inlineActionBtn}
            onPress={solveState === "idle" ? resetPuzzle : retryPuzzle}
          >
            <RotateCcw color={colors.textMuted} size={20} />
            <Text style={styles.inlineActionLabel}>{solveState === "idle" ? "Upya" : "Jaribu"}</Text>
          </TouchableOpacity>

          {(solveState !== "idle" || failedOnceRef.current) && !isCorrect && puzzle?.solution && (puzzle.solution as any[]).length > 0 && (
            <TouchableOpacity
              style={styles.inlineActionBtn}
              onPress={() => setShowSolution((s) => !s)}
            >
              <Lightbulb color={showSolution ? colors.primary : colors.textMuted} size={20} />
              <Text style={[styles.inlineActionLabel, showSolution && { color: colors.primary }]}>
                Kidokezo
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.inlineActionBtn}
            onPress={handleNext}
          >
            <ArrowRight color={colors.textMuted} size={20} />
            <Text style={styles.inlineActionLabel}>Lijalo</Text>
          </TouchableOpacity>
        </View>

      </View>
    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: colors.background },

  // Intro animation banner
  introBanner: {
    marginHorizontal: 12, marginTop: 6, marginBottom: 2,
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 10, borderWidth: 1,
    borderColor: "rgba(249,115,22,0.3)",
    backgroundColor: "rgba(249,115,22,0.08)",
    alignItems: "center",
  },
  introBannerText: { color: "#f97316", fontSize: 12, fontWeight: "700", letterSpacing: 0.3 },

  errorWrap:  { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background, paddingHorizontal: 32, gap: 16 },
  errorText:  { color: colors.danger, fontSize: 16, textAlign: "center" },
  retryBtn:   { marginTop: 8, backgroundColor: colors.primary, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
  retryBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },

  // Header
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 8,
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
  body: { flex: 1, paddingHorizontal: 12 },

  // Board
  boardWrap: {
    alignItems: "center", justifyContent: "center",
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
    gap: 10,
  },
  secondaryRow: {
    flexDirection: "row",
    gap: 10,
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
