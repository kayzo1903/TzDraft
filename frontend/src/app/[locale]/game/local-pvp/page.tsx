"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams, useParams, useRouter } from "next/navigation";
import { Board } from "@/components/game/Board";
import { Button } from "@/components/ui/Button";
import { useLocalPvpGame } from "@/hooks/useLocalPvpGame";
import { PlayerColor, Winner } from "@tzdraft/cake-engine";
import {
  AlertTriangle,
  Crown,
  Handshake,
  RotateCcw,
  Skull,
  Users,
} from "lucide-react";
import clsx from "clsx";

/* ─── Helpers ───────────────────────────────────────────────────────────── */

const parseColor = (value: string | null): PlayerColor => {
  if (!value) return PlayerColor.WHITE;
  const upper = value.toUpperCase();
  if (upper === "BLACK") return PlayerColor.BLACK;
  if (upper === "RANDOM") return Math.random() < 0.5 ? PlayerColor.WHITE : PlayerColor.BLACK;
  return PlayerColor.WHITE;
};

const parseTime = (value: string | null): number => {
  const parsed = Number(value);
  if (Number.isNaN(parsed)) return 0;
  if (parsed === 0) return 0;
  return Math.max(parsed, 60);
};

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
};

/* ─── Pass Device Overlay ───────────────────────────────────────────────── */

function PassDeviceOverlay({
  playerName,
  onReady,
}: {
  playerName: string;
  onReady: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/95 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-neutral-700/60 bg-neutral-900 shadow-2xl overflow-hidden">
        <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-orange-500 to-transparent" />
        <div className="flex flex-col items-center px-6 pt-8 pb-6 gap-5">
          <div className="w-16 h-16 rounded-full bg-orange-500/15 border border-orange-500/30 flex items-center justify-center">
            <Users className="w-8 h-8 text-orange-400" />
          </div>
          <div className="text-center">
            <div className="text-xs uppercase tracking-[0.25em] text-orange-400/80 font-semibold mb-2">
              Pass the device
            </div>
            <h2 className="text-xl font-black text-white">
              {playerName}&apos;s turn
            </h2>
            <p className="text-sm text-neutral-400 mt-1">
              Hand the device to {playerName} before tapping ready.
            </p>
          </div>
          <button
            type="button"
            onClick={onReady}
            className="w-full rounded-xl border border-orange-600 bg-orange-700/80 hover:bg-orange-600 px-4 py-3 text-sm font-bold text-white transition"
          >
            I&apos;m ready
          </button>
        </div>
        <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-orange-500/40 to-transparent" />
      </div>
    </div>
  );
}

/* ─── Resign Card ───────────────────────────────────────────────────────── */

