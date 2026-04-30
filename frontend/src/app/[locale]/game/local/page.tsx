"use client";

import React, { useMemo, useEffect, useState } from "react";
import { useSearchParams, useParams } from "next/navigation";
import { useRouter } from "@/i18n/routing";
import { Board } from "@/components/game/Board";
import { Button } from "@/components/ui/Button";
import { useLocalGame, getSavedGamePlayerColor } from "@/hooks/useLocalGame";
import { getBotByLevel, type BotProfile } from "@/lib/game/bots";
import { useAuthStore } from "@/lib/auth/auth-store";
import { PlayerColor, Winner } from "@tzdraft/mkaguzi-engine";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { getMaxUnlockedBotLevel, TOTAL_BOT_LEVELS, BOT_TIERS, INITIAL_FREE_LEVELS } from "@/lib/game/bot-progression";
import { aiChallengeService, type AiChallengeResult } from "@/services/ai-challenge.service";
import {
  AlertTriangle,
  ArrowRight,
  Crown,
  Handshake,
  Lightbulb,
  RotateCcw,
  Skull,
  Trophy,
  ChevronLeft,
  ChevronRight,
  Settings,
  Volume2,
  VolumeX,
  Undo2,
  X,
  Home,
} from "lucide-react";
import { isMobileApp } from "@/lib/game/platform";
import clsx from "clsx";
import { GameControls } from "@/components/game/GameControls";

/* ─── Helpers ──────────────────────────────────────────────────────────── */

const parseColor = (value: string | null, level?: number): PlayerColor => {
  // If there is an in-progress saved game for this level, always resume with
  // its color — regardless of what the setup page sent.  This prevents a
  // color mismatch (WHITE vs BLACK, or a fresh random roll) from wiping the
  // saved game when the player navigates back and re-selects the same bot.
  if (level !== undefined) {
    const saved = getSavedGamePlayerColor(level);
    if (saved !== null) return saved;
  }
  if (!value) return PlayerColor.WHITE;
  const upper = value.toUpperCase();
  if (upper === "BLACK") return PlayerColor.BLACK;
  if (upper === "WHITE") return PlayerColor.WHITE;
  if (upper === "RANDOM") return Math.random() < 0.5 ? PlayerColor.WHITE : PlayerColor.BLACK;
  return PlayerColor.WHITE;
};

const parseLevel = (value: string | null): number => {
  const parsed = Number(value);
  if (Number.isNaN(parsed)) return 1;
  return Math.min(Math.max(parsed, 1), TOTAL_BOT_LEVELS);
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
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
};

/* ─── Resign Card ─────────────────────────────────────────────────────── */

/* ─── Tier Unlock Overlay ───────────────────────────────────────────────── */

const TIER_UNLOCK_DATA = [
  null, // tier 0 (Beginner) — never triggers
  {
    label: "CASUAL TIER UNLOCKED",
    title: "The warmup is over.",
    body: "Your next opponents have been watching. They know your patterns. Don't get comfortable.",
    cta: "I'm ready.",
    accentColor: "emerald" as const,
  },
  {
    label: "COMPETITIVE TIER UNLOCKED",
    title: "Something stronger awakens.",
    body: "You've stepped into Sidra's territory. These opponents calculate faster than you think. Every mistake will be punished without mercy.",
    cta: "I understand the risk.",
    accentColor: "red" as const,
  },
  {
    label: "EXPERT TIER UNLOCKED",
    title: "They know no mercy.",
    body: "Few players reach this tier. Fewer survive it. Your opponent sees 12 moves ahead. You've been warned.",
    cta: "Show me what's waiting.",
    accentColor: "red" as const,
  },
  {
    label: "UNDISPUTED TIER UNLOCKED",
    title: "This is the end.",
    body: "You've come further than most dare to try. The final opponents are relentless. There is no undo. There is no coming back from this.",
    cta: "Face it.",
    accentColor: "red" as const,
  },
] as const;

