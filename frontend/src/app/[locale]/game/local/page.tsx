"use client";

import React, { useMemo, useEffect, useState } from "react";
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
import { Trophy } from "lucide-react";

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
  const [maxUnlockedAtStart, setMaxUnlockedAtStart] = useState(1);

  const { state, pieces, legalMoves, forcedPieces, playWarning, undo, resign, makeMove, reset } = useLocalGame(
    level,
    playerColor,
    timeSeconds,
  );
  const [showResign, setShowResign] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const prevHtmlOverflowY = document.documentElement.style.overflowY;
    const prevBodyOverflowY = document.body.style.overflowY;
    const prevBodyOverscrollBehavior = document.body.style.overscrollBehavior;

    document.documentElement.style.overflowY = "hidden";
    document.body.style.overflowY = "hidden";
    document.body.style.overscrollBehavior = "none";

    return () => {
      document.documentElement.style.overflowY = prevHtmlOverflowY;
      document.body.style.overflowY = prevBodyOverflowY;
      document.body.style.overscrollBehavior = prevBodyOverscrollBehavior;
    };
  }, []);

  useEffect(() => {
    const max = getMaxUnlockedBotLevel();
    setMaxUnlockedAtStart(max);
  }, [level]);

  if (!mounted) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4 text-neutral-300">
        {t("loading")}
      </main>
    );
  }

  const userLabel = user?.username || t("you");
  const topPlayer = bot;
  const userRating = (() => {
    const rating = user?.rating;
    if (typeof rating === "number") return rating;
    if (rating && typeof rating === "object" && "rating" in rating) {
      const nested = (rating as { rating?: unknown }).rating;
      return typeof nested === "number" ? nested : 1200;
    }
    return 1200;
  })();
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
    maxUnlockedAtStart < nextBotLevel;

  const timeFor = (color: PlayerColor) =>
    formatTime(color === PlayerColor.WHITE ? state.timeLeft.WHITE : state.timeLeft.BLACK);

  const winnerIcon =
    state.result?.winner === Winner.WHITE || state.result?.winner === Winner.BLACK ? (
      <Trophy className="h-5 w-5 text-orange-300" aria-hidden="true" />
    ) : null;

  return (
    <main className="min-h-[100svh] overflow-hidden overscroll-none flex flex-col items-center justify-start px-3 py-3 sm:p-4 gap-4 sm:gap-8">
      <div className="flex flex-col md:flex-row gap-4 sm:gap-8 w-full max-w-6xl items-stretch md:items-start justify-center">
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

        <div className="flex-1 max-w-[650px] w-full mx-auto">
          <div className="md:hidden mb-2 rounded-xl border border-neutral-700/50 bg-neutral-900/40 backdrop-blur px-3 py-2 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-full bg-neutral-700 overflow-hidden shrink-0">
                <div className="relative w-full h-full">
                  <Image
                    src={topPlayer.avatarSrc}
                    alt={topPlayer.name}
                    fill
                    sizes="36px"
                    className="object-cover object-[50%_60%]"
                  />
                </div>
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-neutral-200 truncate">
                  {topPlayer.name}
                </div>
                <div className="text-xs text-neutral-500">{topPlayer.elo}</div>
              </div>
            </div>
            <div className="shrink-0 bg-neutral-950/60 rounded-md px-2 py-1 text-center font-mono text-base text-neutral-100 border border-neutral-700/60">
              {timeFor(botColor)}
            </div>
          </div>

          <Board
            onMove={makeMove}
            pieces={pieces}
            legalMoves={legalMoves}
            forcedPieces={forcedPieces}
            onInvalidSelect={playWarning}
            readOnly={state.isAiThinking}
          />

          <div className="md:hidden mt-2 rounded-xl border border-neutral-700/50 bg-neutral-900/40 backdrop-blur px-3 py-2 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-full bg-orange-500 flex items-center justify-center text-xs font-bold text-white shrink-0">
                YOU
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-neutral-200 truncate">
                  {bottomPlayer.name}
                </div>
                <div className="text-xs text-neutral-500">{bottomPlayer.rating}</div>
              </div>
            </div>
            <div className="shrink-0 bg-neutral-950/60 rounded-md px-2 py-1 text-center font-mono text-base text-neutral-100 border border-neutral-700/60">
              {timeFor(playerColor)}
            </div>
          </div>

          {state.endgameCountdown && (
            <div className="mt-3 rounded-lg border border-orange-500/40 bg-orange-500/10 px-4 py-2 text-center text-sm text-orange-200">
              {t("endgameCountdown", {
                remaining: state.endgameCountdown.remaining,
                favored: state.endgameCountdown.favored,
              })}
            </div>
          )}
          {state.result && (
            <div className="mt-4 flex items-center justify-center gap-2 text-center text-lg font-semibold text-orange-300">
              {winnerIcon}
              <span>{t("winnerInline", { winner: state.result.winner })}</span>
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

      {state.undoUsed && !state.result && (
        <div className="text-sm text-neutral-400">
          {t("progression.disabled")}
        </div>
      )}

      <div className="w-full max-w-[650px] sticky bottom-0 z-20 -mx-3 px-3 pt-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] bg-[var(--background)]/90 backdrop-blur border-t border-neutral-800 sm:static sm:mx-0 sm:px-0 sm:pt-0 sm:pb-0 sm:bg-transparent sm:backdrop-blur-none sm:border-0">
        <div className="grid grid-cols-3 gap-2 sm:flex sm:items-center sm:justify-center sm:gap-4">
          <Button
            variant="secondary"
            size="sm"
            className="w-full py-2 sm:w-auto sm:px-6 sm:py-3 sm:text-base"
            onClick={undo}
          >
            {t("actions.undo")}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            className="w-full py-2 sm:w-auto sm:px-6 sm:py-3 sm:text-base"
            onClick={() => setShowResign(true)}
          >
            {t("actions.resign")}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            className="w-full py-2 sm:w-auto sm:px-6 sm:py-3 sm:text-base"
            onClick={reset}
          >
            {t("actions.reset")}
          </Button>
        </div>
      </div>

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
              <span className="inline-flex items-center gap-2 font-semibold text-orange-300">
                {winnerIcon}
                <span>{state.result.winner}</span>
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
