"use client";

import { useState } from "react";
import { Link } from "@/i18n/routing";
import { ArrowLeft, PlayCircle, Clock, Zap, CheckCircle, AlertTriangle, Search, Bot } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

export default function AdminPuzzleMinePage() {
  const [days, setDays] = useState(7);
  const [force, setForce] = useState(false);
  const [mining, setMining] = useState(false);
  const [result, setResult] = useState<{ games: number; candidates: number; source?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Simulate state
  const [simGames, setSimGames] = useState(3);
  const [simulating, setSimulating] = useState(false);

  async function startMining() {
    setMining(true);
    setResult(null);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/admin/puzzles/mine`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days, force }),
      });
      if (!res.ok) throw new Error(`Failed to start miner: ${res.statusText}`);
      const data = await res.json();
      setResult({ games: data.games, candidates: data.candidates, source: "mining" });
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setMining(false);
    }
  }

  async function startSimulation() {
    setSimulating(true);
    setResult(null);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/admin/puzzles/simulate`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ games: simGames }),
      });
      if (!res.ok) throw new Error(`Simulation failed: ${res.statusText}`);
      const data = await res.json();
      setResult({ games: data.games, candidates: data.candidates, source: "simulation" });
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setSimulating(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8 pb-20">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-3">
        <Link
          href="/admin/puzzles"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-800 bg-gray-900 text-gray-400 transition-colors hover:text-white"
        >
          <ArrowLeft size={18} />
        </Link>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">
            Puzzle Engine
          </p>
          <h1 className="text-2xl font-black text-white">Mine New Puzzles</h1>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Configuration Card */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl border border-gray-800 bg-gray-900/50 p-6 shadow-xl">
            <h2 className="mb-6 flex items-center gap-2 text-lg font-bold text-white">
              <Zap className="text-orange-400" size={20} />
              Miner Configuration
            </h2>

            <div className="space-y-6">
              {/* Days Lookback */}
              <div className="space-y-3">
                <label className="block text-sm font-semibold text-gray-300">
                  Lookback Period
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[1, 3, 7, 14, 30, 60, 90].map((d) => (
                    <button
                      key={d}
                      onClick={() => setDays(d)}
                      className={`rounded-xl border py-3 text-sm font-bold transition-all ${
                        days === d
                          ? "border-orange-500 bg-orange-500/10 text-orange-400 shadow-[0_0_15px_rgba(249,115,22,0.1)]"
                          : "border-gray-800 bg-gray-950 text-gray-500 hover:border-gray-700 hover:text-gray-300"
                      }`}
                    >
                      {d} day{d !== 1 ? "s" : ""}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-500">
                  The engine will scan games that finished in the last {days} days.
                </p>
              </div>

              {/* Force Option */}
              <div className="flex items-center justify-between rounded-xl bg-gray-950 p-4 border border-gray-800">
                <div className="space-y-1">
                  <p className="text-sm font-bold text-white">Re-scan Games</p>
                  <p className="text-xs text-gray-500">
                    Process games even if they were already mined before.
                  </p>
                </div>
                <button
                  onClick={() => setForce(!force)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    force ? "bg-orange-500" : "bg-gray-700"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      force ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              {/* Start Button */}
              <button
                onClick={startMining}
                disabled={mining || simulating}
                className="flex w-full items-center justify-center gap-3 rounded-xl bg-orange-500 py-4 text-sm font-black text-white transition-all hover:bg-orange-400 disabled:opacity-50 disabled:grayscale"
              >
                {mining ? (
                  <>
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Mining in progress...
                  </>
                ) : (
                  <>
                    <PlayCircle size={20} />
                    START PUZZLE MINING
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Simulate Engine Games Card */}
          <div className="rounded-2xl border border-indigo-500/20 bg-gray-900/50 p-6 shadow-xl">
            <h2 className="mb-1 flex items-center gap-2 text-lg font-bold text-white">
              <Bot className="text-indigo-400" size={20} />
              Simulate Engine Games
            </h2>
            <p className="mb-6 text-xs text-gray-500">
              Play Mkaguzi vs Mkaguzi and extract high-quality middlegame positions and traps as puzzles.
            </p>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-300">Number of Games</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 5].map((n) => (
                    <button
                      key={n}
                      onClick={() => setSimGames(n)}
                      className={`flex-1 rounded-xl border py-3 text-sm font-bold transition-all ${
                        simGames === n
                          ? "border-indigo-500 bg-indigo-500/10 text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.1)]"
                          : "border-gray-800 bg-gray-950 text-gray-500 hover:border-gray-700 hover:text-gray-300"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-500">
                  Each game takes ~2-4 min at engine level 17. {simGames} game{simGames > 1 ? "s" : ""} ≈ {simGames * 3} min.
                </p>
              </div>

              <button
                onClick={startSimulation}
                disabled={mining || simulating}
                className="flex w-full items-center justify-center gap-3 rounded-xl bg-indigo-600 py-4 text-sm font-black text-white transition-all hover:bg-indigo-500 disabled:opacity-50 disabled:grayscale"
              >
                {simulating ? (
                  <>
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Simulating {simGames} game{simGames > 1 ? "s" : ""}...
                  </>
                ) : (
                  <>
                    <Bot size={20} />
                    SIMULATE ENGINE GAMES
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Results Display */}
          {result && (
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-6 animate-in fade-in slide-in-from-top-4 duration-500">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                  <CheckCircle size={24} />
                </div>
                <div className="flex-1 space-y-1">
                  <h3 className="text-lg font-bold text-emerald-400">
                    {result.source === "simulation" ? "Simulation Complete" : "Mining Complete"}
                  </h3>
                  <p className="text-sm text-gray-400">
                    {result.source === "simulation"
                      ? `${result.games} engine game(s) simulated. New puzzle candidates are in the review queue.`
                      : "The scan was successful. New candidates are now in the review queue."}
                  </p>
                  <div className="mt-4 flex gap-8">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Games Processed</p>
                      <p className="text-2xl font-black text-white">{result.games}</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Candidates Found</p>
                      <p className="text-2xl font-black text-white">{result.candidates}</p>
                    </div>
                  </div>
                  <Link 
                    href="/admin/puzzles"
                    className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-emerald-400 hover:underline"
                  >
                    View review queue <ArrowRight size={14} className="ml-1" />
                  </Link>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-6 animate-in fade-in slide-in-from-top-4 duration-500">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/20 text-red-400">
                  <AlertTriangle size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-red-400">Mining Failed</h3>
                  <p className="text-sm text-gray-400">{error}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Info Sidebar */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-gray-800 bg-gray-900 p-6">
            <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-gray-500">How it works</h3>
            <ul className="space-y-4">
              <li className="flex gap-3">
                <div className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-orange-500/20 text-orange-400 text-[10px] font-black">1</div>
                <p className="text-xs leading-relaxed text-gray-400">
                  The system fetches all finished games with a winner from the specified lookback period.
                </p>
              </li>
              <li className="flex gap-3">
                <div className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-orange-500/20 text-orange-400 text-[10px] font-black">2</div>
                <p className="text-xs leading-relaxed text-gray-400">
                  Each move is replayed through the <span className="text-white font-semibold">Mkaguzi Engine</span> to detect tactical swings or multi-captures.
                </p>
              </li>
              <li className="flex gap-3">
                <div className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-orange-500/20 text-orange-400 text-[10px] font-black">3</div>
                <p className="text-xs leading-relaxed text-gray-400">
                  Tactical moments are saved as <span className="text-white font-semibold">PENDING</span> candidates for your review.
                </p>
              </li>
            </ul>
          </div>

          <div className="rounded-2xl border border-gray-800 bg-gray-900 p-6">
            <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-gray-500">Note on Engine Load</h3>
            <p className="text-xs leading-relaxed text-gray-400">
              Mining large windows (e.g., 90 days) can take several minutes as the engine performs full positional analysis on thousands of moves.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ArrowRight({ size, className }: { size: number; className?: string }) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  );
}
