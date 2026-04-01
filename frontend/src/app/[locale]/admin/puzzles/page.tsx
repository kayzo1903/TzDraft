"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle, XCircle, Eye, Clock, Zap, PlayCircle } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

interface PuzzleCandidate {
  id: string;
  title: string | null;
  difficulty: number;
  theme: string | null;
  evalGap: number;
  sourceGameId: string | null;
  sourceMoveNum: number | null;
  createdAt: string;
  sideToMove: string;
}

interface PuzzleStats {
  pending: number;
  approved: number;
  rejected: number;
}

export default function AdminPuzzlesPage() {
  const { locale } = useParams<{ locale: string }>();
  const [puzzles, setPuzzles] = useState<PuzzleCandidate[]>([]);
  const [stats, setStats] = useState<PuzzleStats | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [miningDays, setMiningDays] = useState(1);
  const [miningForce, setMiningForce] = useState(false);
  const [mining, setMining] = useState(false);
  const [mineResult, setMineResult] = useState<{ games: number; candidates: number } | null>(null);
  const LIMIT = 20;

  async function fetchData(p: number) {
    setLoading(true);
    try {
      const [listRes, statsRes] = await Promise.all([
        fetch(`${API_URL}/admin/puzzles?page=${p}&limit=${LIMIT}`, {
          credentials: "include",
        }),
        fetch(`${API_URL}/admin/puzzles/stats`, { credentials: "include" }),
      ]);
      if (listRes.ok) {
        const data = await listRes.json();
        setPuzzles(data.data);
        setTotal(data.total);
      }
      if (statsRes.ok) {
        setStats(await statsRes.json());
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData(page);
  }, [page]);

  async function triggerMine() {
    setMining(true);
    setMineResult(null);
    try {
      const res = await fetch(`${API_URL}/admin/puzzles/mine`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days: miningDays, force: miningForce }),
      });
      if (res.ok) {
        const data = await res.json();
        setMineResult({ games: data.games, candidates: data.candidates });
        fetchData(1);
        setPage(1);
      }
    } finally {
      setMining(false);
    }
  }

  async function quickReject(id: string) {
    await fetch(`${API_URL}/admin/puzzles/${id}/reject`, {
      method: "POST",
      credentials: "include",
    });
    fetchData(page);
  }

  const totalPages = Math.ceil(total / LIMIT);
  const difficultyLabel = (d: number) => "★".repeat(d) + "☆".repeat(5 - d);

  return (
    <div className="space-y-6">
      {/* Header + mine trigger */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-black text-white">Puzzle Review Queue</h1>
          <p className="mt-1 text-sm text-gray-400">
            Candidates mined automatically from completed games. Approve to publish.
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-xl border border-gray-800 bg-gray-900 p-3">
          <span className="text-xs font-semibold text-gray-400 whitespace-nowrap">Mine last</span>
          <select
            value={miningDays}
            onChange={(e) => setMiningDays(Number(e.target.value))}
            className="rounded-lg border border-gray-700 bg-gray-800 px-2 py-1.5 text-sm text-white focus:border-orange-400 focus:outline-none"
          >
            {[1, 3, 7, 14, 30, 60, 90].map((d) => (
              <option key={d} value={d}>{d} day{d !== 1 ? "s" : ""}</option>
            ))}
          </select>
          <label className="flex items-center gap-1.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={miningForce}
              onChange={(e) => setMiningForce(e.target.checked)}
              className="h-3.5 w-3.5 accent-orange-400"
            />
            <span className="text-xs text-gray-400">Re-scan</span>
          </label>
          <button
            onClick={triggerMine}
            disabled={mining}
            className="inline-flex items-center gap-1.5 rounded-lg bg-orange-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-orange-400 disabled:opacity-50 transition-colors"
          >
            <PlayCircle className="h-3.5 w-3.5" />
            {mining ? "Mining..." : "Run"}
          </button>
          {mineResult && (
            <span className="text-xs text-emerald-400 whitespace-nowrap">
              {mineResult.candidates} new from {mineResult.games} game{mineResult.games !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>

      {/* Stats row */}
      {stats && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Pending", value: stats.pending, color: "text-amber-400" },
            { label: "Approved", value: stats.approved, color: "text-emerald-400" },
            { label: "Rejected", value: stats.rejected, color: "text-red-400" },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-xl border border-gray-800 bg-gray-900 p-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">{label}</p>
              <p className={`mt-1 text-3xl font-black ${color}`}>{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      {loading ? (
        <p className="text-sm text-gray-500">Loading...</p>
      ) : puzzles.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-700 p-8 text-center text-gray-500">
          <Clock className="mx-auto mb-3 h-8 w-8 opacity-40" />
          <p className="font-semibold">No pending puzzles</p>
          <p className="mt-1 text-sm">
            Use the Run button above to mine games, or wait for the nightly cron at 3 AM.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-800">
          <table className="w-full text-sm">
            <thead className="bg-gray-900 text-xs uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-4 py-3 text-left">Theme</th>
                <th className="px-4 py-3 text-left">Side</th>
                <th className="px-4 py-3 text-left">Difficulty</th>
                <th className="px-4 py-3 text-left">Eval Gap</th>
                <th className="px-4 py-3 text-left">Source</th>
                <th className="px-4 py-3 text-left">Created</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {puzzles.map((p) => (
                <tr key={p.id} className="bg-gray-950 hover:bg-gray-900/60 transition-colors">
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-400/10 px-2.5 py-1 text-xs font-semibold text-orange-300">
                      {p.theme ?? "unknown"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-300">{p.sideToMove}</td>
                  <td className="px-4 py-3 text-amber-300 tracking-wider text-xs">
                    {difficultyLabel(p.difficulty)}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 text-emerald-300">
                      <Zap className="h-3 w-3" />
                      {p.evalGap > 0 ? `+${p.evalGap}` : p.evalGap}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs font-mono">
                    {p.sourceGameId
                      ? `${p.sourceGameId.slice(0, 8)}… m${p.sourceMoveNum}`
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {new Date(p.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/${locale}/admin/puzzles/${p.id}`}
                        className="inline-flex items-center gap-1 rounded-lg bg-gray-800 px-3 py-1.5 text-xs font-semibold text-gray-200 hover:bg-gray-700 transition-colors"
                      >
                        <Eye className="h-3 w-3" />
                        Review
                      </Link>
                      <button
                        onClick={() => quickReject(p.id)}
                        className="inline-flex items-center gap-1 rounded-lg bg-red-900/30 px-3 py-1.5 text-xs font-semibold text-red-300 hover:bg-red-900/50 transition-colors"
                      >
                        <XCircle className="h-3 w-3" />
                        Reject
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-400">
          <span>{total} candidate(s)</span>
          <div className="flex gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="rounded-lg border border-gray-700 px-3 py-1.5 disabled:opacity-40 hover:bg-gray-800 transition-colors"
            >
              Previous
            </button>
            <span className="px-3 py-1.5">
              {page} / {totalPages}
            </span>
            <button
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-lg border border-gray-700 px-3 py-1.5 disabled:opacity-40 hover:bg-gray-800 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