function TierUnlockOverlay({ newMaxLevel, onContinue }: { newMaxLevel: number; onContinue: () => void }) {
  const tierIdx = BOT_TIERS.findIndex(([start]) => start === newMaxLevel);
  const data = tierIdx >= 0 ? TIER_UNLOCK_DATA[tierIdx] : null;
  if (!data) return null;

  const isRed = data.accentColor === "red";
  const accentText = isRed ? "text-red-400" : "text-emerald-400";
  const accentBorder = isRed ? "border-red-500/40" : "border-emerald-500/40";
  const accentBg = isRed ? "bg-red-500/10" : "bg-emerald-500/10";
  const accentGlow = isRed ? "animate-tier-unlock-pulse" : "";
  const btnClass = isRed
    ? "bg-red-700/80 hover:bg-red-600 border-red-600 text-white"
    : "bg-emerald-700/80 hover:bg-emerald-600 border-emerald-600 text-white";

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-tier-unlock-enter"
      style={{ background: "radial-gradient(ellipse at center, rgba(30,0,0,0.97) 0%, rgba(0,0,0,0.99) 100%)" }}>
      <div className={`animate-tier-unlock-card w-full max-w-sm rounded-2xl border ${accentBorder} bg-neutral-950 shadow-2xl overflow-hidden`}>
        {/* Top glow bar */}
        <div className={`h-0.5 w-full ${isRed ? "bg-gradient-to-r from-transparent via-red-500 to-transparent" : "bg-gradient-to-r from-transparent via-emerald-500 to-transparent"}`} />

        {/* Icon header */}
        <div className="flex flex-col items-center pt-8 pb-4 px-6 gap-4">
          <div className={`w-16 h-16 rounded-full ${accentBg} border ${accentBorder} flex items-center justify-center ${accentGlow}`}>
            <Skull className={`w-8 h-8 ${accentText}`} />
          </div>
          <div className={`text-[10px] font-black uppercase tracking-[0.3em] ${accentText} animate-tier-unlock-flicker`}>
            {data.label}
          </div>
          <h2 className="text-xl font-black text-white text-center leading-snug">
            {data.title}
          </h2>
        </div>

        {/* Body */}
        <div className="px-6 pb-6 text-sm text-neutral-400 text-center leading-relaxed">
          {data.body}
        </div>

        {/* CTA */}
        <div className="px-6 pb-7">
          <button
            type="button"
            onClick={onContinue}
            className={`w-full rounded-xl border px-4 py-3 text-sm font-bold transition ${btnClass}`}
          >
            {data.cta}
          </button>
        </div>

        {/* Bottom glow bar */}
        <div className={`h-0.5 w-full ${isRed ? "bg-gradient-to-r from-transparent via-red-500/50 to-transparent" : "bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent"}`} />
      </div>
    </div>
  );
}

interface ResignCardProps {
  botName: string;
  onConfirm: () => void;
  onCancel: () => void;
  t: ReturnType<typeof useTranslations<"gameArena">>;
}

function ResignCard({ botName, onConfirm, onCancel, t }: ResignCardProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onCancel}>
      <div className="w-full max-w-sm animate-result-enter rounded-2xl overflow-hidden border border-neutral-700/80 bg-neutral-900 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {/* Warning stripe */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-neutral-800 bg-orange-500/8">
          <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-orange-500/15 border border-orange-500/30">
            <AlertTriangle className="w-5 h-5 text-orange-400" />
          </div>
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-orange-400/80 font-semibold">
              {t("resign.confirmTitle")}
            </div>
            <div className="text-base font-bold text-neutral-100 mt-0.5">
              {t("resign.confirmQuestion")}
            </div>
          </div>
        </div>

        <div className="px-5 py-4 text-sm text-neutral-400">
          Giving up against <span className="font-semibold text-neutral-200">{botName}</span>?
          You won&apos;t earn progression from this game.
        </div>

        <div className="px-5 pb-5 flex flex-col gap-2">
          <Button onClick={onConfirm} className="w-full bg-rose-600 hover:bg-rose-500 border-rose-700">
            {t("resign.confirmCta")}
          </Button>
          <Button variant="secondary" onClick={onCancel} className="w-full">
            {t("resign.cancel")}
          </Button>
        </div>
      </div>
    </div>
  );
}

function LeaveGameCard({ botName, onConfirm, onCancel }: { botName: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onCancel}>
      <div className="w-full max-w-sm animate-result-enter rounded-2xl overflow-hidden border border-neutral-700/80 bg-neutral-900 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-5 py-4 border-b border-neutral-800 bg-rose-500/8">
          <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-rose-500/15 border border-rose-500/30">
            <X className="w-5 h-5 text-rose-400" />
          </div>
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-rose-400/80 font-semibold">Leave game</div>
            <div className="text-base font-bold text-neutral-100 mt-0.5">Resign and exit?</div>
          </div>
        </div>
        <div className="px-5 py-4 text-sm text-neutral-400">
          Leaving will count as a resignation against <span className="font-semibold text-neutral-200">{botName}</span>. Your progress in this game will be lost.
        </div>
        <div className="px-5 pb-5 flex flex-col gap-2">
          <Button onClick={onConfirm} className="w-full bg-rose-600 hover:bg-rose-500 border-rose-700">
            Resign and leave
          </Button>
          <Button variant="secondary" onClick={onCancel} className="w-full">
            Stay in game
          </Button>
        </div>
      </div>
    </div>
  );
}

interface OptionsCardProps {
  onHome: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  onClose: () => void;
  t: ReturnType<typeof useTranslations<"gameArena">>;
}

