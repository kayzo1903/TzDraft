"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { useTranslations } from "next-intl";
import {
  ChevronDown,
  CheckCircle2,
  Clock,
  Crown,
  Flame,
  Loader2,
  Lock,
  Shield,
  Shuffle,
  Skull,
  Swords,
  Trophy,
  User,
  Zap,
} from "lucide-react";
import clsx from "clsx";

import { useAuthStore } from "@/lib/auth/auth-store";
import { Button } from "@/components/ui/Button";
import { BOTS } from "@/lib/game/bots";
import { getMaxUnlockedBotLevel, getCompletedBotLevels, INITIAL_FREE_LEVELS } from "@/lib/game/bot-progression";
import { aiChallengeService } from "@/services/ai-challenge.service";

type Bot = (typeof BOTS)[number];

const TIME_OPTIONS = [0, 5, 10, 15] as const;
type TimeOption = (typeof TIME_OPTIONS)[number];

/* ─── Tier definitions ──────────────────────────────────────────────────── */
type TierDef = {
  label: string;
  range: [number, number];
  icon: React.ReactNode;
  accent: string;       // tailwind text color class
  border: string;       // tailwind border color class
  glow: string;         // tailwind shadow/ring color
  bg: string;
};

const TIERS: TierDef[] = [
  {
    label: "Beginner",
    range: [1, 5],
    icon: <Shield className="w-3.5 h-3.5" />,
    accent: "text-sky-300",
    border: "border-sky-500/30",
    glow: "ring-sky-500/40",
    bg: "bg-sky-500/5",
  },
  {
    label: "Casual",
    range: [6, 9],
    icon: <Zap className="w-3.5 h-3.5" />,
    accent: "text-emerald-300",
    border: "border-emerald-500/30",
    glow: "ring-emerald-500/40",
    bg: "bg-emerald-500/5",
  },
  {
    label: "Competitive",
    range: [10, 13],
    icon: <Swords className="w-3.5 h-3.5" />,
    accent: "text-amber-300",
    border: "border-amber-500/30",
    glow: "ring-amber-500/40",
    bg: "bg-amber-500/5",
  },
  {
    label: "Expert",
    range: [14, 16],
    icon: <Flame className="w-3.5 h-3.5" />,
    accent: "text-orange-400",
    border: "border-orange-500/30",
    glow: "ring-orange-500/40",
    bg: "bg-orange-500/5",
  },
  {
    label: "Master",
    range: [17, 19],
    icon: <Skull className="w-3.5 h-3.5" />,
    accent: "text-rose-400",
    border: "border-rose-500/30",
    glow: "ring-rose-500/40",
    bg: "bg-rose-500/5",
  },
];

const getTierForLevel = (level: number): TierDef =>
  TIERS.find(({ range: [s, e] }) => level >= s && level <= e) ?? TIERS[0];

