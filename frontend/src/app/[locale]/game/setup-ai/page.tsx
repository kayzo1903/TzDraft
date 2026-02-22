"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { useTranslations } from "next-intl";
import {
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  Loader2,
  Lock,
  Shuffle,
  User,
} from "lucide-react";

import { useAuthStore } from "@/lib/auth/auth-store";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { BOTS } from "@/lib/game/bots";
import { getMaxUnlockedBotLevel } from "@/lib/game/bot-progression";

type Bot = (typeof BOTS)[number];

const TIME_OPTIONS = [0, 5, 10, 15] as const;
type TimeOption = (typeof TIME_OPTIONS)[number];

export default function SetupAiPage() {
  const t = useTranslations("setupAi");
  const router = useRouter();
  const params = useParams<{ locale: string }>();
  const locale = typeof params?.locale === "string" ? params.locale : "en";
  const { user } = useAuthStore();

  const [maxUnlockedLevel, setMaxUnlockedLevel] = useState(1);
  useEffect(() => {
    setMaxUnlockedLevel(getMaxUnlockedBotLevel());
  }, []);

  const highestUnlockedBot = useMemo((): Bot => {
    let best = BOTS[0];
    for (const bot of BOTS) {
      if (bot.level <= maxUnlockedLevel) best = bot;
    }
    return best;
  }, [maxUnlockedLevel]);

  const [selectedBot, setSelectedBot] = useState<Bot>(BOTS[0]);
  const [selectedColor, setSelectedColor] = useState<
    "WHITE" | "BLACK" | "RANDOM"
  >("RANDOM");
  const [selectedTime, setSelectedTime] = useState<TimeOption>(0);
  const [loading, setLoading] = useState(false);
  const [timeMenuOpen, setTimeMenuOpen] = useState(false);
  const timeMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (selectedBot.level > maxUnlockedLevel) setSelectedBot(highestUnlockedBot);
  }, [highestUnlockedBot, maxUnlockedLevel, selectedBot.level]);

  useEffect(() => {
    if (!timeMenuOpen) return;

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (!timeMenuRef.current?.contains(target)) setTimeMenuOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown, { passive: true });
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, [timeMenuOpen]);

  const userRating = (() => {
    const rating = user?.rating;
    if (typeof rating === "number") return rating;
    if (rating && typeof rating === "object" && "rating" in rating) {
      const nested = (rating as { rating?: unknown }).rating;
      return typeof nested === "number" ? nested : 1200;
    }
    return 1200;
  })();

  const handleStartGame = async () => {
    setLoading(true);
    try {
      let finalColor = selectedColor;
      if (finalColor === "RANDOM") {
        finalColor = Math.random() < 0.5 ? "WHITE" : "BLACK";
      }

      const timeSeconds = selectedTime === 0 ? 0 : selectedTime * 60;
      router.push(
        `/${locale}/game/local?level=${selectedBot.level}&color=${finalColor}&time=${timeSeconds}`,
      );
    } catch (error) {
      console.error("Failed to create game:", error);
    } finally {
      setLoading(false);
    }
  };

  const timeLabel =
    selectedTime === 0 ? t("time.noTime") : t("time.minutes", { minutes: selectedTime });

  const colorLabel =
    selectedColor === "WHITE"
      ? t("colors.white")
      : selectedColor === "BLACK"
        ? t("colors.black")
        : t("colors.random");

  return (
    <div className="min-h-[100svh] bg-[var(--background)] text-foreground">
      <div className="mx-auto w-full max-w-6xl px-4 pt-6 pb-44 sm:pt-10 sm:pb-10 lg:py-10">
        <header className="mb-6 sm:mb-10">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
                {t("title")}
              </h1>
              <p className="mt-1 text-sm sm:text-base text-neutral-400">
                {t("subtitle")}
              </p>
            </div>
            <div className="hidden sm:flex items-center gap-2 rounded-full border border-neutral-800 bg-neutral-900/40 px-3 py-1 text-xs text-neutral-300">
              <Clock className="h-4 w-4 text-neutral-400" aria-hidden="true" />
              <span className="font-mono">{timeLabel}</span>
              <span className="text-neutral-600">•</span>
              <span className="font-medium">{colorLabel}</span>
            </div>
          </div>
        </header>

        <div className="mb-6 rounded-2xl border border-neutral-800 bg-neutral-900/40 px-4 py-3 text-sm text-neutral-300">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <span className="font-semibold text-neutral-100">
                {t("progress.title")}
              </span>{" "}
              <span className="text-neutral-400">
                {t("progress.unlocked", { level: maxUnlockedLevel, total: 7 })}
              </span>
            </div>
            <div className="text-neutral-500">{t("progress.rule")}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_0.85fr] gap-6 items-start">
          <section className="rounded-2xl border border-neutral-800 bg-neutral-950/20">
            <div className="flex items-center justify-between gap-3 border-b border-neutral-800 px-4 py-4">
              <div>
                <div className="text-sm uppercase tracking-[0.22em] text-neutral-500">
                  {t("selectOpponent")}
                </div>
                <div className="mt-1 text-lg font-semibold text-neutral-100">
                  {selectedBot.name}
                </div>
                <div className="mt-1 text-sm text-neutral-400">
                  {selectedBot.description}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 text-xs font-mono text-emerald-200">
                  ELO {selectedBot.elo}
                </span>
                <span className="rounded-full border border-neutral-800 bg-neutral-900/40 px-2.5 py-1 text-xs font-mono text-neutral-300">
                  L{selectedBot.level}
                </span>
              </div>
            </div>

            <div className="p-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-1 gap-3">
                {BOTS.map((bot) => {
                  const locked = bot.level > maxUnlockedLevel;
                  const selected = selectedBot.level === bot.level;

                  return (
                    <button
                      key={bot.level}
                      type="button"
                      onClick={() => {
                        if (locked) return;
                        setSelectedBot(bot);
                      }}
                      disabled={locked}
                      aria-pressed={selected}
                      className={[
                        "w-full rounded-2xl border p-3 transition text-center",
                        "focus:outline-none focus:ring-2 focus:ring-emerald-500/60 focus:ring-offset-2 focus:ring-offset-[var(--background)]",
                        locked
                          ? "opacity-60 cursor-not-allowed border-neutral-800 bg-neutral-900/40"
                          : selected
                            ? "border-emerald-500/70 bg-emerald-500/10"
                            : "border-neutral-800 bg-neutral-950/20 hover:bg-neutral-900/60 hover:border-emerald-500/40",
                      ].join(" ")}
                    >
                      <div className="flex flex-col items-center gap-2">
                        <div className="relative w-14 h-14 rounded-full bg-neutral-950/40 border border-neutral-700 overflow-hidden shrink-0">
                          <Image
                            src={bot.avatarSrc}
                            alt={bot.name}
                            fill
                            sizes="56px"
                            className="object-cover object-[50%_60%]"
                          />
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="font-semibold text-neutral-100 truncate max-w-[12rem]">
                            {bot.name}
                          </div>
                          {selected && (
                            <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-200 border border-emerald-500/30">
                              <Check className="h-3.5 w-3.5" aria-hidden="true" />
                            </span>
                          )}
                        </div>

                        {locked && (
                          <div className="inline-flex items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-950/30 px-2.5 py-1 text-xs text-neutral-400">
                            <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                            <span className="truncate">{t("locked")}</span>
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          <aside className="hidden lg:block space-y-4 lg:sticky lg:top-6">
            <Card className="rounded-2xl border border-neutral-800 bg-neutral-950/20 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm uppercase tracking-[0.22em] text-neutral-500">
                  {t("preview.title")}
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-neutral-800 bg-neutral-900/40 px-3 py-1 text-xs text-neutral-200">
                  <Clock className="h-4 w-4 text-neutral-400" aria-hidden="true" />
                  <span className="font-mono">{timeLabel}</span>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center shrink-0">
                    {user?.username ? (
                      <span className="text-sm font-bold text-neutral-100">
                        {user.username.slice(0, 1).toUpperCase()}
                      </span>
                    ) : (
                      <User className="h-5 w-5 text-neutral-200" aria-hidden="true" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-neutral-100 truncate">
                      {user?.username || t("preview.you")}
                    </div>
                    <div className="text-xs text-neutral-400 font-mono">
                      {userRating}
                    </div>
                  </div>
                </div>

                <div className="shrink-0 text-neutral-600">
                  <ChevronRight className="h-5 w-5" aria-hidden="true" />
                </div>

                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative w-11 h-11 rounded-full bg-neutral-950/40 border border-neutral-700 overflow-hidden shrink-0">
                    <Image
                      src={selectedBot.avatarSrc}
                      alt={selectedBot.name}
                      fill
                      sizes="44px"
                      className="object-cover object-[50%_60%]"
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-neutral-100 truncate">
                      {selectedBot.name}
                    </div>
                    <div className="text-xs text-neutral-400 font-mono">
                      {selectedBot.elo}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-neutral-800 bg-neutral-900/30 px-3 py-2">
                  <div className="text-xs text-neutral-500">{t("selectTime")}</div>
                  <div className="mt-1 flex items-center gap-2 text-sm font-semibold text-neutral-100">
                    <Clock className="h-4 w-4 text-neutral-400" aria-hidden="true" />
                    <span>{timeLabel}</span>
                  </div>
                </div>
                <div className="rounded-xl border border-neutral-800 bg-neutral-900/30 px-3 py-2">
                  <div className="text-xs text-neutral-500">{t("selectColor")}</div>
                  <div className="mt-1 flex items-center gap-2 text-sm font-semibold text-neutral-100">
                    <Shuffle className="h-4 w-4 text-neutral-400" aria-hidden="true" />
                    <span>{colorLabel}</span>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="rounded-2xl border border-neutral-800 bg-neutral-950/20 p-4">
              <div className="text-sm uppercase tracking-[0.22em] text-neutral-500">
                {t("selectTime")}
              </div>
              <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
                {TIME_OPTIONS.map((time) => {
                  const selected = selectedTime === time;
                  return (
                    <button
                      key={time}
                      type="button"
                      onClick={() => setSelectedTime(time)}
                      aria-pressed={selected}
                      className={[
                        "rounded-xl border px-3 py-2 text-center transition",
                        "focus:outline-none focus:ring-2 focus:ring-orange-500/60 focus:ring-offset-2 focus:ring-offset-[var(--background)]",
                        selected
                          ? "border-orange-500/70 bg-orange-500/15 text-orange-200"
                          : "border-neutral-800 bg-neutral-900/30 text-neutral-300 hover:bg-neutral-900/60",
                      ].join(" ")}
                    >
                      <div className="text-base font-bold">
                        {time === 0 ? t("time.noTime") : t("time.minutes", { minutes: time })}
                      </div>
                    </button>
                  );
                })}
              </div>
            </Card>

            <Card className="rounded-2xl border border-neutral-800 bg-neutral-950/20 p-4">
              <div className="text-sm uppercase tracking-[0.22em] text-neutral-500">
                {t("selectColor")}
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedColor("WHITE")}
                  aria-pressed={selectedColor === "WHITE"}
                  aria-label={t("colors.white")}
                  className={[
                    "rounded-xl border px-3 py-2 transition flex flex-col items-center gap-2",
                    "focus:outline-none focus:ring-2 focus:ring-orange-500/60 focus:ring-offset-2 focus:ring-offset-[var(--background)]",
                    selectedColor === "WHITE"
                      ? "border-orange-500/70 bg-orange-500/15"
                      : "border-neutral-800 bg-neutral-900/30 hover:bg-neutral-900/60",
                  ].join(" ")}
                >
                  <div className="w-7 h-7 rounded-full bg-white border border-neutral-300" />
                  <span className="sr-only">{t("colors.white")}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedColor("RANDOM")}
                  aria-pressed={selectedColor === "RANDOM"}
                  aria-label={t("colors.random")}
                  className={[
                    "rounded-xl border px-3 py-2 transition flex flex-col items-center gap-2",
                    "focus:outline-none focus:ring-2 focus:ring-orange-500/60 focus:ring-offset-2 focus:ring-offset-[var(--background)]",
                    selectedColor === "RANDOM"
                      ? "border-orange-500/70 bg-orange-500/15"
                      : "border-neutral-800 bg-neutral-900/30 hover:bg-neutral-900/60",
                  ].join(" ")}
                >
                  <div className="w-7 h-7 rounded-full bg-gradient-to-r from-white to-black border border-neutral-600" />
                  <span className="sr-only">{t("colors.random")}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedColor("BLACK")}
                  aria-pressed={selectedColor === "BLACK"}
                  aria-label={t("colors.black")}
                  className={[
                    "rounded-xl border px-3 py-2 transition flex flex-col items-center gap-2",
                    "focus:outline-none focus:ring-2 focus:ring-orange-500/60 focus:ring-offset-2 focus:ring-offset-[var(--background)]",
                    selectedColor === "BLACK"
                      ? "border-orange-500/70 bg-orange-500/15"
                      : "border-neutral-800 bg-neutral-900/30 hover:bg-neutral-900/60",
                  ].join(" ")}
                >
                  <div className="w-7 h-7 rounded-full bg-black border border-neutral-600" />
                  <span className="sr-only">{t("colors.black")}</span>
                </button>
              </div>
            </Card>

            <Button
              size="lg"
              className="w-full text-lg font-bold py-5"
              onClick={handleStartGame}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  {t("start.loading")}
                </>
              ) : (
                t("start.cta")
              )}
            </Button>
          </aside>
        </div>
      </div>

      <div className="lg:hidden fixed inset-x-0 bottom-0 z-30 border-t border-neutral-800 bg-neutral-950/90 backdrop-blur">
        <div className="mx-auto w-full max-w-6xl px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+12px)]">
          <div className="mb-3 flex items-center gap-2">
            <div ref={timeMenuRef} className="relative flex-1">
              <button
                type="button"
                onClick={() => setTimeMenuOpen((open) => !open)}
                aria-expanded={timeMenuOpen}
                className={[
                  "w-full rounded-xl border px-3 py-2.5 text-sm font-semibold transition flex items-center justify-between gap-2",
                  "border-neutral-800 bg-neutral-900/40 text-neutral-100",
                  "focus:outline-none focus:ring-2 focus:ring-emerald-500/60 focus:ring-offset-2 focus:ring-offset-[var(--background)]",
                ].join(" ")}
              >
                <span className="inline-flex items-center gap-2 min-w-0">
                  <Clock className="h-4 w-4 text-neutral-300" aria-hidden="true" />
                  <span className="truncate">{timeLabel}</span>
                </span>
                <ChevronDown className="h-4 w-4 text-neutral-400" aria-hidden="true" />
              </button>

              {timeMenuOpen && (
                <div className="absolute bottom-full mb-2 left-0 right-0 rounded-2xl border border-neutral-800 bg-neutral-950/95 p-2 shadow-xl">
                  <div className="grid grid-cols-2 gap-2">
                    {TIME_OPTIONS.map((time) => {
                      const selected = selectedTime === time;
                      return (
                        <button
                          key={time}
                          type="button"
                          onClick={() => {
                            setSelectedTime(time);
                            setTimeMenuOpen(false);
                          }}
                          aria-pressed={selected}
                          className={[
                            "rounded-xl border px-3 py-2 text-sm font-semibold transition text-center",
                            "focus:outline-none focus:ring-2 focus:ring-emerald-500/60 focus:ring-offset-2 focus:ring-offset-[var(--background)]",
                            selected
                              ? "border-emerald-500/70 bg-emerald-500/10 text-emerald-100"
                              : "border-neutral-800 bg-neutral-900/40 text-neutral-200 hover:bg-neutral-900/70",
                          ].join(" ")}
                        >
                          {time === 0 ? t("time.noTime") : t("time.minutes", { minutes: time })}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div
              className="inline-flex items-center rounded-xl border border-neutral-800 bg-neutral-900/40 p-1"
              role="group"
              aria-label={t("selectColor")}
            >
              <button
                type="button"
                onClick={() => setSelectedColor("WHITE")}
                aria-pressed={selectedColor === "WHITE"}
                aria-label={t("colors.white")}
                className={[
                  "rounded-lg p-2 transition",
                  "focus:outline-none focus:ring-2 focus:ring-emerald-500/60 focus:ring-offset-2 focus:ring-offset-[var(--background)]",
                  selectedColor === "WHITE"
                    ? "bg-emerald-500/15"
                    : "hover:bg-neutral-900/70",
                ].join(" ")}
              >
                <div className="w-5 h-5 rounded-full bg-white border border-neutral-300" />
              </button>
              <button
                type="button"
                onClick={() => setSelectedColor("RANDOM")}
                aria-pressed={selectedColor === "RANDOM"}
                aria-label={t("colors.random")}
                className={[
                  "rounded-lg p-2 transition",
                  "focus:outline-none focus:ring-2 focus:ring-emerald-500/60 focus:ring-offset-2 focus:ring-offset-[var(--background)]",
                  selectedColor === "RANDOM"
                    ? "bg-emerald-500/15"
                    : "hover:bg-neutral-900/70",
                ].join(" ")}
              >
                <div className="w-5 h-5 rounded-full bg-gradient-to-r from-white to-black border border-neutral-600" />
              </button>
              <button
                type="button"
                onClick={() => setSelectedColor("BLACK")}
                aria-pressed={selectedColor === "BLACK"}
                aria-label={t("colors.black")}
                className={[
                  "rounded-lg p-2 transition",
                  "focus:outline-none focus:ring-2 focus:ring-emerald-500/60 focus:ring-offset-2 focus:ring-offset-[var(--background)]",
                  selectedColor === "BLACK"
                    ? "bg-emerald-500/15"
                    : "hover:bg-neutral-900/70",
                ].join(" ")}
              >
                <div className="w-5 h-5 rounded-full bg-black border border-neutral-600" />
              </button>
            </div>
          </div>

          <Button
            size="lg"
            className="w-full text-lg font-bold py-5"
            onClick={handleStartGame}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                {t("start.loading")}
              </>
            ) : (
              t("start.cta")
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
