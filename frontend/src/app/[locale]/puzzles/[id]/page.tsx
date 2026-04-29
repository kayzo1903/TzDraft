import { Metadata } from "next";
import { notFound } from "next/navigation";
import { PuzzleClient, type PuzzleData } from "./PuzzleClient";

const difficultyStars = (d: number) => "★".repeat(d) + "☆".repeat(5 - d);
import { JsonLd } from "@/components/seo/JsonLd";
import { getCanonicalUrl, getLanguageAlternates, getSiteUrl, isAppLocale } from "@/lib/seo";
import { getTranslations } from "next-intl/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

async function getPuzzle(id: string): Promise<PuzzleData | null> {
  try {
    const res = await fetch(`${API_URL}/puzzles/${id}`, { cache: "no-store" });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}): Promise<Metadata> {
  const { locale, id } = await params;
  if (!isAppLocale(locale)) return {};

  const puzzle = await getPuzzle(id);
  if (!puzzle) return {};

  const siteUrl = getSiteUrl();
  const canonical = getCanonicalUrl(locale, `/puzzles/${id}`, siteUrl);

  const t = await getTranslations({ locale, namespace: "puzzles.seo" });
  const themeT = await getTranslations({ locale, namespace: "puzzles.themes" });

  const themeKey = puzzle.theme && puzzle.theme !== "tactical" && puzzle.theme !== "sacrifice" && puzzle.theme !== "position-trap" && puzzle.theme !== "king-trap" && puzzle.theme !== "endgame" && puzzle.theme !== "promotion" ? "tactical" : puzzle.theme;
  
  // Handle hyphenated themes for JSON keys (position-trap -> positionTrap)
  const safeThemeKey = themeKey ? themeKey.replace(/-([a-z])/g, (g) => g[1].toUpperCase()) : "tactical";
  
  const themeDisplay = themeT(safeThemeKey as any);
  const stars = difficultyStars(puzzle.difficulty);
  
  const title = t("solveTitle", { theme: themeDisplay, stars });
  const description = t("solveDesc", { theme: themeDisplay, difficulty: puzzle.difficulty });

  const ogLocale = locale === "sw" ? "sw_TZ" : "en_TZ";
  const ogLocaleAlt = locale === "sw" ? "en_TZ" : "sw_TZ";

  return {
    title,
    description,
    alternates: {
      canonical,
      languages: getLanguageAlternates(`/puzzles/${id}`, siteUrl),
    },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: "TzDraft",
      locale: ogLocale,
      alternateLocale: [ogLocaleAlt],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function PuzzleSolvePage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const t = await getTranslations({ locale, namespace: "puzzles" });
  const themeT = await getTranslations({ locale, namespace: "puzzles.themes" });
  const puzzle = await getPuzzle(id);

  if (!puzzle) {
    notFound();
  }

  const siteUrl = getSiteUrl();

  const themeKey = puzzle.theme && puzzle.theme !== "tactical" && puzzle.theme !== "sacrifice" && puzzle.theme !== "position-trap" && puzzle.theme !== "king-trap" && puzzle.theme !== "endgame" && puzzle.theme !== "promotion" ? "tactical" : puzzle.theme;
  const safeThemeKey = themeKey ? themeKey.replace(/-([a-z])/g, (g) => g[1].toUpperCase()) : "tactical";
  const themeDisplay = themeT(safeThemeKey as any);

  const videoGameSchema = {
    "@context": "https://schema.org",
    "@type": "VideoGame",
    "name": puzzle.title ?? t("seo.puzzleTitle", { id: puzzle.id.slice(0, 6) }),
    "description": t("seo.solveDesc", { theme: themeDisplay, difficulty: puzzle.difficulty }),
    "url": `${siteUrl}/${locale}/puzzles/${puzzle.id}`,
    "playMode": "SinglePlayer",
    "gamePlatform": "Web Browser",
    "applicationCategory": "Game",
    "genre": "Puzzle",
    "educationalUse": "practice",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    }
  };

  return (
    <>
      <JsonLd data={videoGameSchema} />
      <PuzzleClient puzzle={puzzle} locale={locale} />
    </>
  );
}
