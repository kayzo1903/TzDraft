"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle, XCircle, RotateCcw, ArrowLeft, ArrowRight, Lightbulb } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

interface PieceSnapshot {
  type: "MAN" | "KING";
  color: "WHITE" | "BLACK";
  position: number;
}

interface SolutionMove {
  from: number;
  to: number;
  captures?: number[];
}

interface PuzzleData {
  id: string;
  title: string | null;
  difficulty: number;
  theme: string | null;
  pieces: PieceSnapshot[];
  sideToMove: "WHITE" | "BLACK";
  _count: { attempts: number };
}

// ── Board layout ──────────────────────────────────────────────────────────────
// PDN 1-32 dark squares in row-major order (top-left = row 0)
// Row 0 (rank 8): dark squares 1-4 at columns 1,3,5,7
// Row 1 (rank 7): dark squares 5-8 at columns 0,2,4,6
// etc.

function squareToRowCol(sq: number): { row: number; col: number } {
  const idx = sq - 1; // 0-indexed
  const row = Math.floor(idx / 4);
  const posInRow = idx % 4;
  const col = row % 2 === 0 ? posInRow * 2 + 1 : posInRow * 2;
  return { row, col };
}

function difficultyStars(d: number) {
  return "★".repeat(d) + "☆".repeat(5 - d);
}

// ── Interactive Board ────────────────────────────────────────────────────────

interface BoardProps {
  pieces: PieceSnapshot[];
  sideToMove: "WHITE" | "BLACK";
  selectedSquare: number | null;
  legalTargets: number[];
  highlightFrom: number | null;
  highlightTo: number | null;
  highlightCaptures: number[];
  onSquareClick: (sq: number) => void;
}

