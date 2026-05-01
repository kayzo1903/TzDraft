"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useRouter } from "@/i18n/routing";
import { Board } from "@/components/game/Board";
import { useSpectatorGame } from "@/hooks/useSpectatorGame";
import { useSocket } from "@/hooks/useSocket";
import { ConnectionStatus } from "@/components/game/ConnectionStatus";
import { PlayerColor, Winner } from "@tzdraft/mkaguzi-engine";
import {
  ArrowLeft,
  Crown,
  Handshake,
  Loader2,
  Radio,
  Skull,
  User,
  X,
} from "lucide-react";
import clsx from "clsx";

/* ─── Helpers ───────────────────────────────────────────────────────────── */

const formatTimeMs = (ms: number): string => {
  if (ms < 0) ms = 0;
  if (ms < 10_000) {
    const tenths = Math.floor(ms / 100);
    return `${Math.floor(tenths / 10)}.${tenths % 10}`;
  }
  const totalSecs = Math.ceil(ms / 1000);
  const mins = Math.floor(totalSecs / 60);
  const secs = totalSecs % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
};

/* ─── Player Panel ──────────────────────────────────────────────────────── */

function PlayerPanel({
  name,
  rating,
  isActive,
  timeMs,
  compact,
}: {
  name: string;
  rating: number;
  isActive: boolean;
  timeMs: number | null;
  compact?: boolean;
}) {
  const size = compact ? "w-8 h-8" : "w-10 h-10";
  return (
    <div className="flex items-center gap-3 min-w-0">
      <div
        className={clsx(
          size,
          "rounded-full flex items-center justify-center shrink-0",
          isActive ? "bg-orange-500 ring-2 ring-orange-500/50" : "bg-neutral-600",
        )}
      >
        <User className={clsx(compact ? "w-4 h-4" : "w-5 h-5", "text-white")} />
      </div>
      <div className="min-w-0">
        <div className="font-semibold text-neutral-200 truncate">{name}</div>
        <div className="text-xs text-neutral-500">{rating}</div>
      </div>
    </div>
  );
}

/* ─── Result Banner ─────────────────────────────────────────────────────── */

function ResultBanner({
  winner,
  reason,
  whiteName,
  blackName,
}: {
  winner: Winner | null;
  reason?: string;
  whiteName: string;
  blackName: string;
}) {
  if (winner === null || reason === "aborted") {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-neutral-600/60 bg-neutral-800/80 px-4 py-3 text-sm text-neutral-300">
        <X className="w-4 h-4 text-neutral-400" />
        Game aborted
      </div>
    );
  }
  if (winner === Winner.DRAW) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-sky-500/30 bg-sky-500/10 px-4 py-3 text-sm text-sky-300">
        <Handshake className="w-4 h-4" />
        Draw
        {reason && ` — ${reason.replace(/-/g, " ")}`}
      </div>
    );
  }
  const winnerName = winner === Winner.WHITE ? whiteName : blackName;
  return (
    <div className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
      <Crown className="w-4 h-4" />
      {winnerName} wins
      {reason ? ` by ${reason.replace(/-/g, " ")}` : ""}
    </div>
  );
}

/* ─── Page ──────────────────────────────────────────────────────────────── */

