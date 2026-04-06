"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Clock, AlertTriangle } from "lucide-react";
import { leagueService, LeagueRound, LeagueMatch } from "@/services/league.service";

function MatchStatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    IN_PROGRESS: "text-amber-400",
    COMPLETED: "text-emerald-400",
    FORFEITED: "text-red-400",
    VOIDED: "text-gray-600",
    SCHEDULED: "text-gray-500",
  };
  return (
    <span className={`text-xs font-bold uppercase tracking-wider ${colors[status] ?? "text-gray-500"}`}>
      {status.replace("_", " ")}
    </span>
  );
}

function MatchScore({ match }: { match: LeagueMatch }) {
  const p1 = match.player1Goals;
  const p2 = match.player2Goals;
  if (match.status === "SCHEDULED") return <span className="font-mono font-bold text-gray-500">vs</span>;
  return (
    <span className={`font-mono font-bold ${
      match.status === "COMPLETED" || match.status === "FORFEITED"
        ? "text-white"
        : "text-amber-400"
    }`}>
      {p1} – {p2}
    </span>
  );
}

export default function LeagueRoundPage() {
  const { id: rawId, n: rawN, locale } = useParams<{ id: string; n: string; locale: string }>();
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  const n = Array.isArray(rawN) ? rawN[0] : rawN;

  const [round, setRound] = useState<LeagueRound | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id || !n) return;
    leagueService
      .getRound(id, parseInt(n, 10))
      .then(setRound)
      .catch((e) => setError(e?.response?.data?.message ?? "Failed to load round"))
      .finally(() => setLoading(false));
  }, [id, n]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
      </div>
    );
  }

  if (error || !round) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="flex items-center gap-2 rounded-xl border border-red-800 bg-red-900/20 p-4 text-red-400">
          <AlertTriangle className="h-5 w-5" />
          <span>{error ?? "Round not found"}</span>
        </div>
      </div>
    );
  }

  const deadline = round.deadline ? new Date(round.deadline) : null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href={`/${locale}/league/${id}/schedule`}
        className="mb-6 flex items-center gap-2 text-sm text-gray-400 hover:text-white transition"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Schedule
      </Link>

      <div className="mb-8 flex items-center justify-between border-b border-gray-800 pb-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Round {round.roundNumber}</h1>
          {deadline && (
            <p className="mt-1 flex items-center gap-2 text-sm text-gray-400">
              <Clock className="h-4 w-4" />
              Deadline: {deadline.toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </p>
          )}
        </div>
        <span className={`rounded-full px-4 py-1 text-xs font-bold uppercase tracking-widest ${
          round.status === "ACTIVE" ? "bg-amber-500/20 text-amber-400" :
          round.status === "COMPLETED" ? "bg-emerald-500/20 text-emerald-400" :
          "bg-gray-800 text-gray-500"
        }`}>
          {round.status}
        </span>
      </div>

      {round.matches.length === 0 ? (
        <p className="text-center text-gray-500">No matches in this round yet.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {round.matches.map((m) => (
            <Link
              key={m.id}
              href={`/${locale}/league/${id}/matches/${m.id}`}
              className="group flex flex-col justify-center rounded-2xl border border-gray-800 bg-gray-900 p-5 transition-all hover:border-gray-700 hover:bg-gray-800/50"
            >
              <div className="mb-3 text-center">
                <MatchStatusBadge status={m.status} />
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="truncate font-semibold text-white text-sm">{m.player1Id.slice(0, 8)}</span>
                <div className="flex flex-col items-center gap-1">
                  <MatchScore match={m} />
                  <span className="text-xs text-gray-600">
                    {m.games.length}/2 games
                  </span>
                </div>
                <span className="truncate font-semibold text-white text-sm text-right">{m.player2Id.slice(0, 8)}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
