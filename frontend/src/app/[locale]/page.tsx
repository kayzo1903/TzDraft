import React from "react";
import { Link } from "@/i18n/routing";
import { JsonLd } from "@/components/seo/JsonLd";
import { HeroBoard } from "@/components/hero/HeroBoard";
import { Button } from "@/components/ui/Button";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Bot,
  Globe,
  Sparkles,
  Trophy,
  Users,
  Zap,
  Target,
  Star,
} from "lucide-react";
import clsx from "clsx";
import { getCanonicalUrl, getLanguageAlternates, getSiteUrl, isAppLocale } from "@/lib/seo";

const HOME_META = {
  sw: {
    title: "TzDraft | Cheza Drafti ya Tanzania Mtandaoni — Bure Kabisa",
    description:
      "Jukwaa bora la kucheza Tanzania Drafti (8×8) mtandaoni. Pambana na AI, mualike marafiki, au shindana na wachezaji wa kweli kutoka Tanzania nzima.",
    keywords: [
      "tzdraft",
      "drafti tanzania",
      "cheza drafti mtandaoni",
      "mchezo wa drafti",
      "drafti bure mtandaoni",
      "mchezo wa checkers tanzania",
      "cheza drafti na AI",
    ],
    ogAlt: "TzDraft — Jukwaa la Drafti ya Tanzania Mtandaoni",
  },
  en: {
    title: "TzDraft | Play Tanzania Drafti Online Free — Matches, AI & Tournaments",
    description:
      "The home of Tanzania Drafti (8×8) online. Challenge AI, invite friends, or compete against real players from across Tanzania. Free to play, no signup required.",
    keywords: [
      "tzdraft",
      "tanzania drafti online",
      "play drafti free",
      "tanzania draughts game",
      "drafti checkers online",
      "play drafti vs AI",
      "tanzania board game online",
    ],
    ogAlt: "TzDraft — Tanzania Drafti Online Platform",
  },
} as const;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isAppLocale(locale)) return {};

  const siteUrl = getSiteUrl();
  const canonical = getCanonicalUrl(locale, "", siteUrl);
  const m = HOME_META[locale as keyof typeof HOME_META] ?? HOME_META.en;
  const ogLocale = locale === "sw" ? "sw_TZ" : "en_TZ";
  const ogLocaleAlt = locale === "sw" ? "en_TZ" : "sw_TZ";

  return {
    metadataBase: siteUrl,
    title: m.title,
    description: m.description,
    keywords: [...m.keywords],
    authors: [{ name: "TzDraft", url: siteUrl.toString() }],
    creator: "TzDraft",
    publisher: "TzDraft",
    category: "Sports",
    applicationName: "TzDraft",
    referrer: "origin-when-cross-origin",
    formatDetection: { telephone: false },

    alternates: {
      canonical,
      languages: getLanguageAlternates("", siteUrl),
    },

    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-snippet": -1,
        "max-image-preview": "large",
        "max-video-preview": -1,
      },
    },

    openGraph: {
      title: m.title,
      description: m.description,
      url: canonical,
      siteName: "TzDraft",
      locale: ogLocale,
      alternateLocale: [ogLocaleAlt],
      type: "website",
      images: [
        {
          url: new URL("/logo/logo.png", siteUrl).toString(),
          width: 1200,
          height: 630,
          alt: m.ogAlt,
        },
      ],
    },

    twitter: {
      card: "summary_large_image",
      title: m.title,
      description: m.description,
      images: [new URL("/logo/logo.png", siteUrl).toString()],
    },

    other: {
      "revisit-after": "1 day",
      language: locale === "sw" ? "Swahili" : "English",
      rating: "General",
    },
  };
}

/* ── Helpers ─────────────────────────────────────────────────────────────── */

function StatPill({
  value,
  label,
  dot,
}: {
  value: string;
  label: string;
  dot?: boolean;
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-3">
      {dot && <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />}
      <div>
        <div className="text-lg font-black leading-none text-white">{value}</div>
        <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-neutral-500">{label}</div>
      </div>
    </div>
  );
}

