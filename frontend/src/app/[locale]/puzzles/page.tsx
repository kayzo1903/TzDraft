import { ArrowRight, Star } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { getCanonicalUrl, getLanguageAlternates, getSiteUrl, isAppLocale } from "@/lib/seo";
import { JsonLd } from "@/components/seo/JsonLd";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

interface PuzzleSummary {
  id: string;
  title: string | null;
  difficulty: number;
  theme: string | null;
  sideToMove: string;
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

const THEMES = ["multi-capture", "promotion", "king-trap", "endgame", "capture", "positional"];
const DIFFICULTIES = [1, 2, 3, 4, 5];

function difficultyStars(d: number) {
  return "★".repeat(d) + "☆".repeat(5 - d);
}

function themeColor(theme: string | null) {
  const map: Record<string, string> = {
    "multi-capture": "border-orange-400/30 bg-orange-400/10 text-orange-200",
    promotion: "border-sky-400/30 bg-sky-400/10 text-sky-200",
    "king-trap": "border-purple-400/30 bg-purple-400/10 text-purple-200",
    endgame: "border-amber-400/30 bg-amber-400/10 text-amber-200",
    capture: "border-rose-400/30 bg-rose-400/10 text-rose-200",
    positional: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
  };
  return (
    map[theme ?? ""] ?? "border-white/10 bg-white/5 text-neutral-300"
  );
}

const PUZZLE_META = {
  sw: {
    title: "Mafumbo & Mbinu za Drafti | TzDraft Puzzles",
    description: "Jifunze mbinu za ushindi kupitia mafumbo halisi ya Tanzania Drafti. Boresha kiwango chako cha uchezaji.",
  },
  en: {
    title: "Drafti Puzzles & Tactics | TzDraft",
    description: "Master winning tactics with real Tanzania Drafti puzzles. Sharpen your game and train with daily challenges.",
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
  const canonical = getCanonicalUrl(locale, "/puzzles", siteUrl);
  const m = PUZZLE_META[locale as keyof typeof PUZZLE_META] ?? PUZZLE_META.en;
  const ogLocale = locale === "sw" ? "sw_TZ" : "en_TZ";
  const ogLocaleAlt = locale === "sw" ? "en_TZ" : "sw_TZ";

  return {
    title: m.title,
    description: m.description,
    alternates: {
      canonical,
      languages: getLanguageAlternates("/puzzles", siteUrl),
    },
    openGraph: {
      title: m.title,
      description: m.description,
      url: canonical,
      siteName: "TzDraft",
      locale: ogLocale,
      alternateLocale: [ogLocaleAlt],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: m.title,
      description: m.description,
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
    "name": locale === "sw" ? "Mafumbo ya TzDraft" : "TzDraft Puzzles",
    "itemListElement": puzzles.slice(0, 10).map((p, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "item": {
        "@type": "Game",
        "name": p.title ?? (locale === "sw" ? `Fumbo la Drafti #${p.id.slice(0,6)}` : `Drafti Puzzle #${p.id.slice(0,6)}`),
        "url": `${getSiteUrl()}/${locale}/puzzles/${p.id}`
      }
    }))
  };

  return (
    <>
      <JsonLd data={itemListSchema} />
      <main className="bg-[var(--background)] min-h-screen">
        {/* Hero */}
      <section className="relative overflow-hidden border-b border-white/5 px-4 py-12 sm:px-6 lg:px-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(249,115,22,0.14),_transparent_32%)]" />
        <div className="relative mx-auto max-w-6xl">
          <div className="flex items-end justify-between gap-6">
            <div className="space-y-3">
              <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-bold tracking-[0.2em] text-neutral-300">
                PUZZLES & TACTICS
              </span>
              <h1 className="text-4xl font-black text-white sm:text-5xl">
                Sharpen your game.
              </h1>
              <p className="max-w-xl text-base leading-7 text-neutral-300">
                Real positions extracted from TzDraft games. Every puzzle is a
                genuine tactical moment that happened in a live match.
              </p>
            </div>
            {daily && (
              <Link
                href={`/${locale}/puzzles/${daily.id}`}
                className="hidden lg:flex shrink-0 flex-col gap-3 rounded-2xl border border-orange-400/30 bg-orange-400/10 p-5 w-56 hover:border-orange-400/50 transition-colors"
              >
                <span className="text-xs font-bold tracking-widest text-orange-300 uppercase">
                  Daily Puzzle
                </span>
                <p className="text-lg font-black text-white leading-tight">
                  {daily.title ?? "Today's challenge"}
                </p>
                <div className="text-xs text-orange-200/70">
                  {difficultyStars(daily.difficulty)}
                </div>
                <span className="inline-flex items-center gap-1 text-sm font-semibold text-orange-300">
                  Solve now <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Filters */}
      <section className="border-b border-white/5 px-4 py-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl flex flex-wrap items-center gap-3">
          <span className="text-xs font-semibold uppercase tracking-widest text-neutral-500">
            Filter:
          </span>
          {/* Difficulty */}
          {DIFFICULTIES.map((d) => (
            <Link
              key={d}
              href={`/${locale}/puzzles?difficulty=${d}${sp.theme ? `&theme=${sp.theme}` : ""}`}
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors
                ${Number(sp.difficulty) === d
                  ? "border-orange-400/60 bg-orange-400/20 text-orange-200"
                  : "border-white/10 bg-white/5 text-neutral-400 hover:border-white/20"
                }`}
            >
              {"★".repeat(d)}
            </Link>
          ))}
          <span className="text-white/10">|</span>
          {/* Themes */}
          {THEMES.map((t) => (
            <Link
              key={t}
              href={`/${locale}/puzzles?theme=${t}${sp.difficulty ? `&difficulty=${sp.difficulty}` : ""}`}
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors capitalize
                ${sp.theme === t
                  ? "border-orange-400/60 bg-orange-400/20 text-orange-200"
                  : "border-white/10 bg-white/5 text-neutral-400 hover:border-white/20"
                }`}
            >
              {t}
            </Link>
          ))}
          {(sp.difficulty || sp.theme) && (
            <Link
              href={`/${locale}/puzzles`}
              className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-neutral-500 hover:text-white transition-colors"
            >
              Clear
            </Link>
          )}
        </div>
      </section>

      {/* Grid */}
      <section className="px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          {puzzles.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-white/10 bg-white/5 p-10 text-center">
              <p className="text-xl font-black text-white">No puzzles yet</p>
              <p className="mt-2 text-sm text-neutral-400">
                Puzzles are mined nightly from completed games and reviewed by the team.
                Check back soon.
              </p>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {puzzles.map((puzzle) => (
                <Link
                  key={puzzle.id}
                  href={`/${locale}/puzzles/${puzzle.id}`}
                  className="group rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] p-5 transition duration-200 hover:-translate-y-1 hover:border-orange-400/30"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${themeColor(puzzle.theme)}`}
                    >
                      {puzzle.theme ?? "puzzle"}
                    </span>
                    <span className="text-xs tracking-widest text-amber-300">
                      {difficultyStars(puzzle.difficulty)}
                    </span>
                  </div>

                  <p className="mt-4 font-bold text-white line-clamp-2">
                    {puzzle.title ?? `${puzzle.sideToMove} to move`}
                  </p>

                  <div className="mt-4 flex items-center justify-between text-xs text-neutral-500">
                    <span>{puzzle._count.attempts} attempts</span>
                    <span className="inline-flex items-center gap-1 text-orange-300 transition group-hover:translate-x-1">
                      Solve <ArrowRight className="h-3 w-3" />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-10 flex items-center justify-center gap-3">
              {currentPage > 1 && (
                <Link
                  href={`/${locale}/puzzles?page=${currentPage - 1}${sp.difficulty ? `&difficulty=${sp.difficulty}` : ""}${sp.theme ? `&theme=${sp.theme}` : ""}`}
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-neutral-300 hover:bg-white/10 transition-colors"
                >
                  Previous
                </Link>
              )}
              <span className="text-sm text-neutral-500">
                {currentPage} / {totalPages}
              </span>
              {currentPage < totalPages && (
                <Link
                  href={`/${locale}/puzzles?page=${currentPage + 1}${sp.difficulty ? `&difficulty=${sp.difficulty}` : ""}${sp.theme ? `&theme=${sp.theme}` : ""}`}
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-neutral-300 hover:bg-white/10 transition-colors"
                >
                  Next
                </Link>
              )}
            </div>
          )}
        </div>
      </section>
    </main>
    </>
  );
}
