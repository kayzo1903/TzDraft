import React from "react";
import type { Metadata } from "next";
import { getCanonicalUrl, getLanguageAlternates, getSiteUrl, isAppLocale } from "@/lib/seo";
import { HomeSwitcher } from "@/components/home/HomeSwitcher";

const HOME_META = {
  sw: {
    title: "TzDraft | Nyumbani Rasmi kwa Drafti ya Tanzania Mtandaoni",
    description:
      "Jukwaa rasmi la kucheza Tanzania Drafti (8×8) mtandaoni. Jifunze sheria rasmi, mbinu za ushindi, na pambana na wachezaji bora Tanzania nzima. Bure kabisa.",
    keywords: [
      "tzdraft",
      "drafti tanzania",
      "cheza drafti mtandaoni",
      "sheria za drafti tanzania",
      "mbinu za kushinda drafti",
      "drafti mchezo rasmi",
      "cheza drafti bure",
    ],
    ogAlt: "TzDraft — Nyumbani Rasmi kwa Drafti ya Tanzania Mtandaoni",
  },
  en: {
    title: "TzDraft | Official Home of Tanzania Drafti (8×8) Online",
    description:
      "Play on the official platform for Tanzania Drafti. Master the game with official rules and strategies, challenge AI, or compete in national leagues. Free & optimized for mobile.",
    keywords: [
      "tzdraft",
      "tanzania drafti official",
      "play tanzania draughts",
      "tanzania drafti rules",
      "winning drafti strategies",
      "play drafti online free",
      "tanzania checkers",
    ],
    ogAlt: "TzDraft — Official Tanzania Drafti Platform",
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
  const canonical = getCanonicalUrl(locale, "", siteUrl);
  const m = HOME_META[locale as keyof typeof HOME_META] ?? HOME_META.en;
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
      languages: getLanguageAlternates("", siteUrl),
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
          url: new URL("/logo/tzdraft-logo-solid.png", siteUrl).toString(),
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
      images: [new URL("/logo/tzdraft-logo-solid.png", siteUrl).toString()],
    },
    icons: {
      icon: "/logo/tzdraft-logo-solid.png",
    },
    other: {
      "revisit-after": "1 day",
      language: locale === "sw" ? "Swahili" : "English",
      rating: "General",
    },
  };
}

export default async function Home() {
  return <HomeSwitcher />;
}
