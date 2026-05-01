"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Link } from "@/i18n/routing";
import { CheckCircle, XCircle, Eye, Clock, Zap, AlertTriangle, Trash2 } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

interface PuzzleCandidate {
  id: string;
  title: string | null;
  difficulty: number;
  theme: string | null;
  evalGap: number;
  status: string;
  sourceGameId: string | null;
  sourceMoveNum: number | null;
  createdAt: string;
  publishedAt: string | null;
  expiresAt: string | null;
  sideToMove: string;
}

interface PuzzleStats {
  pending: number;
  approved: number;
  rejected: number;
  expired: number;
}

export default function AdminPuzzlesPage() {
  const searchParams = useSearchParams();
  const [puzzles, setPuzzles] = useState<PuzzleCandidate[]>([]);
  const [stats, setStats] = useState<PuzzleStats | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [miningDays, setMiningDays] = useState(1);
  const [miningForce, setMiningForce] = useState(false);
  const [mining, setMining] = useState(false);
  const [mineResult, setMineResult] = useState<{ games: number; candidates: number } | null>(null);
  const VALID_TABS = ["ALL", "PENDING", "APPROVED", "EXPIRED", "REJECTED"];
  const tabFromUrl = searchParams.get("tab") ?? "PENDING";
  const [filterStatus, setFilterStatus] = useState<string>(
    VALID_TABS.includes(tabFromUrl) ? tabFromUrl : "PENDING"
  );
  const [clearing, setClearing] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [clearError, setClearError] = useState<string | null>(null);
  const LIMIT = 20;

  async function fetchData(p: number) {
    setLoading(true);
    try {
      const statusParam = filterStatus && filterStatus !== "ALL"
        ? filterStatus === "EXPIRED"
          ? `&status=APPROVED&expired=true`
          : `&status=${filterStatus}`
        : "";
      const [listRes, statsRes] = await Promise.all([
        fetch(`${API_URL}/admin/puzzles?page=${p}&limit=${LIMIT}${statusParam}`, {
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
  }, [page, filterStatus]);

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

  async function clearPending() {
    setClearing(true);
    setClearError(null);
    try {
      const r = await fetch(`${API_URL}/admin/puzzles/pending`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        setClearError(err?.message ?? `Error ${r.status}: ${r.statusText}`);
        return;
      }
      setConfirmClear(false);
      setPage(1);
      fetchData(1);
    } catch (e) {
      setClearError((e as Error).message);
    } finally {
      setClearing(false);
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
      {/* Confirm clear dialog */}
      {confirmClear && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setConfirmClear(false)} />
          <div className="relative w-full max-w-sm rounded-2xl border border-red-500/30 bg-gray-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-500/10 border border-red-500/20">
                <AlertTriangle className="h-5 w-5 text-red-400" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">Clear all pending puzzles?</p>
                <p className="mt-1 text-sm text-gray-400">
                  This will permanently delete all {stats?.pending} pending puzzle candidates. This cannot be undone.
                </p>
              </div>
            </div>
            {clearError && (
              <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-400">
                {clearError}
              </p>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => { setConfirmClear(false); setClearError(null); }}
                className="flex-1 rounded-xl bg-gray-800 px-4 py-2.5 text-sm font-bold text-white hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={clearPending}
                disabled={clearing}
                className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-500 disabled:opacity-50 transition-colors"
              >
                {clearing ? "Clearing…" : "Yes, Clear All"}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Header + mine trigger */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-black text-white">Puzzle Review Queue</h1>
          <p className="mt-1 text-sm text-gray-400">
            Candidates mined automatically from completed games. Approve to publish.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {stats && stats.pending > 0 && (
            <button
              onClick={() => setConfirmClear(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm font-bold text-red-400 hover:bg-red-500/20 transition-all"
            >
              <Trash2 className="h-4 w-4" />
              Clear Pending ({stats.pending})
            </button>
          )}
          <Link
            href="/admin/puzzles/mine"
            className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-black text-white hover:bg-orange-400 shadow-lg shadow-orange-500/10 transition-all"
          >
            <Zap className="h-4 w-4" />
            MINE NEW PUZZLES
          </Link>
        </div>
      </div>

      <div className="flex items-center gap-2 border-b border-gray-800 pb-px">
        {["ALL", "PENDING", "APPROVED", "EXPIRED", "REJECTED"].map((s) => (
          <button
            key={s}
            onClick={() => { setFilterStatus(s); setPage(1); }}
            className={`px-4 py-2 text-sm font-bold transition-colors border-b-2 ${
              filterStatus === s 
                ? "border-orange-500 text-white" 
                : "border-transparent text-gray-500 hover:text-gray-300"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Stats row */}
      {stats && (
        <div className="grid grid-cols-4 gap-4">
          {
            [
              { label: "Pending", value: stats.pending, color: "text-amber-400" },
              { label: "Approved", value: stats.approved, color: "text-emerald-400" },
              { label: "Expired", value: stats.expired, color: "text-orange-400" },
              { label: "Rejected", value: stats.rejected, color: "text-red-400" },
            ].map(({ label, value, color }) => (
              <div key={label} className="rounded-xl border border-gray-800 bg-gray-900 p-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">{label}</p>
                <p className={`mt-1 text-3xl font-black ${color}`}>{value}</p>
              </div>
            ))
          }
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
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Theme</th>
                <th className="px-4 py-3 text-left">Side</th>
                <th className="px-4 py-3 text-left">Difficulty</th>
                <th className="px-4 py-3 text-left">Eval Gap</th>
                <th className="px-4 py-3 text-left">Mined</th>
                <th className="px-4 py-3 text-left">Published</th>
                <th className="px-4 py-3 text-left">Expires</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {puzzles.map((p) => (
                <tr key={p.id} className="bg-gray-950 hover:bg-gray-900/60 transition-colors">
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                      p.status === "APPROVED" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" :
                      p.status === "PENDING" ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" :
                      "bg-red-500/20 text-red-400 border border-red-500/30"
                    }`}>
                      {p.status}
                    </span>
                  </td>
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
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {new Date(p.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {p.publishedAt
                      ? <span className="text-emerald-400">{new Date(p.publishedAt).toLocaleString()}</span>
                      : <span className="text-gray-600">—</span>}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {p.expiresAt ? (() => {
                      const isExpired = new Date(p.expiresAt) <= new Date();
                      return (
                        <span className={isExpired ? "text-red-400 font-semibold" : "text-gray-400"}>
                          {new Date(p.expiresAt).toLocaleString()}
                          {isExpired && " ✗"}
                        </span>
                      );
                    })() : <span className="text-gray-600">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/admin/puzzles/${p.id}`}
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
