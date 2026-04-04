import type { Metadata } from "next";
import { BreadcrumbJsonLd } from "@/components/seo/BreadcrumbJsonLd";
import { JsonLd } from "@/components/seo/JsonLd";
import {
  getCanonicalUrl,
  getLanguageAlternates,
  getSiteUrl,
  isAppLocale,
} from "@/lib/seo";

const META = {
  sw: {
    title: "Cheza Drafti Mtandaoni | Pata Mpinzani wa Kweli | TzDraft",
    description:
      "Ingia kwenye foleni ya mechi ya Drafti ya Tanzania na upate mpinzani wa kweli kwa sekunde chache. Chagua muda wako na uanze kucheza sasa hivi bila malipo.",
    keywords: [
      "cheza drafti mtandaoni",
      "mpinzani wa kweli drafti",
      "foleni ya mechi drafti",
      "drafti tanzania online",
      "tzdraft online",
      "drafti ya haraka mtandaoni",
    ],
    ogAlt: "Cheza Drafti Mtandaoni — TzDraft",
  },
  en: {
    title: "Play Tanzania Drafti Online | Find Real Opponents Fast | TzDraft",
    description:
      "Enter the matchmaking queue and get paired with a real Tanzania Drafti opponent in seconds. Pick your time control and start playing free online now.",
    keywords: [
      "play drafti online",
      "online drafti matchmaking",
      "real opponent drafti",
      "tanzania drafti online game",
      "tzdraft online play",
      "fast drafti match",
      "play tanzania draughts online",
    ],
    ogAlt: "Play Tanzania Drafti Online — TzDraft",
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
  const canonical = getCanonicalUrl(locale, "/game/setup-online", siteUrl);
  const m = META[locale as keyof typeof META] ?? META.en;
  const ogLocale = locale === "sw" ? "sw_TZ" : "en_TZ";
  const ogLocaleAlt = locale === "sw" ? "en_TZ" : "sw_TZ";

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
      languages: getLanguageAlternates("/game/setup-online", siteUrl),
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
      locale: ogLocale,
      alternateLocale: [ogLocaleAlt],
      type: "website",
      images: [
        {
          url: new URL("/logo/logo.png", siteUrl).toString(),
          width: 1200,
          height: 630,
          alt: m.ogAlt,
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
      "revisit-after": "1 day",
      language: locale === "sw" ? "Swahili" : "English",
      rating: "General",
    },
  };
}

export default async function SetupOnlineLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const siteUrl = getSiteUrl();

  const softwareAppSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": locale === "sw" ? "Cheza Drafti Mtandaoni" : "TzDraft Online Matchmaking",
    "applicationCategory": "GameApplication",
    "genre": "Board Games",
    "operatingSystem": "Any",
    "description": locale === "sw" ? "Cheza mechi za Drafti tanzania mtandaoni dhidi ya wapinzani wengine." : "Play online Tanzania Drafti matches against live opponents.",
    "url": `${siteUrl}/${locale}/game/setup-online`,
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    }
  };

  return (
    <>
      <JsonLd data={softwareAppSchema} />
      {isAppLocale(locale) && (
        <BreadcrumbJsonLd
          locale={locale}
          items={[
            { name: locale === "sw" ? "Nyumbani" : "Home", path: "" },
            { name: locale === "sw" ? "Cheza" : "Play", path: "/play" },
            {
              name: locale === "sw" ? "Cheza Mtandaoni" : "Play Online",
              path: "/game/setup-online",
            },
          ]}
        />
      )}
      {children}
    </>
  );
}
