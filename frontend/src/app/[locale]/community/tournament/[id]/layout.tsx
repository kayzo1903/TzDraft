import type { Metadata } from "next";
import { BreadcrumbJsonLd } from "@/components/seo/BreadcrumbJsonLd";
import { JsonLd } from "@/components/seo/JsonLd";
import { getCanonicalUrl, getLanguageAlternates, getSiteUrl, isAppLocale } from "@/lib/seo";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

async function fetchTournament(id: string) {
  try {
    const res = await fetch(`${API_URL}/tournaments/${id}`, { next: { revalidate: 30 } });
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

  const data = await fetchTournament(id);
  const tournament = data?.tournament;

  const siteUrl = getSiteUrl();
  const path = `/community/tournament/${id}`;
  const canonical = getCanonicalUrl(locale, path, siteUrl);
  const ogLocale = locale === "sw" ? "sw_TZ" : "en_TZ";

  if (!tournament) {
    // Fallback: still indexable with generic metadata
    const fallbackTitle = locale === "sw" ? "Mashindano ya Drafti | TzDraft" : "Drafti Tournament | TzDraft";
    const fallbackDesc = locale === "sw"
      ? "Tazama maelezo ya mashindano haya ya Drafti ya Tanzania kwenye TzDraft."
      : "View details for this Tanzania Drafti tournament on TzDraft.";
    return {
      metadataBase: siteUrl,
      title: fallbackTitle,
      description: fallbackDesc,
      alternates: { canonical, languages: getLanguageAlternates(path, siteUrl) },
      robots: { index: true, follow: true },
    };
  }

  const description = locale === "sw" ? tournament.descriptionSw : tournament.descriptionEn;
  const title = `${tournament.name} | TzDraft`;

  return {
    metadataBase: siteUrl,
    title,
    description,
    keywords: [
      tournament.name,
      tournament.format,
      locale === "sw" ? "mashindano ya drafti" : "drafti tournament",
      "tanzania drafti",
      "TzDraft",
    ],
    authors: [{ name: "TzDraft", url: siteUrl.toString() }],
    creator: "TzDraft",
    publisher: "TzDraft",
    category: "Sports",
    applicationName: "TzDraft",
    referrer: "origin-when-cross-origin",
    formatDetection: { telephone: false },
    alternates: { canonical, languages: getLanguageAlternates(path, siteUrl) },
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
      title,
      description,
      url: canonical,
      siteName: "TzDraft",
      locale: ogLocale,
      alternateLocale: [locale === "sw" ? "en_TZ" : "sw_TZ"],
      type: "website",
      images: [{ url: new URL("/logo/logo.png", siteUrl).toString(), width: 1200, height: 630, alt: `${tournament.name} — TzDraft` }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [new URL("/logo/logo.png", siteUrl).toString()],
    },
    other: {
      "revisit-after": "1 day",
      language: locale === "sw" ? "Swahili" : "English",
      rating: "General",
    },
  };
}

export default async function TournamentDetailLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const data = await fetchTournament(id);
  const tournament = data?.tournament;

  const siteUrl = getSiteUrl();

  const sportEventSchema = tournament
    ? {
        "@context": "https://schema.org",
        "@type": "SportsEvent",
        name: tournament.name,
        description: locale === "sw" ? tournament.descriptionSw : tournament.descriptionEn,
        sport: "Drafti",
        location: {
          "@type": "VirtualLocation",
          url: `${siteUrl}/${locale}/community/tournament/${id}`,
        },
        startDate: tournament.scheduledStartAt,
        organizer: { "@type": "Organization", name: "TzDraft", url: siteUrl.toString() },
        url: `${siteUrl}/${locale}/community/tournament/${id}`,
      }
    : null;

  return (
    <>
      {isAppLocale(locale) && (
        <BreadcrumbJsonLd
          locale={locale}
          items={[
            { name: locale === "sw" ? "Nyumbani" : "Home", path: "" },
            { name: locale === "sw" ? "Jamii" : "Community", path: "/community" },
            { name: locale === "sw" ? "Mashindano" : "Tournaments", path: "/community/tournament" },
            { name: tournament?.name ?? id, path: `/community/tournament/${id}` },
          ]}
        />
      )}
      {sportEventSchema && <JsonLd data={sportEventSchema} />}
      {children}
    </>
  );
}
