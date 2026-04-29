"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Link } from "@/i18n/routing";
import {
  CheckCircle,
  XCircle,
  RotateCcw,
  ArrowLeft,
  ArrowRight,
  Lightbulb,
  Clock,
  Trophy,
  UserPlus,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { useAuthStore } from "@/lib/auth/auth-store";
import {
  Board,
  type BoardState,
  type LastMoveState,
  type CaptureGhost,
} from "@/components/game/Board";
import { useTranslations } from "next-intl";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface PieceSnapshot {
  type: "MAN" | "KING";
  color: "WHITE" | "BLACK";
  position: number;
}

export interface SolutionMove {
  from: number;
  to: number;
  captures?: number[];
}

export interface PuzzleData {
  id: string;
  title: string | null;
  difficulty: number;
  theme: string | null;
  pieces: PieceSnapshot[];
  sideToMove: "WHITE" | "BLACK";
  solution: SolutionMove[];
  alreadyAttempted?: boolean;
  _count: { attempts: number };
}

export function difficultyStars(d: number) {
  return "★".repeat(d) + "☆".repeat(5 - d);
}

function themeColor(theme: string | null): string {
  const map: Record<string, string> = {
    sacrifice: "border-rose-400/30 bg-rose-400/10 text-rose-200",
    "position-trap": "border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
    "king-trap": "border-purple-400/30 bg-purple-400/10 text-purple-200",
    endgame: "border-amber-400/30 bg-amber-400/10 text-amber-200",
    promotion: "border-sky-400/30 bg-sky-400/10 text-sky-200",
  };
  return map[theme ?? ""] ?? "border-white/10 bg-white/5 text-neutral-300";
}

// ── PDN 1-32 Board Geometry ────────────────────────────────────────────────────

type DiagDir = "nw" | "ne" | "sw" | "se";
const ALL_DIRS: DiagDir[] = ["nw", "ne", "sw", "se"];

function pdnAdjacent(sq: number): Record<DiagDir, number | null> {
  const group = Math.ceil(sq / 4);
  const pos = (sq - 1) % 4;
  const isOdd = group % 2 === 1;
  if (isOdd) {
    return {
      nw: group > 1 ? sq - 4 : null,
      ne: group > 1 && pos < 3 ? sq - 3 : null,
      sw: group < 8 ? sq + 4 : null,
      se: group < 8 && pos < 3 ? sq + 5 : null,
    };
  }
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

function pdnToGrid(sq: number, flip = false): number {
  const idx = sq - 1;
  const row = Math.floor(idx / 4);
  const posInRow = idx % 4;
  const col = row % 2 === 0 ? posInRow * 2 + 1 : posInRow * 2;
  if (!flip) return row * 8 + col;
  return (7 - row) * 8 + (7 - col);
}

function gridToPdn(gridIdx: number, flip = false): number {
  const row = Math.floor(gridIdx / 8);
  const col = gridIdx % 8;
  const r = flip ? 7 - row : row;
  const c = flip ? 7 - col : col;
  const posInRow = r % 2 === 0 ? (c - 1) / 2 : c / 2;
  return r * 4 + posInRow + 1;
}

function toBoard(pieces: PieceSnapshot[], flip: boolean): BoardState {
  return Object.fromEntries(
    pieces.map((p) => [
      pdnToGrid(p.position, flip),
      { color: p.color, isKing: p.type === "KING" },
    ])
  );
}

function pdnMovesToGrid(
  moves: Record<number, number[]>,
  flip: boolean
): Record<number, number[]> {
  return Object.fromEntries(
    Object.entries(moves).map(([sq, dests]) => [
      pdnToGrid(Number(sq), flip),
      dests.map((d) => pdnToGrid(d, flip)),
    ])
  );
}

// ── Legal move computation ─────────────────────────────────────────────────────

function computeLegalMoves(
  pieces: PieceSnapshot[],
  side: "WHITE" | "BLACK"
): Record<number, number[]> {
  const map = new Map(pieces.map((p) => [p.position, p]));
  const opp = side === "WHITE" ? "BLACK" : "WHITE";
  const manFwd: DiagDir[] = side === "WHITE" ? ["sw", "se"] : ["nw", "ne"];
  const mine = pieces.filter((p) => p.color === side);

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
          dests.push(next);
          cur = next;
        }
      }
    }
    if (dests.length > 0) quietMap[p.position] = dests;
  }
  return quietMap;
}

