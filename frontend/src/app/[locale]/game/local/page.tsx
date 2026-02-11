"use client";

import React, { useMemo, useEffect, useRef, useState } from "react";
import { useSearchParams, useParams, useRouter } from "next/navigation";
import { Board } from "@/components/game/Board";
import { Button } from "@/components/ui/Button";
import { useLocalGame } from "@/hooks/useLocalGame";
import { getBotByLevel } from "@/lib/game/bots";
import { useAuthStore } from "@/lib/auth/auth-store";
import { PlayerColor, Winner } from "@tzdraft/cake-engine";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { getMaxUnlockedBotLevel } from "@/lib/game/bot-progression";

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
  const t = useTranslations("gameArena");
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
  const maxUnlockedAtStartRef = useRef<number>(1);

  const { state, pieces, legalMoves, forcedPieces, playWarning, undo, resign, makeMove, reset } = useLocalGame(
    level,
    playerColor,
    timeSeconds,
  );
  const [showResign, setShowResign] = useState(false);
  const [maxUnlockedLevel, setMaxUnlockedLevel] = useState(1);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const max = getMaxUnlockedBotLevel();
    maxUnlockedAtStartRef.current = max;
    setMaxUnlockedLevel(max);
  }, [level]);

  useEffect(() => {
    if (!state.result) return;
    // Local unlock runs inside `useLocalGame`; re-read after result settles.
    const id = window.setTimeout(() => {
      setMaxUnlockedLevel(getMaxUnlockedBotLevel());
    }, 50);
    return () => window.clearTimeout(id);
  }, [state.result]);

  if (!mounted) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4 text-neutral-300">
        {t("loading")}
      </main>
    );
  }

  const userLabel = user?.username || t("you");
  const topPlayer = bot;
  const userRating =
    typeof user?.rating === "object" && user?.rating
      ? (user.rating as any).rating ?? 1200
      : (user?.rating ?? 1200);
  const bottomPlayer = { name: userLabel, rating: userRating };
  const botColor =
    playerColor === PlayerColor.WHITE ? PlayerColor.BLACK : PlayerColor.WHITE;
  const locale = paramsRoute?.locale ?? "en";
  const setupAiPath = `/${locale}/game/setup-ai`;
  const nextBotLevel = Math.min(level + 1, 7);
  const didHumanWin =
    state.result?.winner ===
    (playerColor === PlayerColor.WHITE ? Winner.WHITE : Winner.BLACK);
  const canOfferNextBot =
    Boolean(state.result) &&
    didHumanWin &&
    !state.undoUsed &&
    level < 7 &&
    maxUnlockedAtStartRef.current < nextBotLevel;

  const timeFor = (color: PlayerColor) =>
    formatTime(color === PlayerColor.WHITE ? state.timeLeft.WHITE : state.timeLeft.BLACK);

  const statusText = state.result
    ? t("status.gameOver")
    : state.isAiThinking
      ? t("status.aiThinking")
      : state.currentPlayer === playerColor
        ? state.mustContinueFrom !== null
          ? t("status.continueCapture")
          : t("status.yourMove")
        : t("status.botToMove");

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 gap-8">
      <div className="w-full max-w-4xl flex items-center justify-between bg-neutral-800 p-4 rounded-xl shadow-lg border border-neutral-700">
        <div className="flex items-center gap-4">
          <div className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-orange-400 to-yellow-200">
            {t("title")}
          </div>
          <div className="h-6 w-px bg-neutral-600"></div>
          <div className="text-neutral-400 text-sm">
            {t("aiLevel")}:{" "}
            <span className="font-mono text-neutral-200">{level}</span>
          </div>
        </div>
        <div className="flex items-center gap-3 text-sm text-neutral-300">
          {statusText}
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-8 w-full max-w-6xl items-start justify-center">
        <div className="hidden md:flex flex-col gap-4 w-64 bg-neutral-800/50 p-4 rounded-xl border border-neutral-700/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-neutral-600 flex items-center justify-center text-sm font-bold text-neutral-100">
              <div className="relative w-full h-full">
                <Image
                  src={topPlayer.avatarSrc}
                  alt={topPlayer.name}
                  fill
                  sizes="40px"
                  className="object-cover object-[50%_60%]"
                />
              </div>
            </div>
            <div>
              <div className="font-bold text-neutral-200">{topPlayer.name}</div>
              <div className="text-xs text-neutral-500">{topPlayer.elo}</div>
            </div>
          </div>
          <div className="bg-neutral-900 rounded p-2 text-center font-mono text-xl text-neutral-400">
            {timeFor(botColor)}
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
          {state.endgameCountdown && (
            <div className="mt-3 rounded-lg border border-orange-500/40 bg-orange-500/10 px-4 py-2 text-center text-sm text-orange-200">
              {t("endgameCountdown", {
                remaining: state.endgameCountdown.remaining,
                favored: state.endgameCountdown.favored,
              })}
            </div>
          )}
          {state.result && (
            <div className="mt-4 text-center text-lg font-semibold text-orange-300">
              {t("winnerInline", { winner: state.result.winner })}
            </div>
          )}
        </div>

        <div className="hidden md:flex flex-col gap-4 w-64 bg-neutral-800/50 p-4 rounded-xl border border-neutral-700/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center text-sm font-bold text-white">
              YOU
            </div>
            <div>
              <div className="font-bold text-neutral-200">
                {bottomPlayer.name}
              </div>
              <div className="text-xs text-neutral-500">
                {bottomPlayer.rating}
              </div>
            </div>
          </div>
          <div className="bg-neutral-800 rounded p-2 text-center font-mono text-xl text-white border border-neutral-600">
            {timeFor(playerColor)}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Button variant="secondary" onClick={undo}>
          {t("actions.undo")}
        </Button>
        <Button variant="secondary" onClick={() => setShowResign(true)}>
          {t("actions.resign")}
        </Button>
        <Button variant="secondary" onClick={reset}>
          {t("actions.reset")}
        </Button>
      </div>
      {state.undoUsed && !state.result && (
        <div className="text-sm text-neutral-400">
          {t("progression.disabled")}
        </div>
      )}

      {showResign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm mx-4 rounded-2xl border border-neutral-700 bg-neutral-900 shadow-2xl">
            <div className="p-6 border-b border-neutral-800">
              <div className="text-sm uppercase tracking-[0.2em] text-neutral-500">
                {t("resign.confirmTitle")}
              </div>
              <div className="mt-2 text-xl font-bold text-neutral-100">
                {t("resign.confirmQuestion")}
              </div>
            </div>
            <div className="p-6 flex flex-col gap-3">
              <Button
                onClick={() => {
                  setShowResign(false);
                  resign();
                }}
              >
                {t("resign.confirmCta")}
              </Button>
              <Button variant="secondary" onClick={() => setShowResign(false)}>
                {t("resign.cancel")}
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
                {t("gameOver.title")}
              </div>
              <div className="mt-2 text-3xl font-black text-neutral-100">
                {user?.username
                  ? t("gameOver.congratsNamed", { name: user.username })
                  : t("gameOver.congrats")}
              </div>
              <div className="mt-2 text-neutral-400">
                {t("gameOver.winnerLabel")}{" "}
                <span className="font-semibold text-orange-300">
                  {state.result.winner}
                </span>
              </div>
              {canOfferNextBot && (
                <div className="mt-3 text-sm text-neutral-400">
                  {t("gameOver.unlockedNext", { level: nextBotLevel })}
                </div>
              )}
            </div>
            <div className="p-6 flex flex-col gap-3">
              <Button onClick={reset}>{t("gameOver.playAgain")}</Button>
              {canOfferNextBot && (
                <Button
                  variant="secondary"
                  onClick={() => {
                    reset();
                    router.push(
                      `/${locale}/game/local?level=${nextBotLevel}&color=${playerColor}&time=${timeSeconds}`,
                    );
                  }}
                >
                  {t("gameOver.nextBot")}
                </Button>
              )}
              <Button variant="secondary" onClick={() => router.push(setupAiPath)}>
                {t("gameOver.endGame")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
