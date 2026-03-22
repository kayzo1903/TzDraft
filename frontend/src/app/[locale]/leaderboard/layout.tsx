import type { Metadata } from "next";
import { BreadcrumbJsonLd } from "@/components/seo/BreadcrumbJsonLd";
import { JsonLd } from "@/components/seo/JsonLd";
import {
  getCanonicalUrl,
  getLanguageAlternates,
  getSiteUrl,
  isAppLocale,
} from "@/lib/seo";

/* ── Per-locale copy ─────────────────────────────────────────────────────── */

const META = {
  sw: {
    title: "Orodha ya Ubora | Wachezaji Bora wa Drafti Tanzania — TzDraft",
    description:
      "Angalia orodha kamili ya wachezaji bora wa Tanzania Drafti kwenye TzDraft. Viwango vya rating, idadi ya michezo, asilimia ya ushindi, na nafasi za mkoa na nchi.",
    keywords: [
      "orodha ya ubora drafti",
      "wachezaji bora drafti tanzania",
      "rating ya drafti",
      "tzdraft leaderboard",
      "orodha ya wachezaji drafti",
      "viwango vya drafti",
      "mchezo wa drafti tanzania",
      "bingwa wa drafti",
    ],
    ogLocale: "sw_TZ",
    ogLocaleAlt: "en_TZ",
  },
  en: {
    title: "Leaderboard | Top Tanzania Drafti Players Ranked by Rating — TzDraft",
    description:
      "Explore the TzDraft leaderboard featuring the highest-rated Tanzania Drafti players. Filter by global, country, or region — updated every 5 minutes.",
    keywords: [
      "tanzania drafti leaderboard",
      "top drafti players",
      "drafti rating ranking",
      "tzdraft leaderboard",
      "drafti player rankings",
      "tanzania draughts rankings",
      "tzdraft top players",
      "best drafti players tanzania",
    ],
    ogLocale: "en_TZ",
    ogLocaleAlt: "sw_TZ",
  },
} as const;

/* ── generateMetadata ────────────────────────────────────────────────────── */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }> | { locale: string };
}): Promise<Metadata> {
  const resolvedParams = params instanceof Promise ? await params : params;
  const locale = resolvedParams.locale;

  if (!isAppLocale(locale)) return {};

  const siteUrl = getSiteUrl();
  const canonical = getCanonicalUrl(locale, "/leaderboard", siteUrl);
  const m = META[locale as keyof typeof META] ?? META.en;

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
      languages: getLanguageAlternates("/leaderboard", siteUrl),
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
      locale: m.ogLocale,
      alternateLocale: [m.ogLocaleAlt],
      type: "website",
      images: [
        {
          url: new URL("/logo/logo.png", siteUrl).toString(),
          width: 1200,
          height: 630,
          alt:
            locale === "sw"
              ? "Orodha ya Ubora ya TzDraft"
              : "TzDraft Leaderboard — Top Tanzania Drafti Players",
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
      "revisit-after": "3 days",
      language: locale === "sw" ? "Swahili" : "English",
      rating: "General",
    },
  };
}

/* ── Layout ──────────────────────────────────────────────────────────────── */

export default async function LeaderboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const siteUrl = getSiteUrl();
  const canonical = getCanonicalUrl(
    isAppLocale(locale) ? locale : "en",
    "/leaderboard",
    siteUrl,
  );

  const isSw = locale === "sw";

  /* WebSite schema — sitelinks search box signal */
  const webSiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "TzDraft",
    url: siteUrl.toString(),
    inLanguage: [isSw ? "sw-TZ" : "en-TZ"],
    description: isSw
      ? "Jukwaa la mchezo wa Tanzania Drafti (Drafti) mtandaoni."
      : "Tanzania Draughts online gaming platform.",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${siteUrl.toString()}${locale}/leaderboard?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };

  /* CollectionPage schema */
  const collectionPageSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: isSw ? "Orodha ya Ubora ya TzDraft" : "TzDraft Leaderboard",
    description: isSw
      ? "Viwango kamili vya wachezaji wa Tanzania Drafti kwenye TzDraft."
      : "Complete rankings of Tanzania Drafti players on TzDraft, ordered by rating.",
    url: canonical,
    inLanguage: isSw ? "sw-TZ" : "en-TZ",
    isPartOf: { "@type": "WebSite", url: siteUrl.toString(), name: "TzDraft" },
    about: {
      "@type": "SportsOrganization",
      name: "TzDraft",
      sport: "Tanzania Draughts",
      url: siteUrl.toString(),
    },
    dateModified: new Date().toISOString(),
    publisher: {
      "@type": "Organization",
      name: "TzDraft",
      url: siteUrl.toString(),
      logo: {
        "@type": "ImageObject",
        url: new URL("/logo/logo.png", siteUrl).toString(),
      },
    },
  };

  return (
    <>
      {isAppLocale(locale) && (
        <BreadcrumbJsonLd
          locale={locale}
          items={[
            { name: isSw ? "Nyumbani" : "Home", path: "" },
            {
              name: isSw ? "Orodha ya Ubora" : "Leaderboard",
              path: "/leaderboard",
            },
          ]}
        />
      )}
      <JsonLd data={webSiteSchema} />
      <JsonLd data={collectionPageSchema} />
      {children}
    </>
  );
}
