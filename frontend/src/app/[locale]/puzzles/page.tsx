import { ArrowRight, Star, Puzzle } from "lucide-react";
import { Link } from "@/i18n/routing";
import type { Metadata } from "next";
import { getCanonicalUrl, getLanguageAlternates, getSiteUrl, isAppLocale } from "@/lib/seo";
import { JsonLd } from "@/components/seo/JsonLd";
import { getTranslations } from "next-intl/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

interface PuzzleSummary {
  id: string;
  title: string | null;
  difficulty: number;
  theme: string | null;
  sideToMove: "WHITE" | "BLACK";
  pieces?: any[];
  publishedAt: string;
  _count: { attempts: number };
}

async function fetchPuzzles(
  difficulty?: string,
  theme?: string,
  page = 1,
): Promise<{ data: PuzzleSummary[]; total: number }> {
  const params = new URLSearchParams({ page: String(page), limit: "24" });
  if (difficulty) params.set("difficulty", difficulty);
  if (theme) params.set("theme", theme);

  try {
    const res = await fetch(`${API_URL}/puzzles?${params}`, { cache: "no-store" });
    if (!res.ok) return { data: [], total: 0 };
    return res.json();
  } catch {
    return { data: [], total: 0 };
  }
}

async function fetchDailyPuzzle(): Promise<PuzzleSummary | null> {
  try {
    const res = await fetch(`${API_URL}/puzzles/daily`, { cache: "no-store" });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

const THEMES = ["sacrifice", "position-trap", "king-trap", "endgame", "promotion"];
const DIFFICULTIES = [1, 2, 3, 4, 5];

function difficultyStars(d: number) {
  return "★".repeat(d) + "☆".repeat(5 - d);
}

function themeColor(theme: string | null) {
  const map: Record<string, string> = {
    sacrifice: "border-rose-400/30 bg-rose-400/10 text-rose-200",
    "position-trap": "border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
    "king-trap": "border-purple-400/30 bg-purple-400/10 text-purple-200",
    endgame: "border-amber-400/30 bg-amber-400/10 text-amber-200",
    promotion: "border-sky-400/30 bg-sky-400/10 text-sky-200",
  };
  return (
    map[theme ?? ""] ?? "border-white/10 bg-white/5 text-neutral-300"
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isAppLocale(locale)) return {};

  const t = await getTranslations({ locale, namespace: "puzzles.seo" });
  const siteUrl = getSiteUrl();
  const canonical = getCanonicalUrl(locale, "/puzzles", siteUrl);
  
  const ogLocale = locale === "sw" ? "sw_TZ" : "en_TZ";
  const ogLocaleAlt = locale === "sw" ? "en_TZ" : "sw_TZ";

  return {
    title: t("title"),
    description: t("description"),
    alternates: {
      canonical,
      languages: getLanguageAlternates("/puzzles", siteUrl),
    },
    openGraph: {
      title: t("title"),
      description: t("description"),
      url: canonical,
      siteName: "TzDraft",
      locale: ogLocale,
      alternateLocale: [ogLocaleAlt],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: t("title"),
      description: t("description"),
    },
  };
}

export default async function PuzzlesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ difficulty?: string; theme?: string; page?: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "puzzles" });
  const sp = await searchParams;
  const currentPage = Number(sp.page ?? 1);

  const [{ data: puzzles, total }, daily] = await Promise.all([
    fetchPuzzles(sp.difficulty, sp.theme, currentPage),
    fetchDailyPuzzle(),
  ]);

  const totalPages = Math.ceil(total / 24);

  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": t("seo.schemaList"),
    "itemListElement": puzzles.slice(0, 10).map((p, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "item": {
        "@type": "Game",
        "name": p.title ?? t("seo.puzzleTitle", { id: p.id.slice(0, 6) }),
        "url": `${getSiteUrl()}/${locale}/puzzles/${p.id}`
      }
    }))
  };

  return (
    <>
      <JsonLd data={itemListSchema} />
      <main className="bg-[var(--background)] min-h-screen">
        {/* Hero */}
      <section className="relative overflow-hidden border-b border-white/5 px-4 py-16 sm:px-6 lg:px-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(249,115,22,0.14),_transparent_32%)]" />
        <div className="relative mx-auto max-w-6xl text-center">
          <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-bold tracking-[0.2em] text-neutral-300 mb-6">
            {t("hero.badge")}
          </span>
          <h1 className="text-5xl font-black text-white sm:text-7xl tracking-tight">
            {t("hero.title")}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-neutral-400">
            {t("hero.description")}
          </p>
        </div>
      </section>

      {/* Puzzle Rush Section */}
      <section className="px-4 py-8 sm:px-6 lg:px-8 bg-white/[0.01]">
        <div className="mx-auto max-w-4xl">
          <Link
            href="/puzzles?continuous=true"
            className="flex flex-col md:flex-row items-center justify-between gap-6 rounded-[2rem] border border-orange-400/20 bg-[linear-gradient(145deg,rgba(249,115,22,0.12),rgba(0,0,0,0))] p-8 hover:border-orange-400/40 transition-all hover:bg-orange-400/10 group shadow-[0_20px_50px_rgba(0,0,0,0.3)]"
          >
            <div className="flex flex-col gap-2 text-center md:text-left">
              <span className="inline-flex items-center justify-center md:justify-start gap-2 text-[10px] font-black tracking-[0.2em] text-orange-400 uppercase">
                PUZZLE RUSH
              </span>
              <h3 className="text-3xl font-black text-white leading-tight sm:text-4xl">
                Continuous Training
              </h3>
              <p className="text-neutral-400 max-w-md">
                Play through all puzzles sequentially to improve your tactical vision.
              </p>
            </div>
            <div className="shrink-0 mt-4 md:mt-0">
              <span className="inline-flex items-center gap-2 rounded-2xl bg-orange-500 px-8 py-4 text-sm font-black text-black transition-transform group-hover:scale-105 active:scale-95">
                Start Now <ArrowRight className="h-4 w-4" />
              </span>
            </div>
          </Link>
        </div>
      </section>

      {/* Puzzles List */}
      <section className="mx-auto max-w-4xl px-4 pb-20 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-3">
          {puzzles.map((p) => (
            <Link
              key={p.id}
              href={`/puzzles/${p.id}`}
              className="flex items-center gap-4 rounded-2xl border border-white/10 bg-[#141414] p-4 transition-colors hover:border-orange-500/50 hover:bg-white/5"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-orange-500/10 text-orange-500">
                <Puzzle className="h-6 w-6" />
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <h3 className="truncate text-[15px] font-bold text-white">
                  {p.title ?? (p.sideToMove === "WHITE" ? "White to move" : "Black to move")}
                </h3>
                <div className="flex flex-wrap items-center gap-3">
                  <span className={`rounded-md border px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${themeColor(p.theme)}`}>
                    {p.theme?.replace("-", " ") ?? "Tactics"}
                  </span>
                  <span className="text-xs text-amber-400">{difficultyStars(p.difficulty)}</span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1.5 shrink-0">
                <span className="text-[11px] font-semibold text-neutral-500">
                  {p._count.attempts} plays
                </span>
                <ArrowRight className="h-4 w-4 text-neutral-600" />
              </div>
            </Link>
          ))}
        </div>
      </section>

    </main>
    </>
  );
}
