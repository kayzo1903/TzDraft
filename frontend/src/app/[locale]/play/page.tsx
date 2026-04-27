"use client";

import React from "react";
import { Link } from "@/i18n/routing";
import { useLocale, useTranslations } from "next-intl";
import {
  ArrowRight,
  Bot,
  Clock3,
  Globe,
  Sparkles,
  Swords,
  Trophy,
  Users,
} from "lucide-react";
import clsx from "clsx";
import { isMobileApp } from "@/lib/game/platform";

type ModeCard = {
  id: string;
  title: string;
  description: string;
  href: string;
  enabled: boolean;
  action: string;
  badge?: string;
  tone: string;
  glow: string;
  iconWrap: string;
  icon: React.ReactNode;
  highlights: string[];
};

function QuickStat({
  value,
  label,
}: {
  value: string;
  label: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4 text-left shadow-[0_18px_50px_rgba(0,0,0,0.2)]">
      <div className="text-2xl font-black text-white">{value}</div>
      <div className="mt-1 text-xs font-semibold uppercase tracking-[0.22em] text-neutral-500">
        {label}
      </div>
    </div>
  );
}

function ModeCard({
  mode,
  locale,
}: {
  mode: ModeCard;
  locale: string;
}) {
  return (
    <article
      className={clsx(
        "group relative overflow-hidden rounded-[2rem] border bg-neutral-950/55 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.32)] transition-all duration-300",
        mode.tone,
        mode.enabled ? "hover:-translate-y-1 hover:bg-neutral-950/70" : "opacity-80",
      )}
    >
      <div
        className={clsx(
          "pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100",
          mode.glow,
        )}
      />
      <div className="relative flex h-full flex-col">
        <div className="flex items-start justify-between gap-4">
          <div className={clsx("flex h-14 w-14 items-center justify-center rounded-2xl border", mode.iconWrap)}>
            {mode.icon}
          </div>
          {mode.badge ? (
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] text-neutral-300">
              {mode.badge}
            </span>
          ) : null}
        </div>

        <div className="mt-6 space-y-3">
          <h2 className="text-2xl font-black tracking-tight text-white">{mode.title}</h2>
          <p className="max-w-[34ch] text-sm leading-7 text-neutral-300">{mode.description}</p>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {mode.highlights.map((item) => (
            <span
              key={item}
              className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-neutral-300"
            >
              {item}
            </span>
          ))}
        </div>

        <div className="mt-8 pt-6">
          {mode.enabled ? (
            <Link href={mode.href} className="block">
              <button
                className={clsx(
                  "flex w-full items-center justify-between rounded-2xl border px-4 py-4 text-left transition-all duration-300",
                  "border-white/10 bg-white/5 text-white hover:bg-white/10",
                )}
              >
                <span className="text-sm font-black uppercase tracking-[0.18em]">
                  {mode.action}
                </span>
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
                  <ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
                </span>
              </button>
            </Link>
          ) : (
            <div className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-neutral-500">
              <span className="text-sm font-black uppercase tracking-[0.18em]">
                {locale === "sw" ? "Bado haijafunguliwa" : "Not unlocked yet"}
              </span>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

export default function PlayPage() {
  const t = useTranslations("play");
  const locale = useLocale();

  const isSw = locale === "sw";

  const gameModes: ModeCard[] = [
    {
      id: "online",
      title: t("modes.online.title"),
      description: t("modes.online.description"),
      href: "/game/setup-online",
      enabled: true,
      action: t("modes.online.action"),
      badge: isSw ? "Inawaka" : "Most Active",
      tone: "border-blue-500/20",
      glow: "bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.18),transparent_40%)]",
      iconWrap: "border-blue-400/25 bg-blue-400/10 text-blue-300",
      icon: <Globe className="h-7 w-7" />,
      highlights: isSw
        ? ["Ranked", "Casual", "Haraka kuunganishwa"]
        : ["Ranked", "Casual", "Fast matchmaking"],
    },
    {
      id: "ai",
      title: t("modes.ai.title"),
      description: t("modes.ai.description"),
      href: isMobileApp() ? "/game/play-ai" : "/game/setup-ai",
      enabled: true,
      action: t("modes.ai.action"),
      badge: isSw ? "Mazoezi" : "Training",
      tone: "border-violet-500/20",
      glow: "bg-[radial-gradient(circle_at_top_right,rgba(139,92,246,0.18),transparent_40%)]",
      iconWrap: "border-violet-400/25 bg-violet-400/10 text-violet-300",
      icon: <Bot className="h-7 w-7" />,
      highlights: isSw
        ? ["Ngazi 19", "Fungua hatua", "Cheza muda wowote"]
        : ["19 levels", "Unlock progression", "Play anytime"],
    },
    {
      id: "friend",
      title: t("modes.friend.title"),
      description: t("modes.friend.description"),
      href: "/game/setup-friend",
      enabled: true,
      action: t("modes.friend.action"),
      badge: isSw ? "Binafsi" : "Private",
      tone: "border-emerald-500/20",
      glow: "bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.18),transparent_40%)]",
      iconWrap: "border-emerald-400/25 bg-emerald-400/10 text-emerald-300",
      icon: <Users className="h-7 w-7" />,
      highlights: isSw
        ? ["Link ya mwaliko", "Code ya haraka", "Cheza na rafiki"]
        : ["Invite link", "Quick code", "Friend challenge"],
    },
    {
      id: "tournament",
      title: t("modes.tournament.title"),
      description: t("modes.tournament.description"),
      href: "/community/tournament",
      enabled: true,
      action: isSw ? "Fungua Mashindano" : "Open Tournaments",
      badge: isSw ? "Jamii" : "Community",
      tone: "border-amber-500/20",
      glow: "bg-[radial-gradient(circle_at_top_right,rgba(245,158,11,0.16),transparent_40%)]",
      iconWrap: "border-amber-400/25 bg-amber-400/10 text-amber-300",
      icon: <Trophy className="h-7 w-7" />,
      highlights: isSw
        ? ["Brackets", "Usimamizi", "Matukio ya jamii"]
        : ["Brackets", "Moderation", "Community events"],
    },
  ];

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <section className="relative overflow-hidden px-4 pb-16 pt-10 sm:px-6 lg:px-8 lg:pb-24 lg:pt-14">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(249,115,22,0.18),transparent_28%),radial-gradient(circle_at_top_right,rgba(56,189,248,0.12),transparent_24%),linear-gradient(180deg,rgba(255,255,255,0.02),transparent_55%)]" />
        <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-10">
          <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.24em] text-neutral-300">
                <Sparkles className="h-3.5 w-3.5 text-[var(--primary)]" />
                {isSw ? "Mwanzo wa mechi" : "Match entry"}
              </div>

              <div className="space-y-4">
                <h1 className="max-w-3xl text-4xl font-black leading-tight text-white sm:text-5xl lg:text-6xl">
                  {t("title")}
                </h1>
                <p className="hidden max-w-2xl text-base leading-7 text-neutral-300 sm:block sm:text-lg">
                  {t("subtitle")}
                </p>
              </div>

              <div className="hidden flex-wrap gap-3 lg:flex">
                <div className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-neutral-200">
                  <Swords className="h-4 w-4 text-sky-300" />
                  {isSw ? "Cheza mechi ya ushindani au mazoezi" : "Choose ranked, practice, or private play"}
                </div>
                <div className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-neutral-200">
                  <Clock3 className="h-4 w-4 text-amber-300" />
                  {isSw ? "Ingia haraka bila kupotea kwenye hatua nyingi" : "Jump in fast without a cluttered flow"}
                </div>
              </div>
            </div>

            <div className="hidden grid-cols-2 gap-3 lg:grid">
              <QuickStat value="4" label={isSw ? "Njia wazi sasa" : "Open modes now"} />
              <QuickStat value="19" label={isSw ? "Viwango vya AI" : "AI levels"} />
              <QuickStat value="1v1" label={isSw ? "Mwelekeo wa mchezo" : "Core format"} />
              <QuickStat value="24/7" label={isSw ? "Mazoezi ya AI" : "AI practice"} />
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {gameModes.map((mode) => (
              <ModeCard key={mode.id} mode={mode} locale={locale} />
            ))}
          </div>

          <section className="hidden gap-4 rounded-[2rem] border border-white/10 bg-black/20 p-5 md:grid md:grid-cols-3 md:p-6">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-xs font-black uppercase tracking-[0.2em] text-neutral-500">
                {isSw ? "Njia ya haraka" : "Fastest route"}
              </div>
              <div className="mt-2 text-lg font-black text-white">
                {t("modes.online.title")}
              </div>
              <p className="mt-2 text-sm leading-6 text-neutral-400">
                {isSw
                  ? "Kama unataka mpinzani wa kweli haraka, hapa ndipo pa kuanzia."
                  : "If you want a real opponent quickly, this is the sharpest starting point."}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-xs font-black uppercase tracking-[0.2em] text-neutral-500">
                {isSw ? "Njia ya kujenga ujuzi" : "Skill-building lane"}
              </div>
              <div className="mt-2 text-lg font-black text-white">
                {t("modes.ai.title")}
              </div>
              <p className="mt-2 text-sm leading-6 text-neutral-400">
                {isSw
                  ? "Panda ngazi za AI, funga viwango vipya, na jiandae kwa masharti ya mashindano yajayo."
                  : "Climb AI levels, unlock higher difficulty, and prepare for future tournament requirements."}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-xs font-black uppercase tracking-[0.2em] text-neutral-500">
                {isSw ? "Njia ya watu wako" : "Bring-your-own rival"}
              </div>
              <div className="mt-2 text-lg font-black text-white">
                {t("modes.friend.title")}
              </div>
              <p className="mt-2 text-sm leading-6 text-neutral-400">
                {isSw
                  ? "Tengeneza mechi ya binafsi, tuma link, na anzeni mara moja bila kuingia kwenye queue."
                  : "Create a private match, share the link, and start directly without sitting in queue."}
              </p>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