function OptionsCard({ onHome, isMuted, onToggleMute, onClose, t }: OptionsCardProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-sm animate-result-enter rounded-2xl overflow-hidden border border-neutral-700/80 bg-neutral-900 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-neutral-800 border border-neutral-700">
              <Settings className="w-4 h-4 text-neutral-400" />
            </div>
            <span className="font-bold text-neutral-100">{t("actions.settings")}</span>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-neutral-800 rounded-lg transition-colors">
            <X className="w-5 h-5 text-neutral-500" />
          </button>
        </div>

        <div className="p-5 flex flex-col gap-3">
          {/* Home Button */}
          <button
            onClick={onHome}
            className="flex items-center justify-between w-full p-4 rounded-xl bg-neutral-800/50 hover:bg-neutral-800 border border-neutral-700/50 transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-amber-500/10 border border-amber-500/20 group-hover:border-amber-500/40">
                <Home className="w-5 h-5 text-amber-500" />
              </div>
              <div className="text-left">
                <div className="text-sm font-bold text-neutral-200">{t("actions.home")}</div>
                <div className="text-[10px] text-neutral-500">Go to main lobby</div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-neutral-600" />
          </button>

          {/* Mute Toggle */}
          <button
            onClick={onToggleMute}
            className="flex items-center justify-between w-full p-4 rounded-xl bg-neutral-800/50 hover:bg-neutral-800 border border-neutral-700/50 transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className={clsx(
                "w-10 h-10 rounded-xl flex items-center justify-center border transition-all",
                isMuted 
                  ? "bg-rose-500/10 border-rose-500/20 group-hover:border-rose-500/40" 
                  : "bg-emerald-500/10 border-emerald-500/20 group-hover:border-emerald-500/40"
              )}>
                {isMuted ? <VolumeX className="w-5 h-5 text-rose-500" /> : <Volume2 className="w-5 h-5 text-emerald-500" />}
              </div>
              <div className="text-left">
                <div className="text-sm font-bold text-neutral-200">{isMuted ? t("actions.unmute") : t("actions.mute")}</div>
                <div className="text-[10px] text-neutral-500">Game sounds and alerts</div>
              </div>
            </div>
            <div className={clsx(
              "w-8 h-4 rounded-full relative transition-all",
              isMuted ? "bg-neutral-700" : "bg-emerald-600"
            )}>
              <div className={clsx(
                "absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all shadow-sm",
                isMuted ? "left-0.5" : "left-4.5"
              )} />
            </div>
          </button>
        </div>

        <div className="px-5 pb-5 mt-2">
          <Button variant="secondary" onClick={onClose} className="w-full">
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ─── Game Result Card ────────────────────────────────────────────────── */

type GameResultOutcome = "win" | "loss" | "draw";

interface GameResultCardProps {
  result: Winner;
  drawReason?: string;
  bot: BotProfile;
  playerColor: PlayerColor;
  moveCount: number;
  userRating: number;
  userName: string;
  canOfferNextBot: boolean;
  isNewUnlock: boolean;
  nextBotLevel: number;
  nextBot?: BotProfile;
  locale: string;
  timeSeconds: number;
  undoUsed: boolean;
  hintUsed: boolean;
  onPlayAgain: () => void;
  onNextBot: () => void;
  onChangeBots: () => void;
  t: ReturnType<typeof useTranslations<"gameArena">>;
}

function drawReasonLabel(reason?: string): string {
  switch (reason) {
    case "repetition":   return "Draw by threefold repetition";
    case "30-move":      return "Draw by 30-move rule";
    case "three-kings":  return "Draw by three-kings rule";
    case "endgame":      return "Draw by endgame rule";
    default:             return "The game ended in a draw";
  }
}

