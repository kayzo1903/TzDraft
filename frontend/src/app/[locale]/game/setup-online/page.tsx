"use client";

import React, { useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Clock3, Search, ShieldCheck, Swords, TimerReset, X, Zap } from "lucide-react";
import clsx from "clsx";
import { useLocale, useTranslations } from "next-intl";
import { useAuthStore } from "@/lib/auth/auth-store";
import { Button } from "@/components/ui/Button";
import { useMatchmaking, QUEUE_TIME_OPTIONS } from "@/hooks/useMatchmaking";
import { Link } from "@/i18n/routing";

function formatElapsed(ms: number): string {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function InfoStrip({
  title,
  body,
  icon,
}: {
  title: string;
  body: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-[var(--primary)]">
          {icon}
        </div>
        <div>
          <div className="text-sm font-black text-white">{title}</div>
          <p className="mt-1 text-sm leading-6 text-neutral-400">{body}</p>
        </div>
      </div>
    </div>
  );
}

export default function SetupOnlinePage() {
  const t = useTranslations("setupOnline");
  const locale = useLocale();
  const router = useRouter();
  const { locale: routeLocale } = useParams<{ locale: string }>();
  const { state, error, timeoutReached, remainingMs, joinQueue, cancelQueue, resetTimeout } = useMatchmaking();
  const { isAuthenticated, hasHydrated } = useAuthStore();
  const searchParams = useSearchParams();
  const selectedOption = QUEUE_TIME_OPTIONS.find((o) => o.ms === 300000) ?? QUEUE_TIME_OPTIONS[1];

  const handlePlayVsTau = async () => {
    await cancelQueue();
    router.push(`/${routeLocale}/game/local?level=1&color=white&time=${selectedOption.ms / 1000}`);
  };

  const isSw = locale === "sw";

  useEffect(() => {
    if (!hasHydrated) return;

    if (!isAuthenticated) {
      router.push(`/${routeLocale}/auth/login?callbackUrl=/${routeLocale}/game/setup-online`);
    } else if (searchParams.get("autoSearch") === "true" && state === "idle") {
      joinQueue(300000);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, hasHydrated]);

  const infoStrips = [
    {
      title: isSw ? "Mpangilio wa haraka" : "Quick pairing",
      body: isSw
        ? "Ukishaingia kwenye queue, mfumo unatafuta mpinzani anayesubiri mwenye muda kama wako."
        : "Once you enter queue, the system looks for a waiting opponent with the same clock preference.",
      icon: <Search className="h-4 w-4" />,
    },
    {
      title: isSw ? "Kwa wachezaji walioingia" : "For signed-in players",
      body: isSw
        ? "Mechi za mtandaoni zinahitaji akaunti iliyothibitishwa ili mfumo wa ushindani na historia vifanye kazi vizuri."
        : "Online matchmaking is limited to signed-in accounts so competition, session handling, and history stay reliable.",
      icon: <ShieldCheck className="h-4 w-4" />,
    },
    {
      title: isSw ? "Chagua kasi yako" : "Choose your pace",
      body: isSw
        ? "Kama unataka mechi za haraka, chagua muda mfupi. Kama unataka nafasi ya kufikiria zaidi, panda juu ya dakika."
        : "Pick a shorter clock for pressure games, or move up in minutes when you want more breathing room.",
      icon: <Clock3 className="h-4 w-4" />,
    },
  ];

  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-8 text-[var(--foreground)] sm:px-6 sm:py-10 lg:px-8 lg:py-14">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 lg:gap-8">

        {/* Hero */}
        <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] px-5 py-5 shadow-[0_24px_80px_rgba(0,0,0,0.28)] sm:px-6 sm:py-6 lg:px-8 lg:py-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(249,115,22,0.16),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(251,191,36,0.10),transparent_26%)]" />
          <div className="relative grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
            <div className="space-y-4 sm:space-y-5">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.22em] text-neutral-300">
                <Search className="h-3.5 w-3.5 text-[var(--primary)]" />
                {isSw ? "Mechi ya haraka" : "Quick match"}
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
                  {isSw ? "Mpangilio wa moja kwa moja dhidi ya mpinzani wa kweli" : "Automatic pairing against a real opponent"}
                </div>
                <div className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-neutral-200">
                  <TimerReset className="h-4 w-4 text-amber-300" />
                  {isSw ? "Chagua muda, kisha uingie kwenye queue" : "Choose your clock, then enter queue"}
                </div>
              </div>
            </div>

            {/* Stats — desktop only */}
            <div className="hidden gap-3 sm:grid-cols-3 lg:grid">
              <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4">
                <div className="text-2xl font-black text-white">{QUEUE_TIME_OPTIONS.length}</div>
                <div className="mt-1 text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">
                  {isSw ? "Chaguo za muda" : "Clock options"}
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4">
                <div className="text-2xl font-black text-white">1v1</div>
                <div className="mt-1 text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">
                  {isSw ? "Aina ya mechi" : "Match format"}
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4">
                <div className="text-2xl font-black text-white">{selectedOption.label}</div>
                <div className="mt-1 text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">
                  {isSw ? "Muda uliochaguliwa" : "Selected pace"}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Main content */}
        <section className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr] lg:gap-6">

          {/* Action card */}
          <div className="rounded-[2rem] border border-white/10 bg-[var(--secondary)]/55 p-5 shadow-[0_18px_50px_rgba(0,0,0,0.2)] sm:p-7">
            {!isAuthenticated ? (
              <div className="flex flex-col gap-4 sm:gap-5">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4 sm:p-5">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-400/20 bg-amber-400/10 text-amber-300 sm:h-11 sm:w-11">
                      <ShieldCheck className="h-4 w-4 sm:h-5 sm:w-5" />
                    </div>
                    <div>
                      <div className="text-base font-black text-white sm:text-lg">{t("bannerTitle")}</div>
                      <p className="mt-1.5 text-sm leading-6 text-neutral-300 sm:mt-2">
                        {t("bannerDescShort")}
                      </p>
                    </div>
                  </div>
                </div>
                <Link href="/auth/login" className="block">
                  <Button size="lg" className="w-full justify-center text-sm font-bold sm:text-base">
                    {t("authRequired")}
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="flex flex-col gap-5 sm:gap-6">
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4 sm:p-5">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--primary)]/20 bg-[var(--primary)]/10 text-[var(--primary)] sm:h-11 sm:w-11">
                      <Search className="h-4 w-4 sm:h-5 sm:w-5" />
                    </div>
                    <div>
                      <div className="text-base font-black text-white sm:text-lg">{t("bannerTitle")}</div>
                      <p className="mt-1.5 text-sm leading-6 text-neutral-300 sm:mt-2">{t("bannerDesc")}</p>
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
                    {error}
                  </div>
                )}

                {state !== "searching" ? (
                  <>
                    <div className="space-y-3">
                      <div className="text-xs font-black uppercase tracking-[0.22em] text-neutral-500">
                        {t("timeControl")}
                      </div>

                      {/* Mobile: compact 2×2 segmented grid */}
                      <div className="grid grid-cols-2 gap-2 sm:hidden">
                        {QUEUE_TIME_OPTIONS.map((opt) => {
                          const isActive = opt.ms === 300000;
                          return (
                            <div
                              key={opt.ms}
                              className={clsx(
                                "flex flex-col items-center gap-2 rounded-2xl border py-3",
                                isActive
                                  ? "border-[var(--primary)]/50 bg-[var(--primary)]/10 text-white"
                                  : "cursor-not-allowed border-white/5 bg-black/10 text-neutral-600 opacity-40",
                              )}
                            >
                              <div className={clsx(
                                "flex h-8 w-8 items-center justify-center rounded-xl border border-white/10",
                                isActive ? "bg-white/10" : "bg-white/5",
                              )}>
                                <Clock3 className="h-3.5 w-3.5 text-amber-300" />
                              </div>
                              <span className="text-xs font-black">{opt.name}</span>
                              <span className="text-[10px] text-neutral-500">{opt.label}</span>
                              {isActive && (
                                <span className="h-1 w-4 rounded-full bg-[var(--primary)]" />
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Tablet+: card grid */}
                      <div className="hidden gap-3 sm:grid sm:grid-cols-2 xl:grid-cols-4">
                        {QUEUE_TIME_OPTIONS.map((opt) => {
                          const isActive = opt.ms === 300000;
                          return (
                            <div
                              key={opt.ms}
                              className={clsx(
                                "rounded-2xl border p-4 text-left",
                                isActive
                                  ? "border-[var(--primary)]/50 bg-[var(--primary)]/10 text-white shadow-[0_12px_30px_rgba(249,115,22,0.12)]"
                                  : "cursor-not-allowed border-white/5 bg-black/10 text-neutral-600 opacity-40",
                              )}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5">
                                  <Clock3 className="h-4 w-4 text-amber-300" />
                                </div>
                                <div className={clsx(
                                  "rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em]",
                                  isActive ? "bg-white/10 text-orange-100" : "bg-white/5 text-neutral-500",
                                )}>
                                  {opt.label}
                                </div>
                              </div>
                              <div className="mt-4 text-base font-black">{opt.name}</div>
                              <div className="mt-1 text-xs text-neutral-500">
                                {isSw ? `Mchezo wa ${opt.label} kwa kila upande` : `${opt.label} per side game`}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <Button
                      onClick={() => joinQueue(300000)}
                      size="lg"
                      className="w-full text-sm font-black sm:text-base"
                    >
                      {t("findOpponent")}
                    </Button>
                  </>
                ) : (
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col items-center gap-5 rounded-2xl border border-white/10 bg-black/20 px-5 py-8 text-center sm:gap-6 sm:py-10">
                      <div className="relative flex h-16 w-16 items-center justify-center sm:h-20 sm:w-20">
                        <div className="absolute inset-0 animate-ping rounded-full border-2 border-(--primary)/30" />
                        <div className="absolute inset-2 rounded-full border border-amber-300/20" />
                        <Search className="relative h-7 w-7 text-primary sm:h-8 sm:w-8" />
                      </div>
                      <div>
                        <div className="text-lg font-black text-white sm:text-xl">{t("searching")}</div>
                        <p className="mt-1 text-sm text-neutral-400">
                          {selectedOption.name} • {selectedOption.label}
                        </p>
                        <p className="mt-1 font-mono text-sm text-neutral-600">
                          {isSw ? "Muda uliobaki:" : "Time remaining:"} {formatElapsed(remainingMs)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={cancelQueue}
                        className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-semibold text-neutral-200 transition hover:bg-white/10 hover:text-white sm:py-3"
                      >
                        <X className="h-4 w-4" />
                        {t("cancel")}
                      </button>
                    </div>

                    {/* 60s fallback — shown when no match found */}
                    {timeoutReached && (
                      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
                        <p className="mb-3 text-sm font-semibold text-amber-300">
                          {t("timeoutHint")}
                        </p>
                        <div className="flex flex-col gap-2 sm:flex-row">
                          <button
                            type="button"
                            onClick={handlePlayVsTau}
                            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-(--primary)/40 bg-(--primary)/10 px-4 py-3 text-sm font-black text-orange-300 transition hover:bg-(--primary)/20"
                          >
                            <Zap className="h-4 w-4" />
                            {t("playVsTau")}
                          </button>
                          <button
                            type="button"
                            onClick={resetTimeout}
                            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-neutral-300 transition hover:bg-white/10"
                          >
                            {t("keepSearching")}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Side info — desktop only */}
          <div className="hidden space-y-4 lg:block">
            {infoStrips.map((s) => (
              <InfoStrip key={s.title} {...s} />
            ))}
            <div className="rounded-[2rem] border border-white/10 bg-[var(--secondary)]/40 p-5">
              <div className="text-xs font-black uppercase tracking-[0.22em] text-neutral-500">
                {isSw ? "Njia nyingine" : "Other routes"}
              </div>
              <div className="mt-4 grid gap-3">
                <Link href="/game/setup-friend" className="group block rounded-2xl border border-white/10 bg-black/20 p-4 transition hover:bg-black/30">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-black text-white">
                        {isSw ? "Cheza na rafiki" : "Play with a friend"}
                      </div>
                      <div className="mt-1 text-sm text-neutral-400">
                        {isSw ? "Tuma link au code ya mwaliko." : "Send a private invite link or code."}
                      </div>
                    </div>
                    <ArrowHint />
                  </div>
                </Link>
                <Link href="/game/setup-ai" className="group block rounded-2xl border border-white/10 bg-black/20 p-4 transition hover:bg-black/30">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-black text-white">
                        {isSw ? "Fanya mazoezi na AI" : "Train with AI"}
                      </div>
                      <div className="mt-1 text-sm text-neutral-400">
                        {isSw ? "Panda ngazi kabla ya kurudi kwenye ushindani." : "Climb levels before jumping back into competition."}
                      </div>
                    </div>
                    <ArrowHint />
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Info strips + other routes — mobile/tablet only */}
        <section className="grid gap-3 sm:grid-cols-3 lg:hidden">
          {infoStrips.map((s) => (
            <InfoStrip key={s.title} {...s} />
          ))}
        </section>

        {/* Other routes — mobile/tablet only */}
        <section className="rounded-[2rem] border border-white/10 bg-[var(--secondary)]/40 p-4 sm:p-5 lg:hidden">
          <div className="text-xs font-black uppercase tracking-[0.22em] text-neutral-500">
            {isSw ? "Njia nyingine" : "Other routes"}
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 sm:mt-4">
            <Link href="/game/setup-friend" className="group block rounded-2xl border border-white/10 bg-black/20 p-4 transition hover:bg-black/30">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-black text-white">
                    {isSw ? "Cheza na rafiki" : "Play with a friend"}
                  </div>
                  <div className="mt-1 text-sm text-neutral-400">
                    {isSw ? "Tuma link au code ya mwaliko." : "Send a private invite link or code."}
                  </div>
                </div>
                <ArrowHint />
              </div>
            </Link>
            <Link href="/game/setup-ai" className="group block rounded-2xl border border-white/10 bg-black/20 p-4 transition hover:bg-black/30">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-black text-white">
                    {isSw ? "Fanya mazoezi na AI" : "Train with AI"}
                  </div>
                  <div className="mt-1 text-sm text-neutral-400">
                    {isSw ? "Panda ngazi kabla ya kurudi kwenye ushindani." : "Climb levels before jumping back into competition."}
                  </div>
                </div>
                <ArrowHint />
              </div>
            </Link>
          </div>
        </section>

      </div>
    </main>
  );
}

function ArrowHint() {
  return (
    <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-neutral-300 transition group-hover:translate-x-1 group-hover:text-white">
      <Swords className="h-4 w-4" />
    </span>
  );
}
