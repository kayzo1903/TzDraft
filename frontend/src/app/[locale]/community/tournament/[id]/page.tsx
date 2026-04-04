import TournamentDetailClient from "./TournamentDetailClient";
import type { Metadata } from "next";
import { getCanonicalUrl, getLanguageAlternates, getSiteUrl, isAppLocale } from "@/lib/seo";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

export const revalidate = 30;

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

  const siteUrl = getSiteUrl();
  const canonical = getCanonicalUrl(locale, `/community/tournament/${id}`, siteUrl);
  const data = await fetchTournament(id);

  if (!data?.tournament) {
    const fallbackTitle = locale === "sw" ? "Mashindano | TzDraft" : "Tournament | TzDraft";
    return { title: fallbackTitle };
  }

  const { tournament } = data;
  const title = `${tournament.name} | TzDraft`;
  const description = locale === "sw" ? tournament.descriptionSw : tournament.descriptionEn;
  const ogLocale = locale === "sw" ? "sw_TZ" : "en_TZ";
  const ogLocaleAlt = locale === "sw" ? "en_TZ" : "sw_TZ";

  return {
    title,
    description,
    alternates: {
      canonical,
      languages: getLanguageAlternates(`/community/tournament/${id}`, siteUrl),
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

export default async function TournamentDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const initialData = await fetchTournament(id);

  return (
    <>
      {initialData?.tournament && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SportsEvent",
              "name": initialData.tournament.name,
              "description": locale === "sw" ? initialData.tournament.descriptionSw : initialData.tournament.descriptionEn,
              "startDate": initialData.tournament.scheduledStartAt,
              "url": `${getSiteUrl()}/${locale}/community/tournament/${id}`,
              "maximumAttendeeCapacity": initialData.tournament.maxPlayers,
              "eventStatus": "https://schema.org/EventScheduled",
              "eventAttendanceMode": "https://schema.org/OnlineEventAttendanceMode",
              "location": {
                "@type": "VirtualLocation",
                "url": `${getSiteUrl()}/${locale}/community/tournament/${id}`
              }
            })
          }}
        />
      )}
      <TournamentDetailClient id={id} locale={locale} initialData={initialData} />
    </>
  );
}
