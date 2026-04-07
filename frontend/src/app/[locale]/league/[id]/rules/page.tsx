"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, BookOpen, AlertTriangle, Scale, Zap } from "lucide-react";

export default function LeagueRulesPage() {
  const { id: rawId, locale } = useParams<{ id: string; locale: string }>();
  const id = Array.isArray(rawId) ? rawId[0] : rawId;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <Link href={`/${locale}/league/${id}`} className="mb-6 flex items-center gap-2 text-sm text-gray-400 hover:text-white transition">
        <ArrowLeft className="h-4 w-4" /> Back to Standings
      </Link>

      <div className="mb-10 flex items-center gap-4">
        <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/10 p-4">
          <BookOpen className="h-8 w-8 text-indigo-400" />
        </div>
        <div>
          <h1 className="text-3xl font-extrabold text-white">League Rules & Regulations</h1>
          <p className="mt-1 text-gray-400">Official rulebook for TzDraft League play</p>
        </div>
      </div>

      <div className="space-y-8">
        {/* Section 1 */}
        <section className="rounded-2xl border border-gray-800 bg-gray-900/50 p-6 md:p-8">
          <div className="mb-4 flex items-center gap-3 border-b border-gray-800 pb-4">
            <Scale className="h-5 w-5 text-sky-400" />
            <h2 className="text-xl font-bold text-white">1. Format & Points</h2>
          </div>
          <p className="text-gray-300">
            Each league consists of exactly 12 players playing a Round-Robin format. You will play exactly one match against every other participant.
          </p>
          <ul className="mt-4 list-disc pl-5 space-y-2 text-gray-400">
            <li>A Match consists of exactly <strong>2 games</strong> against the same opponent.</li>
            <li>You will play one game as White, and one game as Black.</li>
            <li>Standings are sorted by: Match Points {">"} Goal Difference {">"} Goals For {">"} H2H.</li>
          </ul>
          <div className="mt-6 flex gap-4 text-sm font-semibold">
            <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 text-emerald-400">
              Win = 3 Points
            </div>
            <div className="rounded-lg bg-gray-500/10 border border-gray-500/20 px-4 py-2 text-gray-400">
              Draw = 1 Point
            </div>
            <div className="rounded-lg bg-rose-500/10 border border-rose-500/20 px-4 py-2 text-rose-400">
              Loss = 0 Points
            </div>
          </div>
        </section>

        {/* Section 2 */}
        <section className="rounded-2xl border border-gray-800 bg-gray-900/50 p-6 md:p-8">
          <div className="mb-4 flex items-center gap-3 border-b border-gray-800 pb-4">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <h2 className="text-xl font-bold text-white">2. Deadlines & Disconnections</h2>
          </div>
          <p className="text-gray-300">
            Each round has a strict deadline (typically 7 days). Both games must be concluded before the timer expires.
          </p>
          <ul className="mt-4 list-disc pl-5 space-y-2 text-gray-400">
            <li>If the deadline expires and no games were played, the match is Voided (0 points for both).</li>
            <li>If a player disconnects mid-game, a 3-minute grace timer begins.</li>
            <li>If they fail to reconnect in time, the opponent may click a button to claim a forfeit for that specific game.</li>
          </ul>
        </section>

        {/* Section 3 */}
        <section className="rounded-2xl border border-rose-500/10 bg-rose-500/5 p-6 md:p-8">
          <div className="mb-4 flex items-center gap-3 border-b border-rose-500/20 pb-4">
            <Zap className="h-5 w-5 text-rose-400" />
            <h2 className="text-xl font-bold text-white">3. Inactivity Policy</h2>
          </div>
          <p className="text-gray-300">
            A player who fails to complete matches in 2 consecutive rounds is flagged as <strong>INACTIVE</strong>.
          </p>
          <div className="mt-4 rounded-xl border border-gray-800 bg-black/40 p-5">
            <h4 className="font-semibold text-white mb-2">Expunge vs Walkover</h4>
            <p className="text-sm text-gray-400">
              - If the inactive player completed <strong>fewer than 6 matches</strong>, their participation is <em>expunged</em>. All previous match results against them are voided to protect tournament integrity.<br/>
              - If they completed <strong>6 or more matches</strong>, their remaining matches are forfeited. Opponents receive an automatic 2-0 walkover win (3 points).
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