export default function SpectatorPage() {
  const { gameId } = useParams<{ gameId: string }>();
  const router = useRouter();
  const { connected, reconnecting } = useSocket();
  const [mounted, setMounted] = useState(false);

  const { state, pieces, lastMove, capturedGhosts, flipBoard } =
    useSpectatorGame(gameId);

  useEffect(() => {
    setMounted(true);
    document.documentElement.style.overflowY = "hidden";
    document.body.style.overflowY = "hidden";
    return () => {
      document.documentElement.style.overflowY = "";
      document.body.style.overflowY = "";
    };
  }, []);

  if (!mounted) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
      </main>
    );
  }

  const game = state.gameData;
  const whiteName =
    (state.players.white as any)?.displayName ||
    (state.players.white as any)?.username ||
    "White";
  const blackName =
    (state.players.black as any)?.displayName ||
    (state.players.black as any)?.username ||
    "Black";
  const whiteRating = (state.players.white as any)?.rating?.rating ?? 1200;
  const blackRating = (state.players.black as any)?.rating?.rating ?? 1200;

  const isLowTime = (color: PlayerColor): boolean => {
    if (!state.timeLeft) return false;
    const ms = color === PlayerColor.WHITE ? state.timeLeft.WHITE : state.timeLeft.BLACK;
    return ms != null && ms < 10_000;
  };

  const timeFor = (color: PlayerColor): string => {
    if (!state.timeLeft) return "–";
    const ms = color === PlayerColor.WHITE ? state.timeLeft.WHITE : state.timeLeft.BLACK;
    return ms != null ? formatTimeMs(ms) : "–";
  };

  return (
    <main className="min-h-[100svh] overflow-hidden overscroll-none flex flex-col items-center justify-start px-3 py-3 sm:p-4 gap-4 sm:gap-8">
      <ConnectionStatus connected={connected} reconnecting={reconnecting} />

      {/* Top bar */}
      <div className="w-full max-w-6xl flex items-center justify-between gap-3">
        <button
          onClick={() => router.push("/watch")}
          className="flex items-center gap-1.5 text-sm text-neutral-400 hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Watch Lobby
        </button>
        <div className="flex items-center gap-1.5 text-xs text-neutral-500">
          <Radio className="w-3.5 h-3.5 text-emerald-400" />
          {state.isActive ? (
            <span className="text-emerald-400 font-semibold">LIVE</span>
          ) : state.result ? (
            <span>Game over</span>
          ) : (
            <span>Loading…</span>
          )}
          <span className="text-neutral-600">·</span>
          <span>{state.moveCount} moves</span>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 sm:gap-8 w-full max-w-6xl items-stretch md:items-start justify-center">
        {/* Desktop left sidebar — top player */}
        <div className="hidden md:flex flex-col gap-4 w-64 bg-neutral-800/50 p-4 rounded-xl border border-neutral-700/50">
          <PlayerPanel
            name={blackName}
            rating={blackRating}
            isActive={state.currentPlayer === PlayerColor.BLACK && state.isActive}
            timeMs={state.timeLeft?.BLACK ?? null}
          />
          <div
            className={clsx(
              "bg-neutral-900 rounded p-2 text-center font-mono border transition-colors",
              isLowTime(PlayerColor.BLACK)
                ? "text-red-400 border-red-500/40 animate-pulse text-2xl"
                : "text-xl text-neutral-400 border-transparent",
            )}
          >
            {timeFor(PlayerColor.BLACK)}
          </div>
        </div>

        {/* Board column */}
        <div className="flex-1 max-w-[650px] w-full mx-auto">
          {/* Mobile top bar — black player (top of board) */}
          <div className="md:hidden mb-2 rounded-xl border border-neutral-700/50 bg-neutral-900/40 backdrop-blur px-3 py-2 flex items-center justify-between gap-3">
            <PlayerPanel
              name={blackName}
              rating={blackRating}
              isActive={state.currentPlayer === PlayerColor.BLACK && state.isActive}
              timeMs={state.timeLeft?.BLACK ?? null}
              compact
            />
            <div
              className={clsx(
                "shrink-0 rounded-md px-2 py-1 text-center font-mono border transition-colors",
                isLowTime(PlayerColor.BLACK)
                  ? "bg-red-950/60 text-red-400 border-red-500/40 animate-pulse text-base"
                  : "bg-neutral-950/60 text-neutral-100 border-neutral-700/60 text-base",
              )}
            >
              {timeFor(PlayerColor.BLACK)}
            </div>
          </div>

          <Board
            onMove={() => {}}
            onInvalidSelect={() => {}}
            pieces={pieces}
            lastMove={lastMove}
            capturedGhosts={capturedGhosts}
            legalMoves={{}}
            forcedPieces={[]}
            flipped={flipBoard}
            readOnly
          />

          {/* Mobile bottom bar — white player */}
          <div className="md:hidden mt-2 rounded-xl border border-neutral-700/50 bg-neutral-900/40 backdrop-blur px-3 py-2 flex items-center justify-between gap-3">
            <PlayerPanel
              name={whiteName}
              rating={whiteRating}
              isActive={state.currentPlayer === PlayerColor.WHITE && state.isActive}
              timeMs={state.timeLeft?.WHITE ?? null}
              compact
            />
            <div
              className={clsx(
                "shrink-0 rounded-md px-2 py-1 text-center font-mono border transition-colors",
                isLowTime(PlayerColor.WHITE)
                  ? "bg-red-950/60 text-red-400 border-red-500/40 animate-pulse text-base"
                  : "bg-neutral-950/60 text-neutral-100 border-neutral-700/60 text-base",
              )}
            >
              {timeFor(PlayerColor.WHITE)}
            </div>
          </div>

          {/* Result banner */}
          {state.result && (
            <div className="mt-3">
              <ResultBanner
                winner={state.result.winner}
                reason={state.result.reason}
                whiteName={whiteName}
                blackName={blackName}
              />
            </div>
          )}

          {/* Spectator notice */}
          {!state.result && (
            <div className="mt-3 text-center text-xs text-neutral-600">
              You are spectating · board updates live
            </div>
          )}
        </div>

        {/* Desktop right sidebar — white player */}
        <div className="hidden md:flex flex-col gap-4 w-64 bg-neutral-800/50 p-4 rounded-xl border border-neutral-700/50">
          <PlayerPanel
            name={whiteName}
            rating={whiteRating}
            isActive={state.currentPlayer === PlayerColor.WHITE && state.isActive}
            timeMs={state.timeLeft?.WHITE ?? null}
          />
          <div
            className={clsx(
              "rounded p-2 text-center font-mono border transition-colors",
              isLowTime(PlayerColor.WHITE)
                ? "bg-red-950/60 text-red-400 border-red-500/40 animate-pulse text-2xl"
                : "bg-neutral-800 text-white border-neutral-600 text-xl",
            )}
          >
            {timeFor(PlayerColor.WHITE)}
          </div>

          {state.result && (
            <ResultBanner
              winner={state.result.winner}
              reason={state.result.reason}
              whiteName={whiteName}
              blackName={blackName}
            />
          )}

          {!state.result && state.isActive && (
            <div className="rounded-xl border border-neutral-700/60 bg-neutral-900/60 px-3 py-2 text-center text-xs text-neutral-500">
              <Radio className="inline w-3 h-3 text-emerald-400 mr-1" />
              Spectating live
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