function ResignCard({
  playerName,
  onConfirm,
  onCancel,
}: {
  playerName: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm animate-result-enter rounded-2xl overflow-hidden border border-neutral-700/80 bg-neutral-900 shadow-2xl">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-neutral-800 bg-orange-500/8">
          <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-orange-500/15 border border-orange-500/30">
            <AlertTriangle className="w-5 h-5 text-orange-400" />
          </div>
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-orange-400/80 font-semibold">
              Confirm Resign
            </div>
            <div className="text-base font-bold text-neutral-100 mt-0.5">
              Are you sure?
            </div>
          </div>
        </div>
        <div className="px-5 py-4 text-sm text-neutral-400">
          <span className="font-semibold text-neutral-200">{playerName}</span> will forfeit the game.
        </div>
        <div className="px-5 pb-5 flex flex-col gap-2">
          <Button onClick={onConfirm} className="w-full bg-rose-600 hover:bg-rose-500 border-rose-700">
            Yes, resign
          </Button>
          <Button variant="secondary" onClick={onCancel} className="w-full">
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ─── Game Result Card ──────────────────────────────────────────────────── */

function PvpResultCard({
  winner,
  player1Color,
  moveCount,
  onPlayAgain,
  onSetupFriend,
}: {
  winner: Winner;
  player1Color: PlayerColor;
  moveCount: number;
  onPlayAgain: () => void;
  onSetupFriend: () => void;
}) {
  const isDraw = winner === Winner.DRAW;
  const winnerIsP1 =
    !isDraw &&
    ((winner === Winner.WHITE && player1Color === PlayerColor.WHITE) ||
      (winner === Winner.BLACK && player1Color === PlayerColor.BLACK));
  const winnerName = isDraw ? null : winnerIsP1 ? "Player 1" : "Player 2";

  const cfg = isDraw
    ? {
        label: "Draw",
        sub: "The game ended in a draw",
        icon: <Handshake className="w-8 h-8" />,
        borderColor: "border-sky-500/30",
        iconBg: "bg-sky-500/15 border-sky-500/30",
        iconColor: "text-sky-400",
        accentText: "text-sky-400",
        glow: "shadow-[0_0_40px_rgba(56,189,248,0.10)]",
        headerBg: "bg-gradient-to-br from-sky-950/80 via-neutral-900 to-neutral-900",
      }
    : {
        label: "Victory!",
        sub: `${winnerName} wins`,
        icon: <Crown className="w-8 h-8" />,
        borderColor: "border-amber-500/40",
        iconBg: "bg-amber-500/20 border-amber-500/40",
        iconColor: "text-amber-300",
        accentText: "text-amber-300",
        glow: "shadow-[0_0_40px_rgba(251,191,36,0.15)]",
        headerBg: "bg-gradient-to-br from-amber-950/80 via-neutral-900 to-neutral-900",
      };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
      <div
        className={clsx(
          "w-full max-w-sm animate-result-enter rounded-2xl overflow-hidden border",
          cfg.borderColor,
          cfg.glow,
          "bg-neutral-950",
        )}
      >
        {/* Header */}
        <div className={clsx("flex flex-col items-center py-10 gap-3", cfg.headerBg)}>
          <div
            className={clsx(
              "flex items-center justify-center w-16 h-16 rounded-full border-2",
              cfg.iconBg,
              cfg.iconColor,
            )}
          >
            {cfg.icon}
          </div>
          <div className={clsx("text-3xl font-black tracking-tight", cfg.accentText)}>
            {cfg.label}
          </div>
          <div className="text-sm text-white/70">{cfg.sub}</div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 divide-x divide-neutral-800 border-b border-neutral-800">
          {[
            { label: "Moves", value: moveCount },
            { label: "Mode", value: "Local PvP" },
          ].map(({ label, value }) => (
            <div key={label} className="flex flex-col items-center py-3 px-2">
              <div className="text-[10px] uppercase tracking-widest text-neutral-500">{label}</div>
              <div className="text-base font-bold text-white mt-0.5">{value}</div>
            </div>
          ))}
        </div>

        {/* Buttons */}
        <div className="p-4 flex flex-col gap-2.5">
          <div className="flex gap-2">
            <button
              onClick={onPlayAgain}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-neutral-700 bg-neutral-800/60 px-4 py-2.5 text-sm font-semibold text-neutral-100 hover:bg-neutral-800 transition"
            >
              <RotateCcw className="w-4 h-4" />
              Play Again
            </button>
            <button
              onClick={onSetupFriend}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-neutral-700 bg-neutral-800/60 px-4 py-2.5 text-sm font-semibold text-neutral-100 hover:bg-neutral-800 transition"
            >
              <Users className="w-4 h-4 text-neutral-400" />
              Back
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Page ──────────────────────────────────────────────────────────────── */

export default function LocalPvpPage() {
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const { locale } = useParams<{ locale: string }>();
  const params = useSearchParams();

  const player1Color = useMemo(
    () => parseColor(params.get("color")),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const timeSeconds = useMemo(() => parseTime(params.get("time")), [params]);
  const passDevice = params.get("passDevice") !== "0";

  const {
    state,
    pieces,
    lastMove,
    capturedGhosts,
    legalMoves,
    forcedPieces,
    flipBoard,
    playWarning,
    makeMove,
    dismissPassOverlay,
    resign,
    undo,
    reset,
  } = useLocalPvpGame(timeSeconds, passDevice);

  const [showResign, setShowResign] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const prevHtml = document.documentElement.style.overflowY;
    const prevBody = document.body.style.overflowY;
    const prevScroll = document.body.style.overscrollBehavior;
    document.documentElement.style.overflowY = "hidden";
    document.body.style.overflowY = "hidden";
    document.body.style.overscrollBehavior = "none";
    return () => {
      document.documentElement.style.overflowY = prevHtml;
      document.body.style.overflowY = prevBody;
      document.body.style.overscrollBehavior = prevScroll;
    };
  }, []);

  if (!mounted) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4 text-neutral-300">
        Loading…
      </main>
    );
  }

  // Current player label — board is always oriented for them
  const currentIsP1 = state.currentPlayer === player1Color;
  const currentPlayerName = currentIsP1 ? "Player 1" : "Player 2";
  const opponentName = currentIsP1 ? "Player 2" : "Player 1";

  // Top = opponent, bottom = current player
  const topName = opponentName;
  const bottomName = currentPlayerName;
  const topColor = state.currentPlayer === PlayerColor.WHITE ? PlayerColor.BLACK : PlayerColor.WHITE;
  const bottomColor = state.currentPlayer;

  const timeFor = (color: PlayerColor) =>
    formatTime(color === PlayerColor.WHITE ? state.timeLeft.WHITE : state.timeLeft.BLACK);

  const setupFriendPath = `/${locale}/game/setup-friend`;

  return (
    <main className="min-h-[100svh] overflow-hidden overscroll-none flex flex-col items-center justify-start px-3 py-3 sm:p-4 gap-4 sm:gap-8">
      <div className="flex flex-col md:flex-row gap-4 sm:gap-8 w-full max-w-6xl items-stretch md:items-start justify-center">

        {/* Desktop left sidebar — opponent */}
        <div className="hidden md:flex flex-col gap-4 w-64 bg-neutral-800/50 p-4 rounded-xl border border-neutral-700/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-neutral-600 flex items-center justify-center">
              <Skull className="w-5 h-5 text-neutral-300" />
            </div>
            <div>
              <div className="font-bold text-neutral-200">{topName}</div>
              <div className="text-xs text-neutral-500">
                {topColor === PlayerColor.WHITE ? "White" : "Black"}
              </div>
            </div>
          </div>
          <div className="bg-neutral-900 rounded p-2 text-center font-mono text-xl text-neutral-400">
            {timeSeconds > 0 ? timeFor(topColor) : "∞"}
          </div>
        </div>

        {/* Board column */}
        <div className="flex-1 max-w-[650px] w-full mx-auto">
          {/* Mobile top bar — opponent */}
          <div className="md:hidden mb-2 rounded-xl border border-neutral-700/50 bg-neutral-900/40 backdrop-blur px-3 py-2 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-full bg-neutral-700 flex items-center justify-center shrink-0">
                <Skull className="w-4 h-4 text-neutral-300" />
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-neutral-200 truncate">{topName}</div>
                <div className="text-xs text-neutral-500">
                  {topColor === PlayerColor.WHITE ? "White" : "Black"}
                </div>
              </div>
            </div>
            <div className="shrink-0 bg-neutral-950/60 rounded-md px-2 py-1 text-center font-mono text-base text-neutral-100 border border-neutral-700/60">
              {timeSeconds > 0 ? timeFor(topColor) : "∞"}
            </div>
          </div>

          <Board
            onMove={makeMove}
            pieces={pieces}
            lastMove={lastMove}
            capturedGhosts={capturedGhosts}
            legalMoves={legalMoves}
            forcedPieces={forcedPieces}
            flipped={flipBoard}
            onInvalidSelect={playWarning}
          />

          {/* Mobile bottom bar — current player */}
          <div className="md:hidden mt-2 rounded-xl border border-neutral-700/50 bg-neutral-900/40 backdrop-blur px-3 py-2 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-full bg-[var(--primary)] flex items-center justify-center shrink-0">
                <Crown className="w-4 h-4 text-white" />
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-neutral-200 truncate">{bottomName}</div>
                <div className="text-xs text-neutral-500">
                  {bottomColor === PlayerColor.WHITE ? "White" : "Black"} · Your turn
                </div>
              </div>
            </div>
            <div className="shrink-0 bg-neutral-950/60 rounded-md px-2 py-1 text-center font-mono text-base text-neutral-100 border border-neutral-700/60">
              {timeSeconds > 0 ? timeFor(bottomColor) : "∞"}
            </div>
          </div>

          {/* Endgame countdown notice */}
          {state.endgameCountdown && (
            <div className="mt-3 rounded-lg border border-orange-500/40 bg-orange-500/10 px-4 py-2 text-center text-sm text-orange-200">
              3-kings rule: {state.endgameCountdown.remaining} moves remaining for the stronger side
            </div>
          )}
        </div>

        {/* Desktop right sidebar — current player */}
        <div className="hidden md:flex flex-col gap-4 w-64 bg-neutral-800/50 p-4 rounded-xl border border-neutral-700/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[var(--primary)] flex items-center justify-center">
              <Crown className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-bold text-neutral-200">{bottomName}</div>
              <div className="text-xs text-neutral-500">
                {bottomColor === PlayerColor.WHITE ? "White" : "Black"} · Your turn
              </div>
            </div>
          </div>
          <div className="bg-neutral-800 rounded p-2 text-center font-mono text-xl text-white border border-neutral-600">
            {timeSeconds > 0 ? timeFor(bottomColor) : "∞"}
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="w-full max-w-[650px] sticky bottom-0 z-20 -mx-3 px-3 pt-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] bg-[var(--background)]/90 backdrop-blur border-t border-neutral-800 sm:static sm:mx-0 sm:px-0 sm:pt-0 sm:pb-0 sm:bg-transparent sm:backdrop-blur-none sm:border-0">
        <div className="grid grid-cols-3 gap-2 sm:flex sm:items-center sm:justify-center sm:gap-4">
          <Button
            variant="secondary"
            size="sm"
            className="w-full py-2 sm:w-auto sm:px-6 sm:py-3 sm:text-base"
            onClick={undo}
          >
            Undo
          </Button>
          <Button
            variant="secondary"
            size="sm"
            className="w-full py-2 sm:w-auto sm:px-6 sm:py-3 sm:text-base"
            onClick={() => setShowResign(true)}
          >
            Resign
          </Button>
          <Button
            variant="secondary"
            size="sm"
            className="w-full py-2 sm:w-auto sm:px-6 sm:py-3 sm:text-base"
            onClick={reset}
          >
            Reset
          </Button>
        </div>
      </div>

      {/* Pass device overlay */}
      {state.showPassOverlay && !state.result && (
        <PassDeviceOverlay
          playerName={currentPlayerName}
          onReady={dismissPassOverlay}
        />
      )}

      {/* Resign confirmation */}
      {showResign && (
        <ResignCard
          playerName={currentPlayerName}
          onConfirm={() => {
            setShowResign(false);
            resign(state.currentPlayer);
          }}
          onCancel={() => setShowResign(false)}
        />
      )}

      {/* Game result */}
      {state.result && (
        <PvpResultCard
          winner={state.result.winner}
          player1Color={player1Color}
          moveCount={state.moveCount}
          onPlayAgain={reset}
          onSetupFriend={() => router.push(setupFriendPath)}
        />
      )}
    </main>
  );
}
