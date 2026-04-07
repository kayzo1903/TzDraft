"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { leagueService, LeagueMatch, LeagueGame } from "@/services/league.service";
import { ArrowLeft, Play, Clock, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

function GameResultBadge({ result }: { result: string }) {
  const map: Record<string, { label: string; color: string }> = {
    WHITE_WIN: { label: "White Won", color: "text-white" },
    BLACK_WIN: { label: "Black Won", color: "text-gray-900 bg-gray-300" },
    DRAW: { label: "Draw", color: "text-amber-400" },
    PENDING: { label: "Pending", color: "text-gray-500" },
  };
  const { label, color } = map[result] ?? { label: result, color: "text-gray-500" };
  return <span className={`text-xs font-bold ${color}`}>{label}</span>;
}

function GameStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    PENDING: "text-gray-500 bg-gray-800",
    IN_PROGRESS: "text-amber-400 bg-amber-500/10",
    COMPLETED: "text-emerald-400 bg-emerald-500/10",
    FORFEITED: "text-red-400 bg-red-500/10",
  };
  return (
    <span className={`rounded px-2 py-1 text-xs font-semibold ${map[status] ?? "text-gray-500 bg-gray-800"}`}>
      {status.replace("_", " ")}
    </span>
  );
}

export default function MatchDetailPage() {
  const { id: rawId, matchId: rawMatchId, locale } = useParams<{ id: string; matchId: string; locale: string }>();
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  const matchId = Array.isArray(rawMatchId) ? rawMatchId[0] : rawMatchId;
  const router = useRouter();
  const { user } = useAuth();

  const [match, setMatch] = useState<LeagueMatch | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [forfeiting, setForfeiting] = useState(false);

  const fetchMatch = useCallback(() => {
    if (!id || !matchId) return;
    leagueService
      .getMatch(id, matchId)
      .then(setMatch)
      .catch((e) => setError(e?.response?.data?.message ?? "Failed to load match"))
      .finally(() => setLoading(false));
  }, [id, matchId]);

  useEffect(() => { fetchMatch(); }, [fetchMatch]);

  const isParticipant = match
    ? (match.player1Id === user?.id || match.player2Id === user?.id)
    : false;

  const game1 = match?.games.find((g) => g.gameNumber === 1);
  const game2 = match?.games.find((g) => g.gameNumber === 2);

  const canStartGame1 = isParticipant && !game1 && match?.status === "SCHEDULED";
  const canStartGame2 = isParticipant && game1?.status === "COMPLETED" && !game2;

  const deadlineExpired = match?.deadline
    ? new Date(match.deadline) < new Date()
    : false;

  const handleStartGame = async (gameNumber: 1 | 2) => {
    if (!match) return;
    setStarting(true);
    try {
      const leagueGame = await leagueService.startGame(id, matchId, gameNumber);
      // Navigate to the actual game board
      router.push(`/${locale}/game/${leagueGame.id}`);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? "Failed to start game");
      setStarting(false);
    }
  };

  const handleClaimForfeit = async () => {
    if (!match) return;
    setForfeiting(true);
    try {
      await leagueService.claimForfeit(id, matchId);
      fetchMatch(); // Refresh
    } catch (e: any) {
      setError(e?.response?.data?.message ?? "Failed to claim forfeit");
    } finally {
      setForfeiting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
      </div>
    );
  }

  if (error && !match) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="flex items-center gap-2 rounded-xl border border-red-800 bg-red-900/20 p-4 text-red-400">
          <AlertTriangle className="h-5 w-5" />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  if (!match) return null;

  const deadline = match.deadline ? new Date(match.deadline) : null;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href={`/${locale}/league/${id}/schedule`}
        className="mb-6 flex items-center gap-2 text-sm text-gray-400 hover:text-white transition"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Schedule
      </Link>

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-800 bg-red-900/20 p-3 text-sm text-red-400">
          <AlertTriangle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}

      <div className="overflow-hidden rounded-3xl border border-gray-800 bg-gray-900 shadow-2xl">
        {/* Score Banner */}
        <div className="bg-black/50 px-8 py-6 text-center border-b border-gray-800">
          <div className="mb-2 flex items-center justify-center gap-2">
            <span className={`rounded-full px-3 py-0.5 text-xs font-bold uppercase tracking-wider ${
              match.status === "COMPLETED" ? "bg-emerald-500/20 text-emerald-400" :
              match.status === "IN_PROGRESS" ? "bg-amber-500/20 text-amber-400" :
              match.status === "FORFEITED" ? "bg-red-500/20 text-red-400" :
              match.status === "VOIDED" ? "bg-gray-800 text-gray-600" :
              "bg-gray-800 text-gray-500"
            }`}>
              {match.status.replace("_", " ")}
            </span>
          </div>

          <div className="mt-4 flex items-center justify-center gap-8">
            <div className="flex flex-col items-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-800 border-2 border-gray-700 text-xl font-bold text-white shadow-inner">
                P1
              </div>
              <span className="mt-3 max-w-25 truncate font-semibold text-white text-sm">
                {match.player1Id.slice(0, 8)}
              </span>
            </div>

            <div className="flex flex-col items-center">
              <span className="text-4xl font-extrabold text-amber-500">
                {match.player1Goals} – {match.player2Goals}
              </span>
              {deadline && (
                <p className="mt-2 flex items-center gap-1 text-xs text-gray-500">
                  <Clock className="h-3 w-3" />
                  {deadlineExpired ? "Deadline passed" : `Due ${deadline.toLocaleDateString()}`}
                </p>
              )}
            </div>

            <div className="flex flex-col items-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-800 border-2 border-gray-700 text-xl font-bold text-white shadow-inner">
                P2
              </div>
              <span className="mt-3 max-w-25 truncate font-semibold text-white text-sm">
                {match.player2Id.slice(0, 8)}
              </span>
            </div>
          </div>
        </div>

        {/* Action Area */}
        <div className="px-8 py-8 md:px-12 bg-gray-900/50">
          {/* Start buttons (only for participants in active match) */}
          {isParticipant && match.status !== "COMPLETED" && match.status !== "FORFEITED" && match.status !== "VOIDED" && (
            <div className="mb-6 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-6 text-center">
              <h3 className="text-lg font-semibold text-amber-500">
                {canStartGame1 ? "Ready to play?" : canStartGame2 ? "Game 1 complete — start Game 2" : "Waiting for game to start"}
              </h3>
              {canStartGame1 && (
                <button
                  onClick={() => handleStartGame(1)}
                  disabled={starting}
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-amber-500 px-6 py-3 text-sm font-bold text-gray-950 transition hover:bg-amber-400 disabled:opacity-50"
                >
                  <Play className="h-4 w-4" />
                  {starting ? "Starting…" : "Start Game 1"}
                </button>
              )}
              {canStartGame2 && (
                <button
                  onClick={() => handleStartGame(2)}
                  disabled={starting}
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-amber-500 px-6 py-3 text-sm font-bold text-gray-950 transition hover:bg-amber-400 disabled:opacity-50"
                >
                  <Play className="h-4 w-4" />
                  {starting ? "Starting…" : "Start Game 2"}
                </button>
              )}
              {deadlineExpired && isParticipant && (
                <button
                  onClick={handleClaimForfeit}
                  disabled={forfeiting}
                  className="ml-3 mt-5 inline-flex items-center gap-2 rounded-xl border border-red-600 px-6 py-3 text-sm font-bold text-red-400 transition hover:bg-red-900/20 disabled:opacity-50"
                >
                  <XCircle className="h-4 w-4" />
                  {forfeiting ? "Claiming…" : "Claim Forfeit"}
                </button>
              )}
            </div>
          )}

          {/* Games list */}
          <div>
            <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">
              Games
            </h4>
            <div className="space-y-3">
              {[1, 2].map((gNum) => {
                const game = gNum === 1 ? game1 : game2;
                const whiteIs1 = gNum === 1; // Game 1: P1=White; Game 2: P2=White
                return (
                  <div
                    key={gNum}
                    className={`flex items-center justify-between rounded-xl border p-4 ${
                      !game ? "border-gray-800 bg-black/40 opacity-50" : "border-gray-700 bg-black/40"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-white">Game {gNum}</span>
                      <span className="text-xs text-gray-500">
                        P{whiteIs1 ? 1 : 2}=White · P{whiteIs1 ? 2 : 1}=Black
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      {game ? (
                        <>
                          <GameResultBadge result={game.result} />
                          <GameStatusBadge status={game.status} />
                          {game.status === "COMPLETED" && (
                            <CheckCircle className="h-4 w-4 text-emerald-400" />
                          )}
                        </>
                      ) : (
                        <GameStatusBadge status="PENDING" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
