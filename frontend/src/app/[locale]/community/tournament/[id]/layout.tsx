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
  if (!tournament) return {};

  const siteUrl = getSiteUrl();
  const path = `/community/tournament/${id}`;
  const canonical = getCanonicalUrl(locale, path, siteUrl);

  const description = locale === "sw" ? tournament.descriptionSw : tournament.descriptionEn;
  const title = `${tournament.name} | TzDraft`;

  return {
    title,
    description,
    alternates: { canonical, languages: getLanguageAlternates(path, siteUrl) },
    openGraph: {
      title,
      description,
      url: canonical,
      locale,
      type: "website",
      images: ["/logo/logo.png"],
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
