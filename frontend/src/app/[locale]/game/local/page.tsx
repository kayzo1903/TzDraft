"use client";

import React, { useMemo, useEffect, useState } from "react";
import { useSearchParams, useParams, useRouter } from "next/navigation";
import { Board } from "@/components/game/Board";
import { Button } from "@/components/ui/Button";
import { useLocalGame } from "@/hooks/useLocalGame";
import { getBotByLevel } from "@/lib/game/bots";
import { useAuthStore } from "@/lib/auth/auth-store";
import { PlayerColor } from "@tzdraft/cake-engine";

const parseColor = (value: string | null): PlayerColor => {
  if (!value) return PlayerColor.WHITE;
  const upper = value.toUpperCase();
  if (upper === "BLACK") return PlayerColor.BLACK;
  if (upper === "WHITE") return PlayerColor.WHITE;
  if (upper === "RANDOM") {
    return Math.random() < 0.5 ? PlayerColor.WHITE : PlayerColor.BLACK;
  }
  return PlayerColor.WHITE;
};

const parseLevel = (value: string | null): number => {
  const parsed = Number(value);
  if (Number.isNaN(parsed)) return 1;
  return Math.min(Math.max(parsed, 1), 7);
};

const parseTime = (value: string | null): number => {
  const parsed = Number(value);
  if (Number.isNaN(parsed)) return 10 * 60;
  if (parsed === 0) return 0;
  return Math.max(parsed, 60);
};

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs
    .toString()
    .padStart(2, "0")}`;
};

export default function LocalGamePage() {
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const paramsRoute = useParams<{ locale: string }>();
  const params = useSearchParams();
  const level = useMemo(() => parseLevel(params.get("level")), [params]);
  const playerColorParam = useMemo(() => params.get("color"), [params]);
  const playerColor = useMemo(() => parseColor(playerColorParam), [playerColorParam]);
  const timeSeconds = useMemo(() => parseTime(params.get("time")), [params]);
  const bot = useMemo(() => getBotByLevel(level), [level]);
  const { user } = useAuthStore();

  const { state, pieces, legalMoves, forcedPieces, playWarning, undo, resign, makeMove, reset } = useLocalGame(
    level,
    playerColor,
    timeSeconds,
  );
  const [showResign, setShowResign] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4 text-neutral-300">
        Loading game...
      </main>
    );
  }

  const userLabel = user?.username || "You";
  const playerIsWhite = playerColor === PlayerColor.WHITE;
  const topPlayer = playerIsWhite ? bot : { name: userLabel, rating: 1200 };
  const bottomPlayer = playerIsWhite ? { name: userLabel, rating: 1200 } : bot;
  const locale = paramsRoute?.locale ?? "en";
  const setupAiPath = `/${locale}/game/setup-ai`;

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 gap-8">
      <div className="w-full max-w-4xl flex items-center justify-between bg-neutral-800 p-4 rounded-xl shadow-lg border border-neutral-700">
        <div className="flex items-center gap-4">
          <div className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-orange-400 to-yellow-200">
            Local Game
          </div>
          <div className="h-6 w-px bg-neutral-600"></div>
          <div className="text-neutral-400 text-sm">
            AI Level:{" "}
            <span className="font-mono text-neutral-200">{level}</span>
          </div>
        </div>
        <div className="flex items-center gap-3 text-sm text-neutral-300">
          {state.isAiThinking ? "AI thinking..." : "Your move"}
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-8 w-full max-w-6xl items-start justify-center">
        <div className="hidden md:flex flex-col gap-4 w-64 bg-neutral-800/50 p-4 rounded-xl border border-neutral-700/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-neutral-600 flex items-center justify-center text-sm font-bold text-neutral-100">
              {"avatar" in topPlayer ? topPlayer.avatar : "AI"}
            </div>
            <div>
              <div className="font-bold text-neutral-200">{topPlayer.name}</div>
              <div className="text-xs text-neutral-500">
                {"rating" in topPlayer ? topPlayer.rating : bot.elo}
              </div>
            </div>
          </div>
          <div className="bg-neutral-900 rounded p-2 text-center font-mono text-xl text-neutral-400">
            {formatTime(state.timeLeft.WHITE)}
          </div>
        </div>

        <div className="flex-1 max-w-[650px]">
          <Board
            onMove={makeMove}
            pieces={pieces}
            legalMoves={legalMoves}
            forcedPieces={forcedPieces}
            onInvalidSelect={playWarning}
            readOnly={state.isAiThinking}
          />
          {state.result && (
            <div className="mt-4 text-center text-lg font-semibold text-orange-300">
              Winner: {state.result.winner}
            </div>
          )}
        </div>

        <div className="hidden md:flex flex-col gap-4 w-64 bg-neutral-800/50 p-4 rounded-xl border border-neutral-700/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center text-sm font-bold text-white">
              {"avatar" in bottomPlayer ? bottomPlayer.avatar : "YOU"}
            </div>
            <div>
              <div className="font-bold text-neutral-200">
                {bottomPlayer.name}
              </div>
              <div className="text-xs text-neutral-500">
                {"rating" in bottomPlayer ? bottomPlayer.rating : bot.elo}
              </div>
            </div>
          </div>
          <div className="bg-neutral-800 rounded p-2 text-center font-mono text-xl text-white border border-neutral-600">
            {formatTime(state.timeLeft.BLACK)}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Button variant="secondary" onClick={undo}>
          Undo
        </Button>
        <Button variant="secondary" onClick={() => setShowResign(true)}>
          Resign
        </Button>
        <Button variant="secondary" onClick={reset}>
          Reset Game
        </Button>
      </div>

      {showResign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm mx-4 rounded-2xl border border-neutral-700 bg-neutral-900 shadow-2xl">
            <div className="p-6 border-b border-neutral-800">
              <div className="text-sm uppercase tracking-[0.2em] text-neutral-500">
                Confirm Resign
              </div>
              <div className="mt-2 text-xl font-bold text-neutral-100">
                Are you sure you want to resign?
              </div>
            </div>
            <div className="p-6 flex flex-col gap-3">
              <Button
                onClick={() => {
                  setShowResign(false);
                  resign();
                }}
              >
                Yes, Resign
              </Button>
              <Button variant="secondary" onClick={() => setShowResign(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {state.result && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md mx-4 rounded-2xl border border-neutral-700 bg-neutral-900 shadow-2xl">
            <div className="p-6 border-b border-neutral-800">
              <div className="text-sm uppercase tracking-[0.2em] text-neutral-500">
                Game Over
              </div>
              <div className="mt-2 text-3xl font-black text-neutral-100">
                {user?.username ? `Congratulations, ${user.username}!` : "Congratulations!"}
              </div>
              <div className="mt-2 text-neutral-400">
                Winner:{" "}
                <span className="font-semibold text-orange-300">
                  {state.result.winner}
                </span>
              </div>
            </div>
            <div className="p-6 flex flex-col gap-3">
              <Button onClick={reset}>Play Again</Button>
              <Button variant="secondary" onClick={() => router.push(setupAiPath)}>
                End Game
              </Button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
