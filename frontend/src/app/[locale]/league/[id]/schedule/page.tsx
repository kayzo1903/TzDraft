"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { leagueService } from "@/services/league.service";
import { CalendarDays, ArrowLeft, ArrowRight } from "lucide-react";

export default function LeagueSchedulePage() {
  const { id: rawId, locale } = useParams<{ id: string; locale: string }>();
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  const [rounds, setRounds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      leagueService.getSchedule(id)
        .then(setRounds)
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [id]);

  if (loading) {
    return <div className="p-20 text-center"><div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent"/></div>;
  }

  if (rounds.length === 0) {
    return (
      <div className="mx-auto max-w-4xl py-20 text-center">
        <h2 className="text-2xl font-bold text-white">Schedule Not Generated</h2>
        <p className="mt-2 text-gray-400">The league must have 12 players and be started before the schedule is available.</p>
        <Link href={`/${locale}/league/${id}`} className="mt-4 inline-block text-amber-500 hover:text-amber-400">Back to Standings</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <Link href={`/${locale}/league/${id}`} className="mb-6 flex items-center gap-2 text-sm text-gray-400 hover:text-white transition">
        <ArrowLeft className="h-4 w-4" /> Back to Standings
      </Link>

      <div className="mb-8 flex items-center gap-3">
        <div className="rounded-xl border border-sky-500/20 bg-sky-500/10 p-3">
          <CalendarDays className="h-8 w-8 text-sky-400" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-white">League Schedule</h1>
          <p className="text-sm text-gray-400">All 11 rounds of competition</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {rounds.map((round) => (
          <Link
            href={`/${locale}/league/${id}/round/${round.roundNumber}`}
            key={round.id}
            className={`group flex flex-col rounded-2xl border p-5 transition-all hover:scale-[1.02] hover:shadow-xl ${
              round.status === "ACTIVE" 
                ? "border-emerald-500/50 bg-emerald-500/10 hover:border-emerald-400 hover:bg-emerald-500/20"
                : round.status === "COMPLETED"
                ? "border-gray-800 bg-gray-900 hover:border-gray-700"
                : "border-gray-800/50 bg-black/40 hover:border-gray-700"
            }`}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white group-hover:text-amber-400 transition-colors">
                Round {round.roundNumber}
              </h3>
              {round.status === "ACTIVE" && (
                 <span className="rounded-full bg-emerald-500/20 border border-emerald-500/30 px-2.5 py-0.5 text-[10px] font-bold text-emerald-400 tracking-wide uppercase">
                   Active
                 </span>
              )}
            </div>
            <div className="mt-4 flex-1">
              <p className="text-sm text-gray-400">
                Deadline: {new Date(round.deadline).toLocaleDateString()}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                {round.matches?.length || 6} Matches
              </p>
            </div>
            <div className="mt-4 flex items-center justify-between text-sm font-semibold text-gray-400 group-hover:text-white transition-colors">
              <span>View Matches</span>
              <ArrowRight className="h-4 w-4" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