/* ─── Difficulty bar ────────────────────────────────────────────────────── */
function DifficultyBar({ level }: { level: number }) {
  const pct = Math.round((level / 19) * 100);
  const tier = getTierForLevel(level);
  const barColor =
    level <= 5
      ? "bg-sky-400"
      : level <= 9
        ? "bg-emerald-400"
        : level <= 13
          ? "bg-amber-400"
          : level <= 16
            ? "bg-orange-400"
            : "bg-rose-500";
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-1">
        <span className={clsx("text-[10px] font-semibold uppercase tracking-widest", tier.accent)}>
          {tier.label}
        </span>
        <span className="text-[10px] font-mono text-neutral-400">Lv.{level}</span>
      </div>
      <div className="h-1 w-full rounded-full bg-neutral-800 overflow-hidden">
        <div
          className={clsx("h-full rounded-full transition-all duration-500", barColor)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/* ─── Bot card (chess.com style large avatar) ───────────────────────────── */
interface BotCardProps {
  bot: Bot;
  selected: boolean;
  locked: boolean;
  completed: boolean;
  lockedLabel: string;
  unlockInstruction: string;
  onClick: () => void;
}

function BotCard({
  bot,
  selected,
  locked,
  completed,
  lockedLabel,
  unlockInstruction,
  onClick,
}: BotCardProps) {
  const tier = getTierForLevel(bot.level);
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={locked}
      aria-pressed={selected}
      title={locked ? unlockInstruction : undefined}
      className={clsx(
        "relative w-full rounded-2xl border transition-all duration-200 overflow-hidden group text-left",
        "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#1c1917]",
        locked
          ? "opacity-50 cursor-not-allowed border-neutral-800 bg-neutral-900/30"
          : selected
            ? clsx("border-[var(--primary)] shadow-lg ring-1", tier.glow, tier.bg)
            : completed
              ? "border-amber-500/30 bg-amber-500/5 hover:border-amber-400/50 hover:bg-amber-500/10"
              : "border-neutral-800 bg-neutral-900/40 hover:border-neutral-600 hover:bg-neutral-900/70",
        locked ? "" : `focus:${tier.glow}`
      )}
    >
      {/* Portrait */}
      <div className="relative w-full aspect-[3/4] overflow-hidden">
        <Image
          src={bot.avatarSrc}
          alt={bot.name}
          fill
          sizes="(max-width:640px) 50vw, (max-width:1024px) 33vw, 16vw"
          className={clsx(
            "object-cover object-top transition-transform duration-500",
            !locked && "group-hover:scale-105"
          )}
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/20 to-transparent" />

        {/* Selected indicator (checkmark) or completed crown */}
        {selected ? (
          <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[var(--primary)] flex items-center justify-center shadow-md">
            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        ) : completed && !locked ? (
          <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-amber-500/90 flex items-center justify-center shadow-md" title="Beaten">
            <Crown className="w-3 h-3 text-white" />
          </div>
        ) : null}

        {/* Lock overlay */}
        {locked && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-neutral-950/70 backdrop-blur-[2px]">
            <Lock className="w-6 h-6 text-neutral-400 mb-1" />
            <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">{lockedLabel}</span>
            <div className="mt-1 max-w-[88%] text-center text-[10px] leading-snug text-neutral-300">
              {unlockInstruction}
            </div>
          </div>
        )}

        {/* Tier badge */}
        <div className={clsx("absolute top-2 left-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border", tier.accent, tier.border, "bg-neutral-950/80")}>
          {tier.icon} {tier.label}
        </div>
      </div>

      {/* Info strip */}
      <div className="px-2.5 py-2">
        <div className="flex items-baseline justify-between gap-1 mb-1.5">
          <span className="font-bold text-sm text-white truncate">{bot.name}</span>
          {completed && !locked ? (
            <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-amber-400 shrink-0">
              <CheckCircle2 className="w-3 h-3" /> Beaten
            </span>
          ) : (
            <span className="font-mono text-[10px] text-neutral-400 shrink-0">{bot.elo}</span>
          )}
        </div>
        <DifficultyBar level={bot.level} />
      </div>
    </button>
  );
}

