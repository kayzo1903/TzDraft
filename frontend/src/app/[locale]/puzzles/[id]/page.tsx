import { Metadata } from "next";
import { notFound } from "next/navigation";
import { PuzzleClient, type PuzzleData, difficultyStars } from "./PuzzleClient";
import { JsonLd } from "@/components/seo/JsonLd";
import { getCanonicalUrl, getLanguageAlternates, getSiteUrl, isAppLocale } from "@/lib/seo";

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

  const themeDisplay = puzzle.theme ? `${puzzle.theme.charAt(0).toUpperCase() + puzzle.theme.slice(1)}` : "Tactics";
  const stars = difficultyStars(puzzle.difficulty);
  
  const title = locale === "sw" 
    ? `Fumbo la Drafti: ${themeDisplay} (${stars}) | TzDraft`
    : `Drafti Puzzle: ${themeDisplay} (${stars}) | TzDraft`;
    
  const description = locale === "sw"
    ? `Jaribu fumbo hili la TzDraft. Mada: ${themeDisplay}. Ugumu: ${puzzle.difficulty}/5.`
    : `Solve this TzDraft tactical puzzle. Theme: ${themeDisplay}. Difficulty: ${puzzle.difficulty}/5.`;

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
  const puzzle = await getPuzzle(id);

  if (!puzzle) {
    notFound();
  }

  const siteUrl = getSiteUrl();

  const videoGameSchema = {
    "@context": "https://schema.org",
    "@type": "VideoGame",
    "name": puzzle.title ?? (locale === "sw" ? `Fumbo la Drafti #${puzzle.id.slice(0, 6)}` : `Drafti Puzzle #${puzzle.id.slice(0, 6)}`),
    "description": locale === "sw" 
      ? `Fumbo la kiufundi la Tanzania Drafti lenye ugumu wa ${puzzle.difficulty} kati ya 5.`
      : `Tanzania Drafti tactical puzzle with difficulty ${puzzle.difficulty} out of 5.`,
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