function GameResultCard({
  result,
  drawReason,
  bot,
  playerColor,
  moveCount,
  userRating,
  userName,
  canOfferNextBot,
  isNewUnlock,
  nextBotLevel,
  nextBot,
  undoUsed,
  hintUsed,
  onPlayAgain,
  onNextBot,
  onChangeBots,
  t,
}: GameResultCardProps) {
  const outcome: GameResultOutcome =
    result === Winner.DRAW
      ? "draw"
      : ((result === Winner.WHITE) === (playerColor === PlayerColor.WHITE))
        ? "win"
        : "loss";

  const cfg = {
    win: {
      label: "Victory!",
      sublabel: "You defeated",
      icon: <Crown className="w-8 h-8" />,
      bannerBg: "from-amber-600/90 via-orange-500/80 to-yellow-600/60",
      headerBg: "bg-gradient-to-br from-amber-950/80 via-neutral-900 to-neutral-900",
      borderColor: "border-amber-500/40",
      iconBg: "bg-amber-500/20 border-amber-500/40",
      iconColor: "text-amber-300",
      tagBg: "bg-amber-500/10 border-amber-500/30 text-amber-200",
      accentText: "text-amber-300",
      glowClass: "shadow-[0_0_40px_rgba(251,191,36,0.15)]",
    },
    loss: {
      label: "Defeated",
      sublabel: "Lost to",
      icon: <Skull className="w-8 h-8" />,
      bannerBg: "from-rose-700/80 via-rose-800/50 to-neutral-900/60",
      headerBg: "bg-gradient-to-br from-rose-950/80 via-neutral-900 to-neutral-900",
      borderColor: "border-rose-500/30",
      iconBg: "bg-rose-500/15 border-rose-500/30",
      iconColor: "text-rose-400",
      tagBg: "bg-rose-500/10 border-rose-500/30 text-rose-300",
      accentText: "text-rose-400",
      glowClass: "shadow-[0_0_40px_rgba(244,63,94,0.10)]",
    },
    draw: {
      label: "Draw",
      sublabel: "Tied with",
      icon: <Handshake className="w-8 h-8" />,
      bannerBg: "from-sky-700/70 via-sky-800/40 to-neutral-900/60",
      headerBg: "bg-gradient-to-br from-sky-950/80 via-neutral-900 to-neutral-900",
      borderColor: "border-sky-500/30",
      iconBg: "bg-sky-500/15 border-sky-500/30",
      iconColor: "text-sky-400",
      tagBg: "bg-sky-500/10 border-sky-500/30 text-sky-300",
      accentText: "text-sky-400",
      glowClass: "shadow-[0_0_40px_rgba(56,189,248,0.10)]",
    },
  }[outcome];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
      <div
        className={clsx(
          "w-full max-w-md animate-result-enter rounded-2xl overflow-hidden border",
          cfg.borderColor,
          cfg.glowClass,
          "bg-neutral-950",
        )}
      >
        {/* ── Hero banner with bot portrait ── */}
        <div className="relative w-full h-48 overflow-hidden">
          {/* Bot portrait — clean, no color tint */}
          <Image
            src={bot.avatarSrc}
            alt={bot.name}
            fill
            sizes="448px"
            className="object-cover object-top"
            priority
          />
          {/* Subtle dark scrim at bottom for text legibility only */}
          <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-neutral-950/85 to-transparent" />

          {/* Outcome icon + label — anchored to bottom of banner */}
          <div className="absolute inset-x-0 bottom-4 flex flex-col items-center gap-1.5">
            <div className={clsx("flex items-center justify-center w-14 h-14 rounded-full border-2 backdrop-blur-sm", cfg.iconBg, cfg.iconColor)}>
              {cfg.icon}
            </div>
            <div className={clsx("text-3xl font-black tracking-tight drop-shadow-lg", cfg.accentText)}>
              {cfg.label}
            </div>
            <div className="text-sm text-white/70">
              {cfg.sublabel} <span className="font-bold text-white">{bot.name}</span>
            </div>
            {outcome === "draw" && (
              <div className="text-xs text-sky-300/80 mt-0.5">{drawReasonLabel(drawReason)}</div>
            )}
          </div>

          {/* ELO badge top-right */}
          <div className={clsx("absolute top-3 right-3 rounded-full border px-2.5 py-1 text-[11px] font-mono backdrop-blur-sm", cfg.tagBg)}>
            ELO {bot.elo}
          </div>
        </div>

        {/* ── Stats row ── */}
        <div className="grid grid-cols-3 divide-x divide-neutral-800 border-b border-neutral-800">
          {[
            { label: "Moves", value: moveCount },
            { label: "Bot Level", value: `Lv.${bot.level}` },
            { label: "Your Rating", value: userRating },
          ].map(({ label, value }) => (
            <div key={label} className="flex flex-col items-center py-3 px-2">
              <div className="text-[10px] uppercase tracking-widest text-neutral-500">{label}</div>
              <div className="text-base font-bold text-white mt-0.5">{value}</div>
            </div>
          ))}
        </div>

        {/* ── Undo notice ── */}
        {undoUsed && (
          <div className="mx-4 mt-4 flex items-center gap-2 rounded-lg border border-neutral-700/60 bg-neutral-800/40 px-3 py-2 text-xs text-neutral-400">
            <Trophy className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
            Progress not saved — Undo was used this game.
          </div>
        )}

        {/* ── Hint notice ── */}
        {hintUsed && !undoUsed && (
          <div className="mx-4 mt-4 flex items-center gap-2 rounded-lg border border-neutral-700/60 bg-neutral-800/40 px-3 py-2 text-xs text-neutral-400">
            <Lightbulb className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
            Progress not saved — Hint was used this game.
          </div>
        )}

        {/* ── Progression notice ── */}
        {canOfferNextBot && isNewUnlock && (
          // First win: celebratory "you unlocked level X" banner
          <div className={clsx("mx-4 mt-4 flex items-center gap-2 rounded-lg border px-3 py-2 text-xs", cfg.tagBg)}>
            <Trophy className={clsx("w-3.5 h-3.5 shrink-0", cfg.iconColor)} />
            <span>{t("gameOver.unlockedNext", { level: nextBotLevel })}</span>
          </div>
        )}
        {canOfferNextBot && !isNewUnlock && outcome === "win" && (
          // Replay win: low-key "already conquered" note instead
          <div className="mx-4 mt-4 flex items-center gap-2 rounded-lg border border-neutral-700/50 bg-neutral-800/30 px-3 py-2 text-xs text-neutral-400">
            <Crown className="w-3.5 h-3.5 text-amber-500/70 shrink-0" />
            <span>Already conquered — want to push further?</span>
          </div>
        )}

        {/* ── Action buttons ── */}
        <div className="p-4 flex flex-col gap-2.5">
          {/* Next opponent CTA — primary styling on new unlock, subtle on replay */}
          {canOfferNextBot && (
            <button
              onClick={onNextBot}
              className={clsx(
                "w-full flex items-center justify-between gap-3 rounded-xl border px-4 py-3 font-bold transition hover:opacity-90",
                isNewUnlock
                  ? clsx(cfg.borderColor, "bg-gradient-to-r", outcome === "win" ? "from-amber-600/80 to-orange-600/80" : "from-neutral-800 to-neutral-800")
                  : "border-neutral-700 bg-neutral-800/60 hover:bg-neutral-800",
                "text-white"
              )}
            >
              <div className="flex items-center gap-3 min-w-0">
                {nextBot && (
                  <div className="relative w-9 h-9 rounded-full overflow-hidden border border-white/20 shrink-0">
                    <Image src={nextBot.avatarSrc} alt={nextBot.name} fill sizes="36px" className="object-cover object-top" />
                  </div>
                )}
                <div className="text-left min-w-0">
                  <div className="text-sm font-bold truncate">{isNewUnlock ? t("gameOver.nextBot") : "Next Opponent"}</div>
                  {nextBot && (
                    <div className="text-[11px] text-white/60 font-mono">{nextBot.name} · ELO {nextBot.elo}</div>
                  )}
                </div>
              </div>
              <ArrowRight className="w-5 h-5 shrink-0 opacity-80" />
            </button>
          )}

          <div className="flex gap-2">
            <button
              onClick={onPlayAgain}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-neutral-700 bg-neutral-800/60 px-4 py-2.5 text-sm font-semibold text-neutral-100 hover:bg-neutral-800 transition"
            >
              <RotateCcw className="w-4 h-4" />
              {t("gameOver.playAgain")}
            </button>
            <button
              onClick={onChangeBots}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-neutral-700 bg-neutral-800/60 px-4 py-2.5 text-sm font-semibold text-neutral-100 hover:bg-neutral-800 transition"
            >
              <Trophy className="w-4 h-4 text-neutral-400" />
              {t("gameOver.endGame")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Page ─────────────────────────────────────────────────────────────── */

export default function LocalGamePage() {
  const t = useTranslations("gameArena");
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const paramsRoute = useParams<{ locale: string }>();
  const locale = paramsRoute?.locale ?? "en";
  const setupAiPath = "/game/setup-ai";
  const params = useSearchParams();
  const level = useMemo(() => parseLevel(params.get("level")), [params]);
  const playerColorParam = useMemo(() => params.get("color"), [params]);
  const playerColor = useMemo(() => parseColor(playerColorParam, level), [playerColorParam, level]);
  const timeSeconds = useMemo(() => parseTime(params.get("time")), [params]);
  const bot = useMemo(() => getBotByLevel(level), [level]);
  const nextBot = useMemo(() => getBotByLevel(Math.min(level + 1, TOTAL_BOT_LEVELS)), [level]);
  const { user, isAuthenticated, hasHydrated } = useAuthStore();
  const isRegisteredUser =
    hasHydrated &&
    isAuthenticated &&
    user?.accountType === "REGISTERED" &&
    Boolean(user?.id);
  // Bug fix: initialize to INITIAL_FREE_LEVELS to avoid flash of redirect before mount effect runs
  const [maxUnlockedAtStart, setMaxUnlockedAtStart] = useState(INITIAL_FREE_LEVELS);
  const [maxUnlockedNow, setMaxUnlockedNow] = useState(INITIAL_FREE_LEVELS);
  const [tierUnlockLevel, setTierUnlockLevel] = useState<number | null>(null);
  // true only when this specific game advanced the player's progression (first win of this level)
  const [isNewUnlock, setIsNewUnlock] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionReported, setSessionReported] = useState(false);
  const [gameRunKey, setGameRunKey] = useState(0);

  const {
    state, pieces, lastMove, capturedGhosts, hintMove, legalMoves, forcedPieces, flipBoard, engineReady, playWarning,
    undo, resign, makeMove, reset, getHint,
    goBack, goForward, goToStart, goToEnd, goToMove,
    isMuted, toggleMute
  } = useLocalGame(level, playerColor, timeSeconds, !isRegisteredUser);
  const [showResign, setShowResign] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [showLeave, setShowLeave] = useState(false);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setMounted(true); }, []);

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
    if (!hasHydrated) return;

    const loadProgression = async () => {
      if (isRegisteredUser) {
        try {
          const progression = await aiChallengeService.getProgression();
          const max = progression.highestUnlockedAiLevel;
          setMaxUnlockedAtStart(max);
          setMaxUnlockedNow(max);
          if (level > max) router.replace(setupAiPath);
          return;
        } catch (error) {
          console.warn("Failed to load backend AI progression, falling back to local progress.", error);
        }
      }

      const max = getMaxUnlockedBotLevel();
      setMaxUnlockedAtStart(max);
      setMaxUnlockedNow(max);
      if (level > max) router.replace(setupAiPath);
    };

    void loadProgression();
  }, [hasHydrated, isRegisteredUser, level, router, setupAiPath, user?.id]);

  useEffect(() => {
    if (!hasHydrated || !isRegisteredUser || !user?.id) {
      setSessionId(null);
      setSessionReported(false);
      return;
    }

    let cancelled = false;

    const startSession = async () => {
      try {
        const { sessionId: createdSessionId, progression } = await aiChallengeService.startSession({
          aiLevel: level,
          playerColor: playerColor === PlayerColor.WHITE ? "WHITE" : "BLACK",
        });
        if (cancelled) return;
        setSessionId(createdSessionId);
        setSessionReported(false);
        setMaxUnlockedAtStart(progression.highestUnlockedAiLevel);
        setMaxUnlockedNow(progression.highestUnlockedAiLevel);
      } catch (error) {
        console.warn("Failed to start backend AI session.", error);
      }
    };

    void startSession();

    return () => {
      cancelled = true;
    };
  }, [gameRunKey, hasHydrated, isRegisteredUser, level, playerColor, user?.id]);

  useEffect(() => {
    if (!state.result) {
      // Reset per-game flags when the game resets
      setIsNewUnlock(false);
      return;
    }
    if (isRegisteredUser) {
      return;
    }
    const newMax = getMaxUnlockedBotLevel();
    setMaxUnlockedNow(newMax);
    if (!state.hintUsed && newMax > maxUnlockedAtStart) {
      setIsNewUnlock(true);
      setMaxUnlockedAtStart(newMax);
      // Only show the tier overlay when newMax is the start of a new tier
      // (4, 8, 12, 17). For wins within the same tier, skip the overlay.
      const isTierStart = BOT_TIERS.some(([start]) => start === newMax);
      if (isTierStart) {
        setTierUnlockLevel(newMax);
      }
    } else {
      setIsNewUnlock(false);
    }
  }, [isRegisteredUser, maxUnlockedAtStart, state.result, user?.id]);

  useEffect(() => {
    if (!state.result || !sessionId || sessionReported || !isRegisteredUser || !user?.id) return;

    let cancelled = false;
    const completeSession = async () => {
      const humanWon =
        state.result?.winner !== Winner.DRAW &&
        ((state.result?.winner === Winner.WHITE) === (playerColor === PlayerColor.WHITE));
      const result: AiChallengeResult =
        state.result?.winner === Winner.DRAW
          ? "DRAW"
          : humanWon
            ? "WIN"
            : "LOSS";

      try {
        const progression = await aiChallengeService.completeSession(sessionId, {
          result,
          undoUsed: state.undoUsed,
          hintUsed: state.hintUsed,
        });
        if (cancelled) return;
        setSessionReported(true);
        setMaxUnlockedNow(progression.highestUnlockedAiLevel);
        if (!state.hintUsed && progression.highestUnlockedAiLevel > maxUnlockedAtStart) {
          setIsNewUnlock(true);
          setMaxUnlockedAtStart(progression.highestUnlockedAiLevel);
          const isTierStart = BOT_TIERS.some(([start]) => start === progression.highestUnlockedAiLevel);
          if (isTierStart) {
            setTierUnlockLevel(progression.highestUnlockedAiLevel);
          }
        } else {
          setIsNewUnlock(false);
        }
      } catch (error) {
        console.warn("Failed to complete backend AI session.", error);
      }
    };

    void completeSession();

    return () => {
      cancelled = true;
    };
  }, [isRegisteredUser, maxUnlockedAtStart, playerColor, sessionId, sessionReported, state.result, state.undoUsed, user?.id]);

  const handleResetGame = () => {
    reset();
    setSessionId(null);
    setSessionReported(false);
    setGameRunKey((current) => current + 1);
  };

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
  const botColor = playerColor === PlayerColor.WHITE ? PlayerColor.BLACK : PlayerColor.WHITE;
  const nextBotLevel = Math.min(level + 1, TOTAL_BOT_LEVELS);
  const didHumanWin =
    state.result?.winner === (playerColor === PlayerColor.WHITE ? Winner.WHITE : Winner.BLACK);
  const canOfferNextBot =
    Boolean(state.result) &&
    didHumanWin &&
    !state.undoUsed &&
    !state.hintUsed &&
    level < TOTAL_BOT_LEVELS &&
    nextBotLevel <= maxUnlockedNow &&
    (maxUnlockedNow > maxUnlockedAtStart || nextBotLevel <= maxUnlockedAtStart);

  const timeFor = (color: PlayerColor) =>
    formatTime(color === PlayerColor.WHITE ? state.timeLeft.WHITE : state.timeLeft.BLACK);

  const handleLeaveOrBack = () => {
    // On mobile app, we always prompt to resign if a game is in progress.
    // On desktop, we follow standard navigation back to setup.
    const isMobile = isMobileApp();
    
    if (isMobile && !state.result) {
      setShowLeave(true);
    } else {
      if (isMobile) {
        router.replace(setupAiPath);
      } else {
        router.push(setupAiPath);
      }
    }
  };

  return (
    <main className="min-h-[100svh] overflow-hidden overscroll-none flex flex-col items-center justify-start px-3 py-3 sm:p-4 gap-4 sm:gap-8">
      <div className="flex flex-col md:flex-row gap-4 sm:gap-8 w-full max-w-6xl items-stretch md:items-start justify-center">
        {/* Desktop left sidebar */}
        <div className="hidden md:flex flex-col gap-4 w-64 bg-neutral-800/50 p-4 rounded-xl border border-neutral-700/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-neutral-600 flex items-center justify-center text-sm font-bold text-neutral-100 overflow-hidden">
              <div className="relative w-full h-full">
                <Image src={topPlayer.avatarSrc} alt={topPlayer.name} fill sizes="40px" className="object-cover object-top" />
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

        {/* Board column */}
        <div className="flex-1 max-w-[650px] w-full mx-auto">
          {/* Mobile top player bar */}
          <div className="md:hidden mb-2 rounded-xl border border-neutral-700/50 bg-neutral-900/40 backdrop-blur px-3 py-2 flex items-center gap-2">
            {/* Back / leave button */}
            <button
              onClick={handleLeaveOrBack}
              className="shrink-0 flex items-center justify-center w-8 h-8 rounded-lg hover:bg-neutral-700/60 transition-colors text-neutral-400 hover:text-neutral-100"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            {/* Bot info */}
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className="w-9 h-9 rounded-full bg-neutral-700 overflow-hidden shrink-0">
                <div className="relative w-full h-full">
                  <Image src={topPlayer.avatarSrc} alt={topPlayer.name} fill sizes="36px" className="object-cover object-top" />
                </div>
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-neutral-200 truncate">{topPlayer.name}</div>
                <div className="text-xs text-neutral-500">{topPlayer.elo}</div>
              </div>
            </div>
            {/* Timer */}
            <div className="shrink-0 bg-neutral-950/60 rounded-md px-2 py-1 text-center font-mono text-base text-neutral-100 border border-neutral-700/60">
              {timeFor(botColor)}
            </div>
          </div>

          <div className="relative">
            <Board
              onMove={makeMove}
              pieces={pieces}
              lastMove={lastMove}
              capturedGhosts={capturedGhosts}
              legalMoves={legalMoves}
              forcedPieces={forcedPieces}
              flipped={flipBoard}
              onInvalidSelect={playWarning}
              readOnly={state.isAiThinking}
              hintSquares={hintMove}
            />
            {!engineReady && (
              <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
                <div className="w-7 h-7 rounded-full border-2 border-neutral-400/30 border-t-neutral-300 animate-spin" />
              </div>
            )}
          </div>

          {/* Mobile bottom player bar */}
          <div className="md:hidden mt-2 rounded-xl border border-neutral-700/50 bg-neutral-900/40 backdrop-blur px-3 py-2 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-full bg-[var(--primary)] flex items-center justify-center text-xs font-bold text-white shrink-0">
                YOU
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-neutral-200 truncate">{bottomPlayer.name}</div>
                <div className="text-xs text-neutral-500">{bottomPlayer.rating}</div>
              </div>
            </div>
            <div className="shrink-0 bg-neutral-950/60 rounded-md px-2 py-1 text-center font-mono text-base text-neutral-100 border border-neutral-700/60">
              {timeFor(playerColor)}
            </div>
          </div>

          {/* Endgame countdown */}
          {state.endgameCountdown && (
            <div className="mt-3 rounded-lg border border-orange-500/40 bg-orange-500/10 px-4 py-2 text-center text-sm text-orange-200">
              {state.endgameCountdown.favored !== null
                ? t("endgameCountdown", {
                    remaining: state.endgameCountdown.remaining,
                    favored: state.endgameCountdown.favored,
                  })
                : t("endgameCountdownEqual", {
                    remaining: state.endgameCountdown.remaining,
                  })}
            </div>
          )}

          {/* Game Navigation Strip */}
          <div className="mt-4">
            <GameControls
              moves={state.moves}
              viewingMoveIndex={state.viewingMoveIndex}
              canGoBack={state.viewingMoveIndex > 0}
              canGoForward={state.viewingMoveIndex < state.moves.length}
              onBack={goBack}
              onForward={goForward}
              onMoveClick={goToMove}
            />
          </div>
        </div>

        {/* Desktop right sidebar */}
        <div className="hidden md:flex flex-col gap-4 w-64 bg-neutral-800/50 p-4 rounded-xl border border-neutral-700/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[var(--primary)] flex items-center justify-center text-sm font-bold text-white">
              YOU
            </div>
            <div>
              <div className="font-bold text-neutral-200">{bottomPlayer.name}</div>
              <div className="text-xs text-neutral-500">{bottomPlayer.rating}</div>
            </div>
          </div>
          <div className="bg-neutral-800 rounded p-2 text-center font-mono text-xl text-white border border-neutral-600">
            {timeFor(playerColor)}
          </div>
        </div>
      </div>

      {state.undoUsed && !state.result && (
        <div className="text-sm text-neutral-400">{t("progression.disabled")}</div>
      )}

      {/* Bottom Action Bar (Chess.com Style) */}
      <div className="w-full max-w-[650px] sticky bottom-0 z-20 -mx-3 px-1 pt-2 pb-[calc(env(safe-area-inset-bottom)+0.25rem)] bg-transparent sm:static sm:mx-0 sm:px-0 sm:pt-4 sm:pb-0 sm:border-0">
        <div className="flex items-center justify-around w-full">
          {/* Options / Settings */}
          <button
            onClick={() => setShowOptions(true)}
            className="flex flex-col items-center gap-1.5 py-2 px-1 transition-all hover:bg-neutral-800/40 rounded-xl group"
          >
            <Settings className="w-6 h-6 text-neutral-500 group-hover:text-neutral-300" />
            <span className="text-[9px] font-bold uppercase tracking-wider text-neutral-500 group-hover:text-neutral-300">
              {t("actions.settings")}
            </span>
          </button>

          {/* End a Game (Resign) */}
          <button
            onClick={() => setShowResign(true)}
            className="flex flex-col items-center gap-1.5 py-2 px-1 transition-all hover:bg-neutral-800/40 rounded-xl group"
          >
            <Skull className="w-6 h-6 text-neutral-500 group-hover:text-rose-400" />
            <span className="text-[9px] font-bold uppercase tracking-wider text-neutral-500 group-hover:text-rose-400">
              {t("actions.resign")}
            </span>
          </button>

          {/* New Game (Reset) */}
          <button
            onClick={handleResetGame}
            className="flex flex-col items-center gap-1.5 py-2 px-1 transition-all hover:bg-neutral-800/40 rounded-xl group"
          >
            <RotateCcw className="w-6 h-6 text-neutral-500 group-hover:text-emerald-400" />
            <span className="text-[9px] font-bold uppercase tracking-wider text-neutral-500 group-hover:text-emerald-400">
              {t("actions.reset")}
            </span>
          </button>

          {/* Undo */}
          <button
            onClick={undo}
            className="flex flex-col items-center gap-1.5 py-2 px-1 transition-all hover:bg-neutral-800/40 rounded-xl group"
          >
            <Undo2 className="w-6 h-6 text-neutral-500 group-hover:text-amber-400" />
            <span className="text-[9px] font-bold uppercase tracking-wider text-neutral-500 group-hover:text-amber-400">
              {t("actions.undo")}
            </span>
          </button>

          {/* Hint */}
          <button
            onClick={() => { void getHint(); }}
            disabled={!!state.result || state.currentPlayer !== playerColor || state.isAiThinking}
            className="flex flex-col items-center gap-1.5 py-2 px-1 transition-all hover:bg-neutral-800/40 rounded-xl group disabled:opacity-40 disabled:pointer-events-none"
          >
            <Lightbulb className={clsx("w-6 h-6 group-hover:text-cyan-400", state.hintUsed ? "text-cyan-500" : "text-neutral-500")} />
            <span className={clsx("text-[9px] font-bold uppercase tracking-wider group-hover:text-cyan-400", state.hintUsed ? "text-cyan-600" : "text-neutral-500")}>
              Hint
            </span>
          </button>
        </div>
      </div>

      {/* Options Overlay */}
      {showOptions && (
        <OptionsCard
          isMuted={isMuted}
          onToggleMute={toggleMute}
          onHome={() => router.push("/")}
          onClose={() => setShowOptions(false)}
          t={t}
        />
      )}

      {/* Resign confirmation */}
      {showResign && (
        <ResignCard
          botName={bot.name}
          onConfirm={() => { setShowResign(false); resign(); }}
          onCancel={() => setShowResign(false)}
          t={t}
        />
      )}

      {/* Leave game confirmation (in-app back button) */}
      {showLeave && (
        <LeaveGameCard
          botName={bot.name}
          onConfirm={() => {
            setShowLeave(false);
            resign();
            if (isMobileApp()) {
              router.replace(setupAiPath);
            } else {
              router.push(setupAiPath);
            }
          }}
          onCancel={() => setShowLeave(false)}
        />
      )}

      {/* Tier unlock overlay — shown before the result card when a new tier opens */}
      {tierUnlockLevel !== null && (
        <TierUnlockOverlay
          newMaxLevel={tierUnlockLevel}
          onContinue={() => setTierUnlockLevel(null)}
        />
      )}

      {/* Game result — hidden while the tier overlay is showing */}
      {state.result && tierUnlockLevel === null && (
        <>
          <GameResultCard
            result={state.result.winner}
            drawReason={state.result.drawReason}
            bot={bot}
            playerColor={playerColor}
            moveCount={state.moveCount}
            userRating={userRating}
            userName={userLabel}
            canOfferNextBot={canOfferNextBot}
            isNewUnlock={isNewUnlock}
            nextBotLevel={nextBotLevel}
            nextBot={nextBot}
            locale={locale}
            timeSeconds={timeSeconds}
            undoUsed={state.undoUsed}
            hintUsed={state.hintUsed}
            onPlayAgain={handleResetGame}
            onNextBot={() => { reset(); router.push(`/game/local?level=${nextBotLevel}&color=${playerColor}&time=${timeSeconds}`); }}
            onChangeBots={() => router.push(setupAiPath)}
            t={t}
          />
        </>
      )}
    </main>
  );
}
