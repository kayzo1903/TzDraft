import type { Metadata } from "next";
import {
  getCanonicalUrl,
  getLanguageAlternates,
  getSiteUrl,
  isAppLocale,
} from "@/lib/seo";
import { JsonLd } from "@/components/seo/JsonLd";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }> | { locale: string };
}): Promise<Metadata> {
  const resolvedParams = params instanceof Promise ? await params : params;
  const locale = resolvedParams.locale;

  if (!isAppLocale(locale)) {
    return {};
  }

  const siteUrl = getSiteUrl();
  const canonical = getCanonicalUrl(locale, "/leaderboard", siteUrl);
  const meta = {
    sw: {
      title: "Orodha ya Bingwa | Wachezaji Bora Tanzania",
      description:
        "Tazama viwango vya TzDraft na wachezaji bora wa Drafti Tanzania kwa rating, idadi ya michezo, na nafasi zao.",
    },
    en: {
      title: "Leaderboard | Top Tanzania Drafti Players",
      description:
        "See the TzDraft leaderboard with top Tanzania Drafti players ranked by rating, games played, and position.",
    },
  } as const;
  const { title, description } = meta[locale as keyof typeof meta] ?? meta.en;

  return {
    title,
    description,
    alternates: {
      canonical,
      languages: getLanguageAlternates("/leaderboard", siteUrl),
    },
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

export default function LeaderboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const siteUrl = getSiteUrl();
  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "TzDraft Leaderboard — Top Tanzania Drafti Players",
    description:
      "Rankings of the top Tanzania Drafti (Drafti) players on TzDraft, ordered by rating.",
    url: `${siteUrl}/sw/leaderboard`,
    itemListOrder: "https://schema.org/ItemListOrderDescending",
  };

  return (
    <>
      <JsonLd data={itemListSchema} />
      {children}
    </>
  );
}