function findCaptured(
  pieces: PieceSnapshot[],
  from: number,
  to: number,
  side: "WHITE" | "BLACK"
): number[] {
  const map = new Map(pieces.map((p) => [p.position, p]));
  for (const dir of ALL_DIRS) {
    let cur = from;
    let oppSq: number | null = null;
    while (true) {
      const next = pdnStep(cur, dir);
      if (!next) break;
      const p = map.get(next);
      if (p) {
        if (p.color === side) break;
        if (oppSq !== null) break;
        oppSq = next;
      } else if (oppSq !== null && next === to) {
        return [oppSq];
      } else if (oppSq === null && next === to) {
        break;
      }
      cur = next;
    }
  }
  return [];
}

function applyMove(
  pieces: PieceSnapshot[],
  from: number,
  to: number,
  captured: number[]
): PieceSnapshot[] {
  const side = pieces.find((p) => p.position === from)!.color;
  const promoted = (side === "WHITE" && to >= 29) || (side === "BLACK" && to <= 4);
  return pieces
    .filter((p) => !captured.includes(p.position))
    .map((p) =>
      p.position === from
        ? { ...p, position: to, type: promoted && p.type === "MAN" ? "KING" : p.type }
        : p
    );
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmt(secs: number) {
  return `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`;
}

function computePoints(correct: boolean, timeSecs: number, difficulty: number): number {
  if (correct) return timeSecs < 4 ? 4 : timeSecs <= 8 ? 3 : 2;
  return -Math.max(10, 14 - difficulty);
}

function speedLabel(secs: number): string {
  if (secs < 4) return "Lightning Fast! ⚡";
  if (secs <= 8) return "Great Solve!";
  return "Well Done!";
}

// ── Component ──────────────────────────────────────────────────────────────────

type SolveState = "idle" | "correct" | "incorrect";
let _ghostId = 0;

export function PuzzleClient({
  puzzle,
  locale: _locale,
}: {
  puzzle: PuzzleData;
  locale: string;
}) {
  const t = useTranslations("puzzles.solve");
  const themeT = useTranslations("puzzles.themes");
  const hintT = useTranslations("puzzles.hints");

  const themeKey =
    puzzle.theme &&
    ["tactical", "sacrifice", "position-trap", "king-trap", "endgame", "promotion"].includes(puzzle.theme)
      ? puzzle.theme
      : "tactical";
  const safeThemeKey = themeKey.replace(/-([a-z])/g, (_g, c) => c.toUpperCase());

  const [pieces, setPieces]               = useState<PieceSnapshot[]>(puzzle.pieces);
  const [solveState, setSolveState]       = useState<SolveState>("idle");
  const [showHint, setShowHint]           = useState(false);
  const [lastMove, setLastMove]           = useState<LastMoveState>(null);
  const [ghosts, setGhosts]               = useState<CaptureGhost[]>([]);
  const [solution, setSolution]           = useState<SolutionMove[] | null>(null);
  const [elapsed, setElapsed]             = useState(0);
  const [finalTime, setFinalTime]         = useState(0);
  const [points, setPoints]               = useState<number | null>(null);
  const [displayPoints, setDisplayPoints] = useState(0);
  const [puzzleRating, setPuzzleRating]   = useState(1000);
  const [displayRating, setDisplayRating] = useState(1000);
  const [showModal, setShowModal]         = useState(false);

  const { isAuthenticated, user } = useAuthStore();
  const submittingRef       = useRef(false);
  const failedOnceRef       = useRef(false);
  const alreadyAttemptedRef = useRef(puzzle.alreadyAttempted ?? false);
  const countUpRef          = useRef<ReturnType<typeof setInterval> | null>(null);
  const ratingCountRef      = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch puzzle rating + authoritative alreadyAttempted on mount (auth-gated)
  useEffect(() => {
    if (!isAuthenticated) return;
    Promise.all([
      fetch(`${API_URL}/puzzles/my-rating`, { credentials: "include" })
        .then((r) => r.json())
        .catch(() => ({ puzzleRating: 1000 })),
      fetch(`${API_URL}/puzzles/${puzzle.id}`, { credentials: "include" })
        .then((r) => r.json())
        .catch(() => ({})),
    ]).then(([ratingData, puzzleData]) => {
      const rating = ratingData.puzzleRating ?? 1000;
      setPuzzleRating(rating);
      setDisplayRating(rating);
      alreadyAttemptedRef.current = puzzleData.alreadyAttempted ?? false;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, puzzle.id]);

  // Timer — stops when puzzle is solved/failed
  useEffect(() => {
    if (solveState !== "idle") return;
    const id = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [solveState]);

  // Points count-up animation
  useEffect(() => {
    if (points === null) { setDisplayPoints(0); return; }
    if (countUpRef.current) clearInterval(countUpRef.current);
    const target = Math.abs(points);
    const steps = 18;
    let step = 0;
    setDisplayPoints(0);
    countUpRef.current = setInterval(() => {
      step++;
      setDisplayPoints(Math.round((step / steps) * target));
      if (step >= steps) {
        clearInterval(countUpRef.current!);
        setDisplayPoints(target);
      }
    }, 500 / steps);
    return () => { if (countUpRef.current) clearInterval(countUpRef.current); };
  }, [points]);

  // Rating count-up/down animation — starts the instant points are set
  useEffect(() => {
    if (points === null) return;
    if (ratingCountRef.current) clearInterval(ratingCountRef.current);
    const oldRating = puzzleRating;
    const newRating = puzzleRating + points;
    const steps = 28;
    let step = 0;
    setDisplayRating(oldRating);
    ratingCountRef.current = setInterval(() => {
      step++;
      setDisplayRating(Math.round(oldRating + (step / steps) * (newRating - oldRating)));
      if (step >= steps) {
        clearInterval(ratingCountRef.current!);
        setDisplayRating(newRating);
      }
    }, 800 / steps);
    return () => { if (ratingCountRef.current) clearInterval(ratingCountRef.current); };
  // puzzleRating intentionally excluded — we snapshot it when points arrive
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points]);

  // Show modal shortly after result
  useEffect(() => {
    if (solveState === "idle" || points === null) return;
    const id = setTimeout(() => setShowModal(true), 350);
    return () => clearTimeout(id);
  }, [solveState, points]);

  const reset = useCallback(() => {
    setPieces(puzzle.pieces);
    setSolveState("idle");
    setSolution(null);
    setShowHint(false);
    setLastMove(null);
    setGhosts([]);
    setElapsed(0);
    setFinalTime(0);
    setPoints(null);
    setDisplayPoints(0);
    setShowModal(false);
    submittingRef.current = false;
    failedOnceRef.current = false;
    // alreadyAttemptedRef intentionally NOT reset — one rating event per puzzle per user
  }, [puzzle]);

  // Board calls onMove with grid indices — convert to PDN internally
  function handleMove(gridFrom: number, gridTo: number) {
    if (solveState !== "idle" || submittingRef.current) return;
    submittingRef.current = true;

    const from = gridToPdn(gridFrom, flip);
    const to   = gridToPdn(gridTo, flip);
    const captured = findCaptured(pieces, from, to, puzzle.sideToMove);

    if (captured.length > 0) {
      const newGhosts: CaptureGhost[] = captured.map((sq) => {
        const p = pieces.find((x) => x.position === sq)!;
        return {
          id: _ghostId++,
          index: pdnToGrid(sq, flip),
          piece: { color: p.color, isKing: p.type === "KING" },
        };
      });
      setGhosts(newGhosts);
      setTimeout(() => setGhosts([]), 350);
    }

    const nextPieces = applyMove(pieces, from, to, captured);
    setPieces(nextPieces);
    setLastMove({ from: gridFrom, to: gridTo });
    setFinalTime(elapsed);

    const sol     = puzzle.solution ?? [];
    const correct = sol.length > 0 && sol[0].from === from && sol[0].to === to;
    setSolveState(correct ? "correct" : "incorrect");
    setSolution(sol);

    const isRetry  = failedOnceRef.current;
    const noRating = isRetry || alreadyAttemptedRef.current;
    if (!correct) failedOnceRef.current = true;

    const earned = noRating ? 0 : computePoints(correct, elapsed, puzzle.difficulty);
    setPoints(earned);

    if (!noRating) {
      // Lock out future rating for this session immediately
      alreadyAttemptedRef.current = true;
      fetch(`${API_URL}/puzzles/${puzzle.id}/attempt`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          moves: [{ from, to, captures: captured }],
          timeTaken: elapsed,
        }),
      }).catch(() => {});
    }
  }

  // Derived display values
  const flip         = puzzle.sideToMove === "WHITE";
  const board        = toBoard(pieces, flip);
  const pdnLegal     = solveState === "idle" ? computeLegalMoves(pieces, puzzle.sideToMove) : {};
  const gridLegal    = pdnMovesToGrid(pdnLegal, flip);
  const hasMandatory = Object.keys(pdnLegal).length > 0 &&
    Object.entries(pdnLegal).some(([sqStr, dests]) =>
      dests.some((to) => findCaptured(pieces, Number(sqStr), to, puzzle.sideToMove).length > 0)
    );
  const forcedPieces = hasMandatory
    ? Object.keys(pdnLegal).map((sq) => pdnToGrid(Number(sq), flip))
    : [];
  const sol0         = puzzle.solution?.[0];
  const hintSquares  = showHint && sol0
    ? { from: pdnToGrid(sol0.from, flip), to: pdnToGrid(sol0.to, flip) }
    : null;

  const isCorrect    = solveState === "correct";
  const pointsSign   = points !== null && points > 0 ? "+" : points !== null && points < 0 ? "−" : "";
  const opponentSide = puzzle.sideToMove === "WHITE" ? "Black" : "White";
  const playerName   = user?.displayName ?? user?.username ?? "You";
  const avatarUrl    = user?.avatarUrl;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <main className="h-[100svh] overflow-hidden overscroll-none flex flex-col bg-background">

      {/* ── Result Modal (shared mobile + desktop) ──────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-6">
          <div className={`w-full max-w-sm bg-neutral-900 rounded-3xl border overflow-hidden shadow-2xl ${
            isCorrect ? "border-emerald-500/40" : "border-red-500/40"
          }`}>
            <div className={`flex flex-col items-center gap-3 py-8 px-6 ${isCorrect ? "bg-emerald-500/10" : "bg-red-500/10"}`}>
              {isCorrect
                ? <CheckCircle className="w-14 h-14 text-emerald-400" strokeWidth={2.5} />
                : <XCircle    className="w-14 h-14 text-red-400"     strokeWidth={2.5} />
              }
              <p className={`text-3xl font-black text-center ${isCorrect ? "text-emerald-300" : "text-red-300"}`}>
                {isCorrect ? speedLabel(finalTime) : "Wrong Move"}
              </p>
              <p className="text-sm text-neutral-400">
                {isCorrect
                  ? `Solved in ${fmt(finalTime)}`
                  : failedOnceRef.current && points === 0 ? "Practice — no points" : "Study the line to improve"}
              </p>
            </div>
            <div className="flex border-t border-b border-neutral-700/60">
              <div className="flex-1 flex flex-col items-center gap-1.5 py-5">
                <span className="text-[10px] font-black tracking-widest text-neutral-500 uppercase">Points</span>
                <div className="flex items-center gap-1.5">
                  {isCorrect ? <TrendingUp className="w-4 h-4 text-emerald-400" /> : <TrendingDown className="w-4 h-4 text-red-400" />}
                  <span className={`text-2xl font-black tabular-nums ${isCorrect ? "text-emerald-300" : "text-red-300"}`}>
                    {pointsSign}{displayPoints}
                  </span>
                </div>
              </div>
              <div className="flex-1 flex flex-col items-center gap-1.5 py-5 border-l border-neutral-700/60">
                <span className="text-[10px] font-black tracking-widest text-neutral-500 uppercase">Puzzle Rating</span>
                <div className="flex items-center gap-1.5">
                  {isCorrect ? <TrendingUp className="w-4 h-4 text-emerald-400" /> : <TrendingDown className="w-4 h-4 text-red-400" />}
                  <span className={`text-2xl font-black tabular-nums ${isCorrect ? "text-emerald-300" : "text-red-300"}`}>
                    {displayRating}
                  </span>
                </div>
              </div>
            </div>
            {!isAuthenticated && (
              <div className="mx-5 mt-5 rounded-2xl border border-orange-400/20 bg-orange-400/5 p-3 flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-400/10 text-orange-400">
                  <Trophy size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-white leading-tight">{t("guestCta.title")}</p>
                  <Link href="/auth/register" className="mt-1 inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-wider text-orange-400 hover:text-orange-300">
                    <UserPlus size={11} />{t("guestCta.button")}
                  </Link>
                </div>
              </div>
            )}
            <div className="p-5 flex flex-col gap-3">
              <button
                onClick={() => { setShowModal(false); reset(); }}
                className="w-full h-12 rounded-2xl border border-neutral-700 bg-neutral-800 flex items-center justify-center gap-2 font-bold text-white hover:bg-neutral-700 transition-colors"
              >
                <RotateCcw className="w-5 h-5" />
                {isCorrect ? "Review" : "Try Again"}
              </button>
              <Link
                href="/puzzles"
                className={`w-full h-12 rounded-2xl flex items-center justify-center gap-2 font-bold transition-colors ${
                  isCorrect ? "bg-emerald-500 hover:bg-emerald-400 text-black" : "bg-[var(--primary)] hover:opacity-90 text-white"
                }`}
              >
                <ArrowRight className="w-5 h-5" />
                Next Puzzle
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          MOBILE LAYOUT  (< md) — mirrors apps/mobile/puzzle-player exactly
          ══════════════════════════════════════════════════════════════════ */}
      <div className="flex flex-col flex-1 md:hidden overflow-hidden">

        {/* Header: back icon | title + theme + stars | reset icon */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-neutral-800">
          <Link
            href="/puzzles"
            className="w-10 h-10 rounded-xl bg-neutral-800 border border-neutral-700 flex items-center justify-center shrink-0"
          >
            <ArrowLeft className="w-5 h-5 text-neutral-300" />
          </Link>
          <div className="flex flex-col items-center gap-0.5 flex-1 px-2">
            <span className="text-[11px] font-black uppercase tracking-widest text-white">Tactical Puzzle</span>
            <span className="text-[10px] font-bold text-[var(--primary)] uppercase tracking-wider">
              {(puzzle.theme ?? "tactical").replace(/-/g, " ")}
              {"  "}{"★".repeat(puzzle.difficulty)}
            </span>
          </div>
          <button
            onClick={reset}
            className="w-10 h-10 rounded-xl bg-neutral-800 border border-neutral-700 flex items-center justify-center shrink-0"
          >
            <RotateCcw className="w-4.5 h-4.5 text-neutral-400" />
          </button>
        </div>

        {/* Body: opponent bar → board → player bar → action row */}
        <div className="flex flex-col flex-1 px-3 py-2 gap-2 overflow-hidden">

          {/* Opponent bar */}
          <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-neutral-700/50 bg-neutral-900/40">
            <div className="w-9 h-9 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center text-base shrink-0">
              {puzzle.sideToMove === "WHITE" ? "⚫" : "⚪"}
            </div>
            <div className="flex-1">
              <p className="text-[13px] font-extrabold text-white leading-none">{opponentSide}</p>
            </div>
            <span className="font-mono text-[13px] text-neutral-400">
              {solveState === "idle" ? fmt(elapsed) : fmt(finalTime)}
            </span>
          </div>

          {/* Board — flex-1 so it fills remaining space */}
          <div className="flex-1 flex items-center justify-center min-h-0">
            <Board
              pieces={board}
              onMove={handleMove}
              readOnly={solveState !== "idle"}
              legalMoves={gridLegal}
              forcedPieces={forcedPieces}
              lastMove={lastMove}
              capturedGhosts={ghosts}
              flipped={flip}
              hintSquares={hintSquares}
            />
          </div>

          {/* Player bar */}
          <div className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border transition-colors duration-300 ${
            solveState !== "idle"
              ? isCorrect ? "border-emerald-500/30 bg-emerald-500/5" : "border-red-500/30 bg-red-500/5"
              : "border-neutral-700/50 bg-neutral-900/40"
          }`}>
            {/* Avatar */}
            <div className="w-9 h-9 rounded-full border border-neutral-700 bg-neutral-800 flex items-center justify-center overflow-hidden shrink-0">
              {avatarUrl
                ? <img src={avatarUrl} alt={playerName} className="w-full h-full object-cover" />
                : <UserPlus className="w-4 h-4 text-neutral-500" />
              }
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-extrabold text-white leading-none truncate">{playerName}</p>
              <p className="text-[10px] text-neutral-500 mt-0.5">Puzzle Rating</p>
            </div>
            {/* Rating badge */}
            <div className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl border font-mono font-black text-sm transition-all duration-300 ${
              solveState !== "idle"
                ? isCorrect ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300" : "bg-red-500/10 border-red-500/30 text-red-300"
                : "bg-neutral-900 border-neutral-700 text-white"
            }`}>
              {solveState !== "idle" && (
                isCorrect ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />
              )}
              <span className="tabular-nums">{displayRating}</span>
            </div>
          </div>

          {/* Action row */}
          <div className="flex items-center border-t border-neutral-800 pt-1 pb-safe">
            <Link
              href="/puzzles"
              className="flex-1 flex flex-col items-center gap-1 py-2.5"
            >
              <ArrowLeft className="w-5 h-5 text-neutral-500" />
              <span className="text-[9px] font-bold uppercase tracking-wider text-neutral-500">Back</span>
            </Link>

            <button onClick={reset} className="flex-1 flex flex-col items-center gap-1 py-2.5">
              <RotateCcw className="w-5 h-5 text-neutral-500" />
              <span className="text-[9px] font-bold uppercase tracking-wider text-neutral-500">
                {solveState === "idle" ? "Reset" : "Retry"}
              </span>
            </button>

            <button
              onClick={() => setShowHint((s) => !s)}
              disabled={solveState !== "idle" && !showHint}
              className="flex-1 flex flex-col items-center gap-1 py-2.5 disabled:opacity-40"
            >
              <Lightbulb className={`w-5 h-5 ${showHint ? "text-[var(--primary)]" : "text-neutral-500"}`} />
              <span className={`text-[9px] font-bold uppercase tracking-wider ${showHint ? "text-[var(--primary)]" : "text-neutral-500"}`}>
                Hint
              </span>
            </button>

            <Link href="/puzzles" className="flex-1 flex flex-col items-center gap-1 py-2.5">
              <ArrowRight className={`w-5 h-5 ${solveState === "correct" ? "text-emerald-400" : "text-neutral-500"}`} />
              <span className={`text-[9px] font-bold uppercase tracking-wider ${solveState === "correct" ? "text-emerald-400" : "text-neutral-500"}`}>
                Next
              </span>
            </Link>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          DESKTOP LAYOUT  (≥ md) — sidebar panel + board column
          ══════════════════════════════════════════════════════════════════ */}
      <div className="hidden md:flex flex-row gap-6 flex-1 w-full max-w-5xl mx-auto px-4 py-4 items-start justify-center">

        {/* Board column */}
        <div className="flex-1 max-w-[560px] flex flex-col gap-3">
          {/* Opponent bar */}
          <div className="rounded-xl border border-neutral-700/50 bg-neutral-900/40 px-3 py-2 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-neutral-700 border border-neutral-600 flex items-center justify-center text-sm shrink-0">
                {puzzle.sideToMove === "WHITE" ? "⚫" : "⚪"}
              </div>
              <div>
                <div className="text-xs font-bold text-neutral-300">{opponentSide}</div>
                <div className="text-[10px] text-neutral-500 uppercase tracking-wider">Opponent</div>
              </div>
            </div>
            <div className="text-[10px] text-neutral-500 font-mono">
              {puzzle._count.attempts} {puzzle._count.attempts === 1 ? "attempt" : "attempts"}
            </div>
          </div>

          {/* Board */}
          <Board
            pieces={board}
            onMove={handleMove}
            readOnly={solveState !== "idle"}
            legalMoves={gridLegal}
            forcedPieces={forcedPieces}
            lastMove={lastMove}
            capturedGhosts={ghosts}
            flipped={flip}
            hintSquares={hintSquares}
          />

          {/* Player bar */}
          <div className={`rounded-xl border px-3 py-2 flex items-center justify-between gap-3 transition-colors duration-300 ${
            solveState !== "idle"
              ? isCorrect ? "border-emerald-500/30 bg-emerald-500/5" : "border-red-500/30 bg-red-500/5"
              : "border-neutral-700/50 bg-neutral-900/40"
          }`}>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full border border-neutral-700 bg-neutral-800 flex items-center justify-center overflow-hidden shrink-0">
                {avatarUrl
                  ? <img src={avatarUrl} alt={playerName} className="w-full h-full object-cover" />
                  : <UserPlus className="w-4 h-4 text-neutral-500" />
                }
              </div>
              <div>
                <div className="text-xs font-bold text-neutral-200">{playerName}</div>
                <div className="text-[10px] text-neutral-500 uppercase tracking-wider">Puzzle Rating</div>
              </div>
            </div>
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-mono font-black text-sm transition-all duration-300 ${
              solveState !== "idle"
                ? isCorrect ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300" : "bg-red-500/10 border-red-500/30 text-red-300"
                : "bg-neutral-950/60 border-neutral-700/60 text-neutral-100"
            }`}>
              {solveState !== "idle" && (isCorrect ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />)}
              <span className="tabular-nums">{displayRating}</span>
            </div>
          </div>

          {/* Desktop action row */}
          <div className="flex items-center justify-around border-t border-neutral-800 pt-2">
            <Link href="/puzzles" className="flex flex-col items-center gap-1.5 py-2 px-3 hover:bg-neutral-800/40 rounded-xl group">
              <ArrowLeft className="w-5 h-5 text-neutral-500 group-hover:text-neutral-300" />
              <span className="text-[9px] font-bold uppercase tracking-wider text-neutral-500 group-hover:text-neutral-300">{t("back")}</span>
            </Link>
            <button onClick={reset} className="flex flex-col items-center gap-1.5 py-2 px-3 hover:bg-neutral-800/40 rounded-xl group">
              <RotateCcw className="w-5 h-5 text-neutral-500 group-hover:text-amber-400" />
              <span className="text-[9px] font-bold uppercase tracking-wider text-neutral-500 group-hover:text-amber-400">
                {solveState === "idle" ? t("action.reset") : t("action.tryAgain")}
              </span>
            </button>
            <button onClick={() => setShowHint((s) => !s)} disabled={solveState !== "idle"} className="flex flex-col items-center gap-1.5 py-2 px-3 hover:bg-neutral-800/40 rounded-xl group disabled:opacity-40">
              <Lightbulb className={`w-5 h-5 group-hover:text-cyan-400 ${showHint ? "text-cyan-500" : "text-neutral-500"}`} />
              <span className={`text-[9px] font-bold uppercase tracking-wider group-hover:text-cyan-400 ${showHint ? "text-cyan-600" : "text-neutral-500"}`}>{t("showHint")}</span>
            </button>
            <Link href="/puzzles" className="flex flex-col items-center gap-1.5 py-2 px-3 hover:bg-neutral-800/40 rounded-xl group">
              <ArrowRight className={`w-5 h-5 ${solveState === "correct" ? "text-emerald-400" : "text-neutral-500 group-hover:text-emerald-400"}`} />
              <span className={`text-[9px] font-bold uppercase tracking-wider ${solveState === "correct" ? "text-emerald-400" : "text-neutral-500 group-hover:text-emerald-400"}`}>
                {solveState === "correct" ? t("action.solvedButton") : t("action.next")}
              </span>
            </Link>
          </div>
        </div>

        {/* Right panel */}
        <div className="flex flex-col gap-4 w-72 shrink-0">
          <Link href="/puzzles" className="inline-flex items-center gap-1.5 text-sm text-neutral-400 hover:text-white transition-colors">
            <ArrowLeft className="h-4 w-4" />{t("back")}
          </Link>
          <div className="rounded-2xl border border-white/10 bg-neutral-800/50 p-4 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              {puzzle.theme && (
                <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${themeColor(puzzle.theme)}`}>
                  {themeT(safeThemeKey as any)}
                </span>
              )}
              <span className="text-xs tracking-widest text-amber-300">{difficultyStars(puzzle.difficulty)}</span>
            </div>
            <h1 className="text-xl font-black leading-tight text-white">
              {puzzle.title ?? (puzzle.sideToMove === "WHITE" ? t("whiteToMove") : t("blackToMove"))}
            </h1>
            <p className="text-sm text-neutral-400">
              {t("instruction")}{" "}
              <span className="text-neutral-500">
                {puzzle._count.attempts === 1 ? t("attemptCountOne", { count: puzzle._count.attempts }) : t("attemptCount", { count: puzzle._count.attempts })}
              </span>
            </p>
            {solveState === "idle" && (
              <div className="flex items-center gap-2 text-sm font-mono text-neutral-500 pt-1">
                <Clock className="h-3.5 w-3.5" />{fmt(elapsed)}
              </div>
            )}
          </div>
          {solution && solution.length > 0 && (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-neutral-500">{t("bestLine")}</p>
              <div className="space-y-2">
                {solution.map((move, i) => (
                  <div key={i} className="flex items-center gap-2 font-mono text-sm">
                    <span className="w-4 text-right text-neutral-600">{i + 1}.</span>
                    <span className="tabular-nums text-white">{move.from}</span>
                    <ArrowRight className="h-3 w-3 shrink-0 text-neutral-600" />
                    <span className="tabular-nums text-emerald-300">{move.to}</span>
                    {move.captures && move.captures.length > 0 && (
                      <span className="ml-1 text-xs text-red-400">×{move.captures.join(", ")}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          {showHint && solveState === "idle" && (
            <div className="rounded-2xl border border-amber-400/20 bg-amber-400/5 p-4">
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-widest text-amber-500">{t("hintTitle")}</p>
              <p className="text-sm leading-relaxed text-amber-200/80">{hintT(safeThemeKey as any)}</p>
            </div>
          )}
          {solveState !== "idle" && !isAuthenticated && points !== null && (
            <div className="rounded-2xl border border-orange-400/20 bg-orange-400/5 p-4 flex items-center gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-400/10 text-orange-400">
                <Trophy size={20} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-white leading-tight">{t("guestCta.title")}</p>
                <p className="text-xs text-neutral-400 mt-0.5">{t("guestCta.desc")}</p>
                <Link href="/auth/register" className="mt-2 inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-orange-400 hover:text-orange-300">
                  <UserPlus size={12} />{t("guestCta.button")}
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
