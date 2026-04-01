"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { CheckCircle, XCircle, ArrowLeft } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

interface PuzzleDetail {
  id: string;
  title: string | null;
  difficulty: number;
  theme: string | null;
  evalGap: number;
  sideToMove: string;
  pieces: PieceSnapshot[];
  solution: SolutionMove[];
  sourceGameId: string | null;
  sourceMoveNum: number | null;
  createdAt: string;
  status: string;
}

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

// ── Minimal static board renderer ────────────────────────────────────────────

const DARK_SQUARES_BY_ROW: number[][] = [
  [1, 2, 3, 4],
  [5, 6, 7, 8],
  [9, 10, 11, 12],
  [13, 14, 15, 16],
  [17, 18, 19, 20],
  [21, 22, 23, 24],
  [25, 26, 27, 28],
  [29, 30, 31, 32],
];

function BoardPreview({
  pieces,
  solution,
}: {
  pieces: PieceSnapshot[];
  solution: SolutionMove[];
}) {
  const pieceMap = new Map(pieces.map((p) => [p.position, p]));
  const fromSq = solution[0]?.from;
  const toSq = solution[0]?.to;
  const captureSqs = new Set(solution[0]?.captures ?? []);

  return (
    <div className="inline-block rounded-xl overflow-hidden border border-gray-700">
      {DARK_SQUARES_BY_ROW.map((row, rowIdx) => (
        <div key={rowIdx} className="flex">
          {Array.from({ length: 8 }, (_, colIdx) => {
            const isDark = (rowIdx + colIdx) % 2 === 1;
            if (!isDark) {
              return (
                <div key={colIdx} className="h-10 w-10 bg-amber-100/10" />
              );
            }
            const sqNum = row[Math.floor(colIdx / 2)];
            const piece = pieceMap.get(sqNum);
            const isFrom = sqNum === fromSq;
            const isTo = sqNum === toSq;
            const isCaptured = captureSqs.has(sqNum);

            return (
              <div
                key={colIdx}
                className={`relative h-10 w-10 flex items-center justify-center
                  ${isCaptured ? "bg-red-900/50" : isFrom ? "bg-amber-500/30" : isTo ? "bg-emerald-500/30" : "bg-gray-700"}`}
              >
                {piece && (
                  <div
                    className={`h-7 w-7 rounded-full border-2 flex items-center justify-center text-xs font-black
                      ${piece.color === "WHITE"
                        ? "bg-gray-100 border-gray-300 text-gray-800"
                        : "bg-gray-800 border-gray-600 text-gray-100"
                      }`}
                  >
                    {piece.type === "KING" ? "K" : ""}
                  </div>
                )}
                {sqNum && (
                  <span className="absolute bottom-0 right-0.5 text-[8px] text-gray-500 leading-none">
                    {sqNum}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function AdminPuzzleReviewPage() {
  const { locale, id } = useParams<{ locale: string; id: string }>();
  const router = useRouter();
  const [puzzle, setPuzzle] = useState<PuzzleDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Editable fields
  const [title, setTitle] = useState("");
  const [difficulty, setDifficulty] = useState(1);
  const [theme, setTheme] = useState("");

  useEffect(() => {
    fetch(`${API_URL}/admin/puzzles/${id}`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        setPuzzle(data);
        setTitle(data.title ?? "");
        setDifficulty(data.difficulty ?? 1);
        setTheme(data.theme ?? "");
      })
      .finally(() => setLoading(false));
  }, [id]);

  async function handleApprove() {
    setSaving(true);
    await fetch(`${API_URL}/admin/puzzles/${id}/approve`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title || undefined, difficulty, theme: theme || undefined }),
    });
    router.push(`/${locale}/admin/puzzles`);
  }

  async function handleReject() {
    setSaving(true);
    await fetch(`${API_URL}/admin/puzzles/${id}/reject`, {
      method: "POST",
      credentials: "include",
    });
    router.push(`/${locale}/admin/puzzles`);
  }

  if (loading) {
    return <p className="text-sm text-gray-500">Loading...</p>;
  }

  if (!puzzle) {
    return <p className="text-sm text-red-400">Puzzle not found.</p>;
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to queue
        </button>
      </div>

      <div>
        <h1 className="text-2xl font-black text-white">Review Puzzle Candidate</h1>
        <p className="mt-1 text-sm text-gray-400">
          Verify the position and solution, then approve or reject.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[auto_1fr]">
        {/* Board preview */}
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">
            Position ({puzzle.sideToMove} to move)
          </p>
          <BoardPreview pieces={puzzle.pieces} solution={puzzle.solution} />
          <div className="space-y-1 text-xs text-gray-400">
            <p>
              <span className="inline-block w-3 h-3 rounded-sm bg-amber-500/40 mr-1.5 align-middle" />
              From square
            </p>
            <p>
              <span className="inline-block w-3 h-3 rounded-sm bg-emerald-500/40 mr-1.5 align-middle" />
              To square
            </p>
            <p>
              <span className="inline-block w-3 h-3 rounded-sm bg-red-900/50 mr-1.5 align-middle" />
              Captured piece(s)
            </p>
          </div>
        </div>

        {/* Details + edit form */}
        <div className="space-y-4">
          {/* Solution display */}
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-4 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">Solution</p>
            {puzzle.solution.map((move, i) => (
              <p key={i} className="font-mono text-sm text-emerald-300">
                Move {i + 1}: {move.from} → {move.to}
                {move.captures && move.captures.length > 0 && (
                  <span className="text-red-300"> (captures: {move.captures.join(", ")})</span>
                )}
              </p>
            ))}
            <p className="text-xs text-gray-500 mt-2">
              Eval gap: <span className="text-emerald-400 font-semibold">+{puzzle.evalGap} cp</span>
            </p>
          </div>

          {/* Editable fields */}
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-4 space-y-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">
              Edit before publishing
            </p>

            <div className="space-y-1">
              <label className="block text-xs text-gray-400">Title (optional)</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. King trap on the long diagonal"
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-orange-400 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs text-gray-400">Difficulty (1-5)</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((d) => (
                  <button
                    key={d}
                    onClick={() => setDifficulty(d)}
                    className={`h-8 w-8 rounded-lg text-sm font-bold transition-colors
                      ${difficulty === d
                        ? "bg-orange-500 text-white"
                        : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                      }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-xs text-gray-400">Theme</label>
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-orange-400 focus:outline-none"
              >
                <option value="">Select theme...</option>
                <option value="multi-capture">Multi-capture</option>
                <option value="promotion">Promotion</option>
                <option value="king-trap">King trap</option>
                <option value="endgame">Endgame</option>
                <option value="capture">Capture</option>
                <option value="positional">Positional</option>
              </select>
            </div>
          </div>

          {/* Source info */}
          {puzzle.sourceGameId && (
            <p className="text-xs text-gray-600 font-mono">
              Source: game {puzzle.sourceGameId.slice(0, 8)}… move #{puzzle.sourceMoveNum}
            </p>
          )}

          {/* Action buttons */}
          <div className="flex gap-3 pt-2">
            <button
              disabled={saving}
              onClick={handleApprove}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-500 disabled:opacity-50 transition-colors"
            >
              <CheckCircle className="h-4 w-4" />
              Approve & Publish
            </button>
            <button
              disabled={saving}
              onClick={handleReject}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-red-900/40 px-4 py-2.5 text-sm font-bold text-red-300 hover:bg-red-900/60 disabled:opacity-50 transition-colors"
            >
              <XCircle className="h-4 w-4" />
              Reject
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
