"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { leagueService, LeagueParticipant } from "@/services/league.service";
import { Copy, Users, Trophy } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export default function LeagueStandingsPage() {
  const { id: rawId, locale } = useParams<{ id: string; locale: string }>();
  // We handle potential array param from next.js catchalls, just in case
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  const { user } = useAuth();

  const [standings, setStandings] = useState<LeagueParticipant[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (id) {
      leagueService.getStandings(id)
        .then(setStandings)
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [id]);

  const copyId = () => {
    navigator.clipboard.writeText(id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleJoin = async () => {
    try {
      setLoading(true);
      await leagueService.joinLeague(id);
      // Wait a moment and refresh
      setStandings(await leagueService.getStandings(id));
      alert("Successfully joined the league!");
    } catch (e: any) {
      alert(e.message || "Could not join league.");
    } finally {
      setLoading(false);
    }
  };

  const handleStart = async () => {
    try {
      setLoading(true);
      await leagueService.startLeague(id);
      alert("League scheduled and started!");
      // Could redirect to schedule here
    } catch (e: any) {
      alert(e.message || "Could not start league.");
    } finally {
      setLoading(false);
    }
  };

  if (loading && standings.length === 0) {
    return (
      <div className="flex justify-center p-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8 rounded-2xl border border-gray-800 bg-gray-900/50 p-6 backdrop-blur-xl">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <Trophy className="h-8 w-8 text-amber-500" />
              <h1 className="text-3xl font-bold text-white">League Standings</h1>
            </div>
            <div className="mt-2 flex items-center gap-4 text-sm text-gray-400">
              <div className="flex items-center gap-1.5">
                <Users className="h-4 w-4" />
                {standings.length} / 12 Players
              </div>
              <span>&bull;</span>
              <button onClick={copyId} className="flex items-center gap-1.5 hover:text-white transition">
                <Copy className="h-4 w-4" />
                ID: {id.slice(0, 8)}... {copied && <span className="text-emerald-400">Copied!</span>}
              </button>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href={`/${locale}/league/${id}/schedule`}
              className="rounded-xl border border-gray-700 bg-gray-800 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-700"
            >
              View Schedule
            </Link>
            {user && standings.length < 12 && !standings.find(s => s.userId === user.id) && (
              <button
                onClick={handleJoin}
                disabled={loading}
                className="rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-gray-950 transition hover:bg-amber-400 disabled:opacity-50"
              >
                Join League
              </button>
            )}
            {user?.role === "ADMIN" && standings.length === 12 && (
              <button
                onClick={handleStart}
                disabled={loading}
                className="rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-400 disabled:opacity-50"
              >
                Start League
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Standings Table */}
      <div className="overflow-hidden rounded-2xl border border-gray-800 bg-gray-900 shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="border-b border-gray-800 bg-black/40">
              <tr className="text-gray-400">
                <th className="px-6 py-4 font-semibold w-16">Pos</th>
                <th className="px-6 py-4 font-semibold">Player</th>
                <th className="px-4 py-4 font-semibold text-center" title="Matches Played">P</th>
                <th className="px-4 py-4 font-semibold text-center text-emerald-400" title="Wins">W</th>
                <th className="px-4 py-4 font-semibold text-center text-gray-400" title="Draws">D</th>
                <th className="px-4 py-4 font-semibold text-center text-rose-400" title="Losses">L</th>
                <th className="px-4 py-4 font-semibold text-center" title="Goals For">GF</th>
                <th className="px-4 py-4 font-semibold text-center" title="Goals Against">GA</th>
                <th className="px-4 py-4 font-semibold text-center" title="Goal Difference">GD</th>
                <th className="px-6 py-4 font-bold text-white text-center" title="Points">Pts</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/50">
              {standings.map((p, i) => (
                <tr
                  key={p.id}
                  className={`transition-colors hover:bg-gray-800/50 ${user?.id === p.userId ? 'bg-amber-500/5' : ''}`}
                >
                  <td className="px-6 py-4">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                      i === 0 ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                      i === 1 ? 'bg-gray-400/20 text-gray-300 border border-gray-400/30' :
                      i === 2 ? 'bg-orange-800/20 text-orange-400 border border-orange-800/30' :
                      'text-gray-500'
                    }`}>
                      {i + 1}
                    </div>
                  </td>
                  <td className="px-6 py-4 font-medium text-white">
                    <div className="flex flex-col">
                      <span>{p.user?.username || "Unknown"}</span>
                      <span className="text-xs text-gray-500">Rating: {p.user?.rating || 1200}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-center text-gray-400">{p.matchesPlayed}</td>
                  <td className="px-4 py-4 text-center text-emerald-400 font-medium">{p.matchWins}</td>
                  <td className="px-4 py-4 text-center text-gray-500">{p.matchDraws}</td>
                  <td className="px-4 py-4 text-center text-rose-400">{p.matchLosses}</td>
                  <td className="px-4 py-4 text-center text-gray-300">{p.goalsFor}</td>
                  <td className="px-4 py-4 text-center text-gray-300">{p.goalsAgainst}</td>
                  <td className="px-4 py-4 text-center font-medium text-gray-300">
                    {p.goalDifference > 0 ? `+${p.goalDifference}` : p.goalDifference}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="inline-flex min-w-[3rem] items-center justify-center rounded-lg bg-gray-800 py-1.5 font-bold text-white shadow-inner">
                      {p.matchPoints}
                    </span>
                  </td>
                </tr>
              ))}
              {standings.length === 0 && !loading && (
                <tr>
                  <td colSpan={10} className="px-6 py-12 text-center text-gray-500">
                    No participants yet. Be the first to join!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
