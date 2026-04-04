import type { Metadata } from "next";
import { BreadcrumbJsonLd } from "@/components/seo/BreadcrumbJsonLd";
import { getCanonicalUrl, getLanguageAlternates, getSiteUrl, isAppLocale } from "@/lib/seo";
import { JsonLd } from "@/components/seo/JsonLd";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

async function fetchPuzzleMetadata(id: string) {
  try {
    const res = await fetch(`${API_URL}/puzzles/${id}`);
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

  const siteUrl = getSiteUrl();
  const canonical = getCanonicalUrl(locale, `/puzzles/${id}`, siteUrl);
  const puzzle = await fetchPuzzleMetadata(id);

  if (!puzzle) {
    return { title: locale === "sw" ? "Fumbo | TzDraft" : "Puzzle | TzDraft" };
  }

  const titleText = puzzle.title ?? (locale === "sw" ? `Fumbo la Drafti #${id.slice(0, 6)}` : `Drafti Puzzle #${id.slice(0, 6)}`);
  const title = `${titleText} | TzDraft Puzzles`;
  const description = locale === "sw" 
    ? `Cheza fumbo la Tanzania Drafti lenye nyota ${puzzle.difficulty}. Mada: ${puzzle.theme ?? "mchanganyiko"}.`
    : `Solve this ${puzzle.difficulty}-star Tanzania Drafti puzzle. Theme: ${puzzle.theme ?? "tactics"}.`;

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

export default async function PuzzleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  if (!isAppLocale(locale)) return children;

  const siteUrl = getSiteUrl();
  const puzzle = await fetchPuzzleMetadata(id);

  const titleText = puzzle?.title ?? (locale === "sw" ? `Fumbo la Drafti #${id.slice(0, 6)}` : `Drafti Puzzle #${id.slice(0, 6)}`);

  return (
    <>
      <BreadcrumbJsonLd
        locale={locale}
        items={[
          { name: locale === "sw" ? "Nyumbani" : "Home", path: "" },
          { name: locale === "sw" ? "Mafumbo" : "Puzzles", path: "/puzzles" },
          { name: titleText },
        ]}
      />
      {puzzle && (
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "Game",
            "name": titleText,
            "description": locale === "sw" 
              ? `Cheza fumbo la Tanzania Drafti lenye nyota ${puzzle.difficulty}.`
              : `Solve this ${puzzle.difficulty}-star Tanzania Drafti puzzle.`,
            "url": `${siteUrl}/${locale}/puzzles/${id}`,
            "genre": "Board Game Tactics",
            "numberOfPlayers": {
              "@type": "QuantitativeValue",
              "value": 1
            }
          }}
        />
      )}
      {children}
    </>
  );
}