/* ─── Selected bot hero panel ───────────────────────────────────────────── */
function SelectedBotPanel({
  bot,
  userRating,
  userName,
  timeLabel,
  colorLabel,
}: {
  bot: Bot;
  userRating: number;
  userName: string;
  timeLabel: string;
  colorLabel: string;
}) {
  const tier = getTierForLevel(bot.level);
  const ratingDiff = bot.elo - userRating;
  const diffLabel =
    ratingDiff > 0
      ? `+${ratingDiff} above you`
      : ratingDiff < 0
        ? `${ratingDiff} below you`
        : "Matched";
  const diffColor =
    ratingDiff > 200 ? "text-rose-400" : ratingDiff > 0 ? "text-amber-400" : "text-emerald-400";

  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 overflow-hidden">
      {/* Hero portrait */}
      <div className="relative w-full aspect-[16/10] overflow-hidden">
        <Image
          src={bot.avatarSrc}
          alt={bot.name}
          fill
          sizes="480px"
          className="object-cover object-top scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-neutral-900 via-neutral-900/30 to-transparent" />

        {/* Name overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <div className={clsx("text-xs font-bold uppercase tracking-widest mb-1 flex items-center gap-1", tier.accent)}>
            {tier.icon} {tier.label}
          </div>
          <div className="text-2xl font-black text-white">{bot.name}</div>
          <div className="text-sm text-neutral-300 mt-0.5">{bot.description}</div>
        </div>
      </div>

      {/* Stats */}
      <div className="p-4 space-y-4">
        {/* Matchup row */}
        <div className="flex items-center gap-3">
          <div className="flex-1 flex items-center gap-2 min-w-0">
            <div className="w-9 h-9 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center shrink-0">
              <User className="w-4 h-4 text-neutral-200" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-white truncate">{userName}</div>
              <div className="text-xs font-mono text-neutral-400">{userRating}</div>
            </div>
          </div>
          <div className="text-xs font-bold text-neutral-500 uppercase tracking-widest shrink-0">vs</div>
          <div className="flex-1 flex items-center gap-2 min-w-0 justify-end">
            <div className="min-w-0 text-right">
              <div className="text-sm font-semibold text-white truncate">{bot.name}</div>
              <div className={clsx("text-xs font-mono", diffColor)}>{diffLabel}</div>
            </div>
            <div className="relative w-9 h-9 rounded-full overflow-hidden border border-neutral-700 shrink-0">
              <Image src={bot.avatarSrc} alt={bot.name} fill sizes="36px" className="object-cover object-top" />
            </div>
          </div>
        </div>

        <div className="h-px bg-neutral-800" />

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-[10px] text-neutral-500 uppercase tracking-wider">Rating</div>
            <div className="text-sm font-bold text-white mt-0.5">{bot.elo}</div>
          </div>
          <div>
            <div className="text-[10px] text-neutral-500 uppercase tracking-wider">Time</div>
            <div className="text-sm font-bold text-white mt-0.5 flex items-center justify-center gap-1">
              <Clock className="w-3 h-3 text-neutral-400" />
              {timeLabel}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-neutral-500 uppercase tracking-wider">Color</div>
            <div className="text-sm font-bold text-white mt-0.5 flex items-center justify-center gap-1">
              <Shuffle className="w-3 h-3 text-neutral-400" />
              {colorLabel}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Page ──────────────────────────────────────────────────────────────── */
export default function SetupAiPage() {
  const t = useTranslations("setupAi");
  const router = useRouter();
  const params = useParams<{ locale: string }>();
  const locale = typeof params?.locale === "string" ? params.locale : "en";
  const { user, isAuthenticated, hasHydrated } = useAuthStore();
  const isRegisteredUser =
    hasHydrated &&
    isAuthenticated &&
    user?.accountType === "REGISTERED" &&
    Boolean(user?.id);

  // Bug fix: initialize to INITIAL_FREE_LEVELS to avoid flash of all-locked UI
  const [maxUnlockedLevel, setMaxUnlockedLevel] = useState(INITIAL_FREE_LEVELS);
  const [completedLevels, setCompletedLevels] = useState<Set<number>>(new Set());

  const highestUnlockedBot = useMemo((): Bot => {
    let best = BOTS[0];
    for (const bot of BOTS) { if (bot.level <= maxUnlockedLevel) best = bot; }
    return best;
  }, [maxUnlockedLevel]);

  // Bug fix: default selectedBot to highest unlocked, not always BOTS[0]
  const [selectedBot, setSelectedBot] = useState<Bot>(BOTS[0]);
  const [selectedColor, setSelectedColor] = useState<"WHITE" | "BLACK" | "RANDOM">("RANDOM");
  const [selectedTime, setSelectedTime] = useState<TimeOption>(0);
  const [loading, setLoading] = useState(false);
  const [timeMenuOpen, setTimeMenuOpen] = useState(false);
  const timeMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!hasHydrated) return;

    const loadProgression = async () => {
      if (isRegisteredUser) {
        try {
          const progression = await aiChallengeService.getProgression();
          const max = progression.highestUnlockedAiLevel;
          const completed = new Set<number>(progression.completedLevels);
          setMaxUnlockedLevel(max);
          setCompletedLevels(completed);
          let best = BOTS[0];
          for (const bot of BOTS) {
            if (bot.level <= max) best = bot;
          }
          setSelectedBot(best);
          return;
        } catch (error) {
          console.warn("Failed to load backend AI progression, falling back to local progress.", error);
        }
      }

      const max = getMaxUnlockedBotLevel();
      const completed = new Set<number>(getCompletedBotLevels());
      setMaxUnlockedLevel(max);
      setCompletedLevels(completed);
      let best = BOTS[0];
      for (const bot of BOTS) {
        if (bot.level <= max) best = bot;
      }
      setSelectedBot(best);
    };

    void loadProgression();
  }, [hasHydrated, isRegisteredUser, user?.id]);

  useEffect(() => {
    if (selectedBot.level > maxUnlockedLevel) setSelectedBot(highestUnlockedBot);
  }, [highestUnlockedBot, maxUnlockedLevel, selectedBot.level]);

  useEffect(() => {
    if (!timeMenuOpen) return;
    const handler = (e: MouseEvent | TouchEvent) => {
      if (e.target instanceof Node && !timeMenuRef.current?.contains(e.target)) {
        setTimeMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler, { passive: true });
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
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
      if (finalColor === "RANDOM") finalColor = Math.random() < 0.5 ? "WHITE" : "BLACK";
      const timeSeconds = selectedTime === 0 ? 0 : selectedTime * 60;
      router.push(`/${locale}/game/local?level=${selectedBot.level}&color=${finalColor}&time=${timeSeconds}`);
    } catch (error) {
      console.error("Failed to create game:", error);
    } finally {
      setLoading(false);
    }
  };

  const timeLabel = selectedTime === 0 ? t("time.noTime") : t("time.minutes", { minutes: selectedTime });
  const colorLabel =
    selectedColor === "WHITE"
      ? t("colors.white")
      : selectedColor === "BLACK"
        ? t("colors.black")
        : t("colors.random");
  const currentUnlockedBot =
    BOTS.find((b) => b.level === maxUnlockedLevel) ?? BOTS[0];
  const nextLockedBot = BOTS.find((b) => b.level === maxUnlockedLevel + 1) ?? null;
  const headerUnlockInstruction =
    nextLockedBot === null
      ? t("unlockInstruction.allUnlocked")
      : t("unlockInstruction.message", {
        previous: currentUnlockedBot.name,
        next: nextLockedBot.name,
      });

  const isSw = locale === "sw";

  return (
    <>
    <main className="min-h-screen bg-[var(--background)] px-4 py-8 text-[var(--foreground)] sm:px-6 sm:py-10 lg:px-8 lg:py-14">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 lg:gap-8">

        {/* Hero */}
        <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] px-5 py-5 shadow-[0_24px_80px_rgba(0,0,0,0.28)] sm:px-6 sm:py-6 lg:px-8 lg:py-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(249,115,22,0.16),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(251,191,36,0.10),transparent_26%)]" />
          <div className="relative grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
            <div className="space-y-4 sm:space-y-5">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.22em] text-neutral-300">
                <Trophy className="h-3.5 w-3.5 text-[var(--primary)]" />
                {isSw ? "Fanya mazoezi na AI" : "Train with AI"}
              </div>
              <div className="space-y-2">
                <h1 className="text-3xl font-black leading-tight text-white sm:text-4xl lg:text-5xl">
                  {t("title")}
                </h1>
                <p className="hidden max-w-2xl text-base leading-7 text-neutral-300 sm:block sm:text-lg">
                  {t("subtitle")}
                </p>
              </div>
              <div className="hidden flex-wrap gap-3 lg:flex">
                <div className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-neutral-200">
                  <Swords className="h-4 w-4 text-sky-300" />
                  {isSw ? "Panda ngazi moja baada ya nyingine" : "Climb one level at a time"}
                </div>
                <div className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-neutral-200">
                  <Lock className="h-4 w-4 text-amber-300" />
                  {headerUnlockInstruction}
                </div>
              </div>
              {/* Mobile: show unlock hint */}
              <p className="inline-flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-200 lg:hidden">
                <Lock className="h-3.5 w-3.5 shrink-0" />
                {headerUnlockInstruction}
              </p>
            </div>

            {/* Stats — desktop only */}
            <div className="hidden gap-3 lg:grid lg:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4">
                <div className="text-2xl font-black text-white">{BOTS.length}</div>
                <div className="mt-1 text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">
                  {isSw ? "Wapinzani" : "Opponents"}
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4">
                <div className="text-2xl font-black text-white">{maxUnlockedLevel}</div>
                <div className="mt-1 text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">
                  {isSw ? "Ngazi zilizofunguliwa" : "Levels unlocked"}
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4">
                <div className="text-2xl font-black text-amber-300">{completedLevels.size}</div>
                <div className="mt-1 text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">
                  {isSw ? "Zilizoshindwa" : "Beaten"}
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8 items-start pb-44">

          {/* ── Left: Bot roster ─────────────────────────────── */}
          <div className="space-y-8">
            {TIERS.map((tier) => {
              const tierBots = BOTS.filter(
                (b) => b.level >= tier.range[0] && b.level <= tier.range[1]
              );
              return (
                <section key={tier.label}>
                  {/* Tier header */}
                  <div className={clsx("flex items-center gap-2 mb-3 pb-2 border-b", tier.border)}>
                    <span className={clsx("flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest", tier.accent)}>
                      {tier.icon} {tier.label}
                    </span>
                    <div className="flex-1" />
                    <span className="text-[10px] text-neutral-600 font-mono">
                      {tier.range[0]}–{tier.range[1]}
                    </span>
                  </div>

                  {/* Bot grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                    {tierBots.map((bot) => (
                      <BotCard
                        key={bot.level}
                        bot={bot}
                        selected={selectedBot.level === bot.level}
                        locked={bot.level > maxUnlockedLevel}
                        completed={completedLevels.has(bot.level)}
                        lockedLabel={t("lockedShort")}
                        unlockInstruction={t("unlockInstruction.message", {
                          previous: (BOTS.find((b) => b.level === bot.level - 1)?.name ?? currentUnlockedBot.name),
                          next: bot.name,
                        })}
                        onClick={() => { if (bot.level <= maxUnlockedLevel) setSelectedBot(bot); }}
                      />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>

          {/* ── Right: Config sidebar ────────────────────────── */}
          <aside className="hidden lg:block space-y-4 sticky top-6">
            <SelectedBotPanel
              bot={selectedBot}
              userRating={userRating}
              userName={user?.username ?? t("preview.you")}
              timeLabel={timeLabel}
              colorLabel={colorLabel}
            />

            {/* Time picker */}
            <div ref={timeMenuRef} className="relative">
              <button
                type="button"
                onClick={() => setTimeMenuOpen((o) => !o)}
                aria-expanded={timeMenuOpen}
                className="w-full rounded-xl border border-neutral-800 bg-neutral-900/40 px-4 py-3 text-sm font-semibold text-neutral-100 flex items-center justify-between gap-2 hover:bg-neutral-900/70 transition focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/50"
              >
                <span className="inline-flex items-center gap-2">
                  <Clock className="h-4 w-4 text-neutral-400" />
                  {timeLabel}
                </span>
                <ChevronDown className={clsx("h-4 w-4 text-neutral-400 transition-transform duration-200", timeMenuOpen && "rotate-180")} />
              </button>
              {timeMenuOpen && (
                <div className="absolute bottom-full mb-2 left-0 right-0 rounded-2xl border border-neutral-800 bg-neutral-950/98 p-2 shadow-2xl z-20">
                  <div className="grid grid-cols-2 gap-2">
                    {TIME_OPTIONS.map((time) => (
                      <button
                        key={time}
                        type="button"
                        onClick={() => { setSelectedTime(time); setTimeMenuOpen(false); }}
                        aria-pressed={selectedTime === time}
                        className={clsx(
                          "rounded-xl border px-3 py-2.5 text-sm font-semibold transition text-center",
                          selectedTime === time
                            ? "border-[var(--primary)]/60 bg-[var(--primary)]/10 text-orange-100"
                            : "border-neutral-800 bg-neutral-900/40 text-neutral-200 hover:bg-neutral-900/70"
                        )}
                      >
                        {time === 0 ? t("time.noTime") : t("time.minutes", { minutes: time })}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Color picker */}
            <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-3">
              <div className="text-xs text-neutral-500 mb-2 uppercase tracking-wider">{t("selectColor")}</div>
              <div className="flex gap-2" role="group" aria-label={t("selectColor")}>
                {(["WHITE", "RANDOM", "BLACK"] as const).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setSelectedColor(c)}
                    aria-pressed={selectedColor === c}
                    aria-label={c === "WHITE" ? t("colors.white") : c === "BLACK" ? t("colors.black") : t("colors.random")}
                    className={clsx(
                      "flex-1 flex flex-col items-center gap-1.5 rounded-xl border py-2.5 text-xs font-semibold transition",
                      selectedColor === c
                        ? "border-[var(--primary)]/60 bg-[var(--primary)]/10 text-orange-100"
                        : "border-neutral-800 text-neutral-400 hover:bg-neutral-900/70"
                    )}
                  >
                    <div className={clsx(
                      "w-5 h-5 rounded-full border",
                      c === "WHITE"
                        ? "bg-white border-neutral-300"
                        : c === "BLACK"
                          ? "bg-neutral-900 border-neutral-600"
                          : "bg-gradient-to-r from-white to-black border-neutral-600"
                    )} />
                    {c === "WHITE" ? t("colors.white") : c === "BLACK" ? t("colors.black") : t("colors.random")}
                  </button>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>

    {/* ── Sticky bottom bar ──────────────────────────────────────── */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-neutral-800 bg-neutral-950/95 backdrop-blur-md">
        <div className="mx-auto w-full max-w-7xl px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+12px)]">

          {/* Mobile only: compact controls */}
          <div className="flex lg:hidden items-center gap-2 mb-3">
            <div ref={timeMenuRef} className="relative flex-1">
              <button
                type="button"
                onClick={() => setTimeMenuOpen((o) => !o)}
                className="w-full rounded-xl border border-neutral-800 bg-neutral-900/40 px-3 py-2.5 text-sm font-semibold text-neutral-100 flex items-center justify-between gap-2 focus:outline-none"
              >
                <span className="inline-flex items-center gap-2">
                  <Clock className="h-4 w-4 text-neutral-400" />
                  {timeLabel}
                </span>
                <ChevronDown className="h-4 w-4 text-neutral-400" />
              </button>
              {timeMenuOpen && (
                <div className="absolute bottom-full mb-2 left-0 right-0 rounded-2xl border border-neutral-800 bg-neutral-950/98 p-2 shadow-2xl z-20">
                  <div className="grid grid-cols-2 gap-2">
                    {TIME_OPTIONS.map((time) => (
                      <button
                        key={time}
                        type="button"
                        onClick={() => { setSelectedTime(time); setTimeMenuOpen(false); }}
                        aria-pressed={selectedTime === time}
                        className={clsx(
                          "rounded-xl border px-3 py-2.5 text-sm font-semibold transition text-center",
                          selectedTime === time
                            ? "border-[var(--primary)]/60 bg-[var(--primary)]/10 text-orange-100"
                            : "border-neutral-800 bg-neutral-900/40 text-neutral-200"
                        )}
                      >
                        {time === 0 ? t("time.noTime") : t("time.minutes", { minutes: time })}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="inline-flex items-center rounded-xl border border-neutral-800 bg-neutral-900/40 p-1" role="group">
              {(["WHITE", "RANDOM", "BLACK"] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setSelectedColor(c)}
                  aria-pressed={selectedColor === c}
                  className={clsx("rounded-lg p-2 transition", selectedColor === c ? "bg-[var(--primary)]/15" : "hover:bg-neutral-900/70")}
                >
                  <div className={clsx(
                    "w-5 h-5 rounded-full border",
                    c === "WHITE" ? "bg-white border-neutral-300" :
                      c === "BLACK" ? "bg-neutral-900 border-neutral-600" :
                        "bg-gradient-to-r from-white to-black border-neutral-600"
                  )} />
                </button>
              ))}
            </div>
          </div>

          <Button
            size="lg"
            className="w-full text-lg font-bold py-5"
            onClick={handleStartGame}
            disabled={loading}
          >
            {loading ? (
              <><Loader2 className="mr-2 h-5 w-5 animate-spin" />{t("start.loading")}</>
            ) : (
              <>{t("start.cta")} — {selectedBot.name}</>
            )}
          </Button>
        </div>
      </div>
    </>
  );
}