function StepCard({
  number,
  title,
  body,
  href,
  icon,
  cta,
}: {
  number: string;
  title: string;
  body: string;
  href: string;
  icon: React.ReactNode;
  cta: string;
}) {
  return (
    <Link href={href} className="group block">
      <div className="relative h-full overflow-hidden rounded-[1.75rem] border border-white/10 bg-[var(--secondary)]/45 p-5 transition-all duration-300 hover:border-white/15 hover:bg-[var(--secondary)]/70">
        <div className="flex items-start justify-between gap-3">
          <span className="text-5xl font-black leading-none text-white/8 select-none">{number}</span>
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-[var(--primary)]">
            {icon}
          </div>
        </div>
        <div className="mt-4">
          <h3 className="text-base font-black text-white">{title}</h3>
          <p className="mt-1.5 text-sm leading-6 text-neutral-400">{body}</p>
        </div>
        <div className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.16em] text-neutral-500 transition-colors group-hover:text-[var(--primary)]">
          {cta}
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </div>
      </div>
    </Link>
  );
}

/* ── Page ────────────────────────────────────────────────────────────────── */

export default async function Home({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("hero");
  const isSw = locale === "sw";
  const siteUrl = getSiteUrl();

  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "TzDraft",
    "url": siteUrl.toString(),
    "inLanguage": isSw ? "sw-TZ" : "en-TZ",
    "description": isSw ? "Jukwaa la mchezo wa Tanzania Drafti mtandaoni." : "Tanzania Draughts online gaming platform."
  };

  const softwareAppSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "TzDraft",
    "applicationCategory": "GameApplication",
    "genre": "Board Games",
    "operatingSystem": "Any",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    },
    "description": isSw ? "Jukwaa la kucheza Tanzania Drafti (8x8) mtandaoni." : "Platform to play Tanzania Drafti (8x8) online.",
    "url": siteUrl.toString()
  };

  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "TzDraft",
    "url": siteUrl.toString(),
    "logo": new URL("/logo/logo.png", siteUrl).toString()
  };

  return (
    <>
      <JsonLd data={websiteSchema} />
      <JsonLd data={softwareAppSchema} />
      <JsonLd data={organizationSchema} />
      <main className="flex flex-col bg-[var(--background)]">

      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <section className="relative flex min-h-[calc(100vh-64px)] items-center justify-center overflow-hidden px-4 py-12 sm:px-6 lg:px-8">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_20%,rgba(249,115,22,0.15),transparent_40%),radial-gradient(ellipse_at_80%_10%,rgba(56,189,248,0.10),transparent_35%),radial-gradient(ellipse_at_50%_90%,rgba(249,115,22,0.06),transparent_40%)]" />

        <div className="relative mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">

          {/* Left */}
          <div className="flex flex-col gap-7 text-center lg:text-left">
            {/* Badge */}
            <div className="flex justify-center lg:justify-start">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 text-[11px] font-black uppercase tracking-[0.24em] text-neutral-300">
                <Sparkles className="h-3.5 w-3.5 text-[var(--primary)]" />
                {isSw ? "Tanzania Drafti · Mtandaoni" : "Tanzania Draughts · Online"}
              </div>
            </div>

            {/* Headline */}
            <div className="space-y-4">
              <h1 className="text-5xl font-black leading-[1.05] tracking-tight text-white sm:text-6xl lg:text-7xl">
                {t("title")}
              </h1>
              <p className="mx-auto max-w-lg text-lg leading-8 text-neutral-400 lg:mx-0">
                {t("subtitle")}
              </p>
            </div>

            {/* CTAs */}
            <div className="flex flex-col gap-3 sm:flex-row lg:justify-start">
              <Link href="/play" className="w-full sm:flex-1">
                <Button
                  size="md"
                  className="w-full gap-2 rounded-2xl px-6 py-3.5 text-sm font-black tracking-wide"
                >
                  {isSw ? "Chagua namna ya kucheza" : "Start playing"}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/community/tournament" className="w-full sm:flex-1">
                <Button
                  variant="outline"
                  size="md"
                  className="w-full gap-2 rounded-2xl border-white/15 bg-white/[0.04] px-6 py-3.5 text-sm font-black tracking-wide text-white hover:border-white/25 hover:bg-white/[0.08]"
                >
                  <Trophy className="h-4 w-4 text-amber-400" />
                  {isSw ? "Angalia mashindano" : "Browse tournaments"}
                </Button>
              </Link>
            </div>

            {/* Stat pills */}
            <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
              <StatPill value="4" label={isSw ? "Njia za kucheza" : "Play modes"} />
              <StatPill value="Live" label={isSw ? "Mechi sasa" : "Matches now"} dot />
              <StatPill value="Free" label={isSw ? "Bila malipo" : "No signup req."} />
            </div>
          </div>

          {/* Right — board */}
          <div className="relative flex justify-center">
            <div className="pointer-events-none absolute left-1/2 top-1/2 h-[130%] w-[130%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-orange-500/8 blur-[120px]" />
            <div className="relative w-full max-w-[34rem] transition-transform duration-500 hover:scale-[1.015] lg:-rotate-1">
              <div className="absolute inset-0 translate-y-6 rounded-2xl bg-black/30 blur-xl" />
              <HeroBoard />
            </div>
          </div>
        </div>
      </section>

      {/* ── PLAY MODES — bento grid ───────────────────────────────────────── */}
      <section className="border-t border-white/5 px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
        <div className="mx-auto w-full max-w-6xl">

          {/* Heading */}
          <div className="mb-10 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-[var(--primary)]">
                {isSw ? "Njia za kucheza" : "Ways to play"}
              </p>
              <h2 className="mt-2 text-3xl font-black text-white sm:text-4xl">
                {isSw ? "Uchague mchezo wako" : "Pick your game"}
              </h2>
            </div>
            <Link href="/play" className="group hidden items-center gap-2 text-sm font-semibold text-neutral-400 transition-colors hover:text-white sm:flex">
              {isSw ? "Angalia njia zote" : "See all modes"}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>

          {/* Bento: Online large | AI | Friend | Tournaments wide */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">

            {/* Online — featured, spans 2 rows on xl */}
            <Link href="/game/setup-online" className="group md:col-span-2 xl:col-span-1 xl:row-span-2">
              <article className="relative h-full min-h-[20rem] overflow-hidden rounded-[2rem] border border-sky-500/25 bg-[var(--secondary)]/55 p-6 transition-all duration-300 hover:border-sky-400/40 hover:bg-[var(--secondary)] hover:shadow-[0_24px_60px_rgba(0,0,0,0.3)] xl:min-h-[28rem]">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(56,189,248,0.10),transparent_60%)]" />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),transparent_50%)]" />
                <div className="relative flex h-full flex-col">
                  <div className="flex items-start justify-between">
                    <div className="flex h-13 w-13 items-center justify-center rounded-2xl border border-sky-400/25 bg-sky-400/10 text-sky-300">
                      <Globe className="h-6 w-6" />
                    </div>
                    <span className="rounded-full border border-sky-400/20 bg-sky-400/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-sky-300">
                      {isSw ? "Haraka" : "Competitive"}
                    </span>
                  </div>

                  <div className="mt-6 flex-1">
                    <h3 className="text-2xl font-black text-white xl:text-3xl">
                      {t("featureGrid.playOnline.title")}
                    </h3>
                    <p className="mt-3 text-base leading-7 text-neutral-300">
                      {t("featureGrid.playOnline.desc")}
                    </p>
                    <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-neutral-400">
                      {isSw
                        ? "Unataka mpinzani wa kweli sasa hivi? Hapa ndipo pa kuanzia."
                        : "Want a real opponent right now? This is the fastest lane in."}
                    </div>
                  </div>

                  <div className="mt-6 flex items-center justify-between">
                    <span className="text-sm font-black uppercase tracking-[0.18em] text-white">
                      {isSw ? "Ingia" : "Play now"}
                    </span>
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-400/15 text-sky-300">
                      <ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
                    </span>
                  </div>
                </div>
              </article>
            </Link>

            {/* AI */}
            <Link href="/game/setup-ai" className="group">
              <article className="relative h-full overflow-hidden rounded-[2rem] border border-emerald-500/20 bg-[var(--secondary)]/55 p-5 transition-all duration-300 hover:border-emerald-400/35 hover:bg-[var(--secondary)] hover:shadow-[0_20px_50px_rgba(0,0,0,0.25)]">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(52,211,153,0.08),transparent_55%)]" />
                <div className="relative flex h-full flex-col">
                  <div className="flex items-start justify-between">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-400/25 bg-emerald-400/10 text-emerald-300">
                      <Bot className="h-5 w-5" />
                    </div>
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-neutral-400">
                      {isSw ? "Mazoezi" : "Training"}
                    </span>
                  </div>
                  <div className="mt-5">
                    <h3 className="text-xl font-black text-white">{t("featureGrid.playComputer.title")}</h3>
                    <p className="mt-2 text-sm leading-6 text-neutral-300">{t("featureGrid.playComputer.desc")}</p>
                  </div>
                  <div className="mt-auto pt-5 flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-[0.18em] text-white">{isSw ? "Anza" : "Train"}</span>
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/8 text-emerald-300">
                      <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                    </span>
                  </div>
                </div>
              </article>
            </Link>

            {/* Friend */}
            <Link href="/game/setup-friend" className="group">
              <article className="relative h-full overflow-hidden rounded-[2rem] border border-[var(--primary)]/20 bg-[var(--secondary)]/55 p-5 transition-all duration-300 hover:border-[var(--primary)]/35 hover:bg-[var(--secondary)] hover:shadow-[0_20px_50px_rgba(0,0,0,0.25)]">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(249,115,22,0.08),transparent_55%)]" />
                <div className="relative flex h-full flex-col">
                  <div className="flex items-start justify-between">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--primary)]/25 bg-[var(--primary)]/10 text-[var(--primary)]">
                      <Users className="h-5 w-5" />
                    </div>
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-neutral-400">
                      {isSw ? "Binafsi" : "Private"}
                    </span>
                  </div>
                  <div className="mt-5">
                    <h3 className="text-xl font-black text-white">{t("featureGrid.playFriend.title")}</h3>
                    <p className="mt-2 text-sm leading-6 text-neutral-300">{t("featureGrid.playFriend.desc")}</p>
                  </div>
                  <div className="mt-auto pt-5 flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-[0.18em] text-white">{isSw ? "Unda" : "Invite"}</span>
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/8 text-[var(--primary)]">
                      <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                    </span>
                  </div>
                </div>
              </article>
            </Link>

            {/* Tournaments — wide on xl */}
            <Link href="/community/tournament" className="group xl:col-span-2">
              <article className="relative overflow-hidden rounded-[2rem] border border-amber-500/20 bg-[var(--secondary)]/55 p-5 transition-all duration-300 hover:border-amber-400/35 hover:bg-[var(--secondary)] hover:shadow-[0_20px_50px_rgba(0,0,0,0.25)]">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_right,rgba(251,191,36,0.08),transparent_55%)]" />
                <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-amber-400/25 bg-amber-400/10 text-amber-300">
                      <Trophy className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-xl font-black text-white">{t("featureGrid.tournaments.title")}</h3>
                        <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-[0.18em] text-amber-300">
                          {isSw ? "Jamii" : "Events"}
                        </span>
                      </div>
                      <p className="mt-1 text-sm leading-6 text-neutral-300">{t("featureGrid.tournaments.desc")}</p>
                    </div>
                  </div>
                  <span className="flex shrink-0 h-10 w-10 items-center justify-center rounded-xl bg-amber-400/10 text-amber-300 sm:ml-4">
                    <ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
                  </span>
                </div>
              </article>
            </Link>
          </div>
        </div>
      </section>

      {/* ── YOUR JOURNEY — 3 steps ────────────────────────────────────────── */}
      <section className="border-t border-white/5 px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
        <div className="mx-auto w-full max-w-6xl">
          <div className="mb-10">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-[var(--primary)]">
              {isSw ? "Mwanzo wako" : "Your journey"}
            </p>
            <h2 className="mt-2 text-3xl font-black text-white sm:text-4xl">
              {isSw ? "Hatua tatu za kuanza" : "Three steps to the board"}
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <StepCard
              number="01"
              title={isSw ? "Jifunze sheria" : "Learn the rules"}
              body={isSw
                ? "Tanzania Drafti ina sheria za kipekee. Jifunze mwendo wa kipande, ngumi, na uthibitisho wa bingwa."
                : "Tanzania Draughts has unique rules. Master piece movement, captures, and king promotion."}
              href="/learn"
              icon={<BookOpen className="h-4 w-4" />}
              cta={isSw ? "Soma sheria" : "Read rules"}
            />
            <StepCard
              number="02"
              title={isSw ? "Fanya mazoezi na AI" : "Train with AI"}
              body={isSw
                ? "Panda ngazi za ugumu kutoka rahisi hadi AI ngumu. Jiandae vizuri kabla ya kupanda ngazi."
                : "Climb difficulty from beginner to hard AI. Get battle-ready before you face real players."}
              href="/game/setup-ai"
              icon={<Target className="h-4 w-4" />}
              cta={isSw ? "Anza mazoezi" : "Start training"}
            />
            <StepCard
              number="03"
              title={isSw ? "Shindana mtandaoni" : "Compete online"}
              body={isSw
                ? "Ingia kwenye orodha ya ubora, shindana katika matukio, na onyesha kiwango chako cha kweli."
                : "Enter the leaderboard, compete in events, and prove your true level against the community."}
              href="/game/setup-online"
              icon={<Zap className="h-4 w-4" />}
              cta={isSw ? "Cheza sasa" : "Play now"}
            />
          </div>
        </div>
      </section>

      {/* ── EXPLORE ───────────────────────────────────────────────────────── */}
      <section className="border-t border-white/5 px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="mx-auto w-full max-w-6xl">
          <div className="grid gap-4 sm:grid-cols-2">

            {/* Leaderboard */}
            <Link href="/leaderboard" className="group block">
              <div className="relative overflow-hidden rounded-[2rem] border border-amber-500/15 bg-[var(--secondary)]/45 p-6 transition-all duration-200 hover:border-amber-400/25 hover:bg-[var(--secondary)]/70">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(251,191,36,0.06),transparent_60%)]" />
                <div className="relative flex items-start justify-between gap-4">
                  <div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-amber-500/20 bg-amber-500/10 text-amber-300">
                      <BarChart3 className="h-4 w-4" />
                    </div>
                    <h3 className="mt-4 text-xl font-black text-white">
                      {isSw ? "Orodha ya Ubora" : t("featureGrid.leaderboard.title")}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-neutral-400">{t("featureGrid.leaderboard.desc")}</p>
                  </div>
                  <Star className="h-5 w-5 shrink-0 text-amber-400/40 transition-colors group-hover:text-amber-400/70" />
                </div>
                <div className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-neutral-400 transition-colors group-hover:text-white">
                  {isSw ? "Angalia ubora" : "View rankings"}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            </Link>

            {/* Learn */}
            <Link href="/learn" className="group block">
              <div className="relative overflow-hidden rounded-[2rem] border border-emerald-500/15 bg-[var(--secondary)]/45 p-6 transition-all duration-200 hover:border-emerald-400/25 hover:bg-[var(--secondary)]/70">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(52,211,153,0.06),transparent_60%)]" />
                <div className="relative flex items-start justify-between gap-4">
                  <div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-300">
                      <BookOpen className="h-4 w-4" />
                    </div>
                    <h3 className="mt-4 text-xl font-black text-white">{t("featureGrid.learn.title")}</h3>
                    <p className="mt-2 text-sm leading-6 text-neutral-400">{t("featureGrid.learn.desc")}</p>
                  </div>
                  <BookOpen className="h-5 w-5 shrink-0 text-emerald-400/40 transition-colors group-hover:text-emerald-400/70" />
                </div>
                <div className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-neutral-400 transition-colors group-hover:text-white">
                  {isSw ? "Jifunze" : "Start learning"}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            </Link>
          </div>
        </div>
      </section>

    </main>
    </>
  );
}