function Board({
  pieces,
  sideToMove,
  selectedSquare,
  legalTargets,
  highlightFrom,
  highlightTo,
  highlightCaptures,
  onSquareClick,
}: BoardProps) {
  const pieceMap = new Map(pieces.map((p) => [p.position, p]));

  return (
    <div className="inline-grid grid-cols-8 overflow-hidden rounded-xl border border-white/10">
      {Array.from({ length: 64 }, (_, cellIdx) => {
        const row = Math.floor(cellIdx / 8);
        const col = cellIdx % 8;
        const isDark = (row + col) % 2 === 1;

        if (!isDark) {
          return (
            <div
              key={cellIdx}
              className="h-12 w-12 sm:h-14 sm:w-14 bg-amber-100/10"
            />
          );
        }

        // Map dark cell to PDN square number
        const posInRow = Math.floor(col / 2);
        const sq = row * 4 + posInRow + 1;

        const piece = pieceMap.get(sq);
        const isSelected = selectedSquare === sq;
        const isTarget = legalTargets.includes(sq);
        const isFrom = highlightFrom === sq;
        const isTo = highlightTo === sq;
        const isCaptured = highlightCaptures.includes(sq);

        let bg = "bg-gray-700 hover:bg-gray-600";
        if (isCaptured) bg = "bg-red-800/70";
        else if (isTo) bg = "bg-emerald-700/60";
        else if (isFrom) bg = "bg-amber-600/40";
        else if (isSelected) bg = "bg-orange-500/50";
        else if (isTarget) bg = "bg-sky-500/30 hover:bg-sky-500/50";

        const canClick = Boolean(
          piece?.color === sideToMove || isTarget,
        );

        return (
          <div
            key={cellIdx}
            className={`relative h-12 w-12 sm:h-14 sm:w-14 flex items-center justify-center cursor-pointer transition-colors ${bg}`}
            onClick={() => (canClick || isTarget) && onSquareClick(sq)}
          >
            {piece && (
              <div
                className={`h-9 w-9 rounded-full border-2 flex items-center justify-center text-xs font-black select-none
                  ${piece.color === "WHITE"
                    ? "bg-gray-100 border-gray-300 text-gray-800 shadow-[0_2px_6px_rgba(0,0,0,0.4)]"
                    : "bg-gray-800 border-gray-500 text-gray-100 shadow-[0_2px_6px_rgba(0,0,0,0.5)]"
                  }`}
              >
                {piece.type === "KING" ? "K" : ""}
              </div>
            )}
            {isTarget && !piece && (
              <div className="h-3 w-3 rounded-full bg-sky-400/70" />
            )}
            <span className="absolute bottom-0 right-0.5 text-[8px] text-gray-600 leading-none select-none">
              {sq}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ── Helper: compute legal capture targets for a piece (simplified) ────────────
// We only need basic move hints for UX — the real validation is server-side.

function getLegalTargets(
  pieces: PieceSnapshot[],
  fromSq: number,
  _sideToMove: "WHITE" | "BLACK",
): number[] {
  const piece = pieces.find((p) => p.position === fromSq);
  if (!piece) return [];

  const occupied = new Set(pieces.map((p) => p.position));
  const targets: number[] = [];

  // Simple adjacency: ±4, ±5 for rows, ±9 for captures
  // This is a UI hint only — not full TZD rule enforcement
  const STEP_DIRS = piece.type === "MAN"
    ? piece.color === "WHITE" ? [4, 5] : [-4, -5]
    : [4, 5, -4, -5];

  for (const dir of STEP_DIRS) {
    const target = fromSq + dir;
    if (target >= 1 && target <= 32 && !occupied.has(target)) {
      targets.push(target);
    }
    // Capture jump
    const over = fromSq + dir;
    const land = fromSq + dir * 2;
    if (
      over >= 1 && over <= 32 &&
      land >= 1 && land <= 32 &&
      !occupied.has(land)
    ) {
      const overPiece = pieces.find((p) => p.position === over);
      if (overPiece && overPiece.color !== piece.color) {
        targets.push(land);
      }
    }
  }

  return targets;
}

// ── Page ─────────────────────────────────────────────────────────────────────

type SolveState = "idle" | "correct" | "incorrect";

export default function PuzzleSolvePage() {
  const { locale, id } = useParams<{ locale: string; id: string }>();
  const [puzzle, setPuzzle] = useState<PuzzleData | null>(null);
  const [loading, setLoading] = useState(true);

  // Board interaction state
  const [currentPieces, setCurrentPieces] = useState<PieceSnapshot[]>([]);
  const [selectedSq, setSelectedSq] = useState<number | null>(null);
  const [legalTargets, setLegalTargets] = useState<number[]>([]);
  const [playerMoves, setPlayerMoves] = useState<SolutionMove[]>([]);

  // Feedback state
  const [solveState, setSolveState] = useState<SolveState>("idle");
  const [solution, setSolution] = useState<SolutionMove[] | null>(null);
  const [showHint, setShowHint] = useState(false);

  // Last move highlight
  const [lastFrom, setLastFrom] = useState<number | null>(null);
  const [lastTo, setLastTo] = useState<number | null>(null);
  const [lastCaptures, setLastCaptures] = useState<number[]>([]);

  useEffect(() => {
    fetch(`${API_URL}/puzzles/${id}`, { credentials: "include" })
      .then((r) => r.json())
      .then((data: PuzzleData) => {
        setPuzzle(data);
        setCurrentPieces(data.pieces);
      })
      .finally(() => setLoading(false));
  }, [id]);

  const reset = useCallback(() => {
    if (!puzzle) return;
    setCurrentPieces(puzzle.pieces);
    setSelectedSq(null);
    setLegalTargets([]);
    setPlayerMoves([]);
    setSolveState("idle");
    setSolution(null);
    setShowHint(false);
    setLastFrom(null);
    setLastTo(null);
    setLastCaptures([]);
  }, [puzzle]);

  async function submitMoves(moves: SolutionMove[]) {
    const res = await fetch(`${API_URL}/puzzles/${id}/attempt`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ moves }),
    });
    const data = await res.json();
    setSolveState(data.correct ? "correct" : "incorrect");
    setSolution(data.solution ?? null);
  }

  function onSquareClick(sq: number) {
    if (solveState !== "idle" || !puzzle) return;

    const piece = currentPieces.find((p) => p.position === sq);

    // Select own piece
    if (piece?.color === puzzle.sideToMove) {
      setSelectedSq(sq);
      setLegalTargets(getLegalTargets(currentPieces, sq, puzzle.sideToMove));
      return;
    }

    // Make move
    if (selectedSq !== null && legalTargets.includes(sq)) {
      const captures = currentPieces
        .filter((p) => p.color !== puzzle.sideToMove && isBetween(selectedSq, sq, p.position))
        .map((p) => p.position);

      const move: SolutionMove = { from: selectedSq, to: sq, captures };

      // Apply move visually
      let next = currentPieces.filter((p) => !captures.includes(p.position));
      next = next.map((p) =>
        p.position === selectedSq ? { ...p, position: sq } : p,
      );
      setCurrentPieces(next);
      setLastFrom(selectedSq);
      setLastTo(sq);
      setLastCaptures(captures);

      const newMoves = [...playerMoves, move];
      setPlayerMoves(newMoves);
      setSelectedSq(null);
      setLegalTargets([]);

      // Submit after first move (v1: single-move puzzles)
      submitMoves(newMoves);
    } else {
      setSelectedSq(null);
      setLegalTargets([]);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--background)]">
        <p className="text-neutral-400">Loading puzzle...</p>
      </div>
    );
  }

  if (!puzzle) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--background)]">
        <p className="text-red-400">Puzzle not found.</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        {/* Back */}
        <Link
          href={`/${locale}/puzzles`}
          className="inline-flex items-center gap-1.5 text-sm text-neutral-400 hover:text-white transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          All puzzles
        </Link>

        <div className="grid gap-8 lg:grid-cols-[auto_1fr]">
          {/* Board */}
          <div>
            <Board
              pieces={currentPieces}
              sideToMove={puzzle.sideToMove}
              selectedSquare={selectedSq}
              legalTargets={legalTargets}
              highlightFrom={solveState !== "idle" ? lastFrom : null}
              highlightTo={solveState !== "idle" ? lastTo : null}
              highlightCaptures={solveState !== "idle" ? lastCaptures : []}
              onSquareClick={onSquareClick}
            />
          </div>

          {/* Sidebar */}
          <div className="space-y-5 lg:pt-0">
            {/* Puzzle header */}
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                {puzzle.theme && (
                  <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-semibold capitalize text-neutral-300">
                    {puzzle.theme}
                  </span>
                )}
                <span className="text-xs tracking-widest text-amber-300">
                  {difficultyStars(puzzle.difficulty)}
                </span>
              </div>
              <h1 className="text-2xl font-black text-white">
                {puzzle.title ?? `${puzzle.sideToMove} to move`}
              </h1>
              <p className="mt-1 text-sm text-neutral-400">
                Find the best move. {puzzle._count.attempts} player
                {puzzle._count.attempts !== 1 ? "s" : ""} attempted this.
              </p>
            </div>

            {/* Status feedback */}
            {solveState === "correct" && (
              <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-4 flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-emerald-200">Correct!</p>
                  <p className="text-sm text-emerald-300/70 mt-0.5">
                    Well done — you found the winning move.
                  </p>
                </div>
              </div>
            )}

            {solveState === "incorrect" && (
              <div className="rounded-2xl border border-red-400/30 bg-red-400/10 p-4 flex items-start gap-3">
                <XCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-red-200">Not quite</p>
                  <p className="text-sm text-red-300/70 mt-0.5">
                    That's not the best move. See the solution below and try again.
                  </p>
                </div>
              </div>
            )}

            {/* Solution reveal */}
            {solution && (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-widest text-neutral-500">
                  Solution
                </p>
                {solution.map((move, i) => (
                  <p key={i} className="font-mono text-sm text-emerald-300">
                    {move.from} → {move.to}
                    {move.captures && move.captures.length > 0 && (
                      <span className="text-red-300 ml-1">
                        (captures: {move.captures.join(", ")})
                      </span>
                    )}
                  </p>
                ))}
              </div>
            )}

            {/* Hint */}
            {solveState === "idle" && !showHint && (
              <button
                onClick={() => setShowHint(true)}
                className="inline-flex items-center gap-2 text-sm text-amber-300 hover:text-amber-200 transition-colors"
              >
                <Lightbulb className="h-4 w-4" />
                Show hint
              </button>
            )}

            {showHint && solveState === "idle" && (
              <div className="rounded-2xl border border-amber-400/20 bg-amber-400/5 p-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-amber-500 mb-1">
                  Hint
                </p>
                <p className="text-sm text-amber-200/80">
                  Look for a{" "}
                  {puzzle.theme === "multi-capture"
                    ? "sequence of captures that clears multiple pieces"
                    : puzzle.theme === "promotion"
                    ? "move that promotes a man to king"
                    : "forcing capture that improves your position significantly"}
                  .
                </p>
              </div>
            )}

            {/* Controls */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={reset}
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-neutral-300 hover:bg-white/10 transition-colors"
              >
                <RotateCcw className="h-4 w-4" />
                Reset
              </button>
              <Link
                href={`/${locale}/puzzles`}
                className="inline-flex items-center gap-2 rounded-xl bg-orange-500/20 border border-orange-400/30 px-4 py-2.5 text-sm font-semibold text-orange-200 hover:bg-orange-500/30 transition-colors"
              >
                Next puzzle
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

// ── Geometry helper ───────────────────────────────────────────────────────────

/** Very rough check: is `mid` between `a` and `b` on the same diagonal? */
function isBetween(a: number, b: number, mid: number): boolean {
  const aR = Math.floor((a - 1) / 4);
  const bR = Math.floor((b - 1) / 4);
  const mR = Math.floor((mid - 1) / 4);
  if (mR < Math.min(aR, bR) || mR > Math.max(aR, bR)) return false;
  // mid row must be between a and b rows
  return Math.abs(aR - mR) === 1 && Math.abs(bR - mR) === 1;
}
