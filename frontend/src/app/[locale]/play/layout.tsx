import type { Metadata } from "next";
import { BreadcrumbJsonLd } from "@/components/seo/BreadcrumbJsonLd";
import { JsonLd } from "@/components/seo/JsonLd";
import {
  getCanonicalUrl,
  getLanguageAlternates,
  getSiteUrl,
  isAppLocale,
} from "@/lib/seo";

const PLAY_META = {
  sw: {
    title: "Cheza Drafti Mtandaoni | AI, Rafiki na Mashindano | TzDraft",
    description:
      "Chagua namna ya kucheza Drafti Tanzania kwenye TzDraft: cheza mtandaoni, pambana na AI, mualike rafiki, au fuatilia mashindano ya jamii.",
    keywords: [
      "cheza drafti mtandaoni",
      "drafti tanzania",
      "drafti ai",
      "cheza na rafiki",
      "mashindano ya drafti",
      "tzdraft",
    ],
  },
  en: {
    title: "Play Tanzania Drafti Online | AI, Friends and Tournaments | TzDraft",
    description:
      "Choose how to play Tanzania Drafti on TzDraft: online matches, AI practice, private friend games, and community tournaments.",
    keywords: [
      "play tanzania drafti online",
      "tanzania checkers online",
      "drafti ai practice",
      "play drafti with friends",
      "drafti tournaments",
      "tzdraft",
    ],
  },
} as const;

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
  const canonical = getCanonicalUrl(locale, "/play", siteUrl);
  const { title, description, keywords } =
    PLAY_META[locale as keyof typeof PLAY_META] ?? PLAY_META.en;

  const ogLocale = locale === "sw" ? "sw_TZ" : "en_TZ";

  return {
    metadataBase: siteUrl,
    title,
    description,
    keywords: [...keywords],
    authors: [{ name: "TzDraft", url: siteUrl.toString() }],
    creator: "TzDraft",
    publisher: "TzDraft",
    category: "Sports",
    applicationName: "TzDraft",
    referrer: "origin-when-cross-origin",
    formatDetection: { telephone: false },
    alternates: {
      canonical,
      languages: getLanguageAlternates("/play", siteUrl),
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
      title,
      description,
      url: canonical,
      siteName: "TzDraft",
      locale: ogLocale,
      alternateLocale: [locale === "sw" ? "en_TZ" : "sw_TZ"],
      type: "website",
      images: [{ url: new URL("/logo/logo.png", siteUrl).toString(), width: 1200, height: 630, alt: "TzDraft — Play Tanzania Drafti" }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [new URL("/logo/logo.png", siteUrl).toString()],
    },
    other: {
      "revisit-after": "3 days",
      language: locale === "sw" ? "Swahili" : "English",
      rating: "General",
    },
  };
}

export default async function PlayLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!isAppLocale(locale)) {
    return children;
  }

  const siteUrl = getSiteUrl();
  const playUrl = `${siteUrl}/${locale}/play`;
  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: locale === "sw" ? "Namna za kucheza TzDraft" : "Ways to play on TzDraft",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: locale === "sw" ? "Cheza Mtandaoni" : "Play Online",
        url: `${siteUrl}/${locale}/game/setup-online`,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: locale === "sw" ? "Cheza na AI" : "Play vs AI",
        url: `${siteUrl}/${locale}/game/setup-ai`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: locale === "sw" ? "Cheza na Rafiki" : "Play with a Friend",
        url: `${siteUrl}/${locale}/game/setup-friend`,
      },
      {
        "@type": "ListItem",
        position: 4,
        name: locale === "sw" ? "Mashindano" : "Tournaments",
        url: `${siteUrl}/${locale}/community/tournament`,
      },
    ],
  };

  const webPageSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: locale === "sw" ? "Ukurasa wa kucheza TzDraft" : "TzDraft play page",
    description:
      locale === "sw"
        ? "Chagua mechi za mtandaoni, AI, rafiki, au mashindano ya Drafti Tanzania."
        : "Choose online matches, AI practice, private friend games, or tournaments for Tanzania Drafti.",
    url: playUrl,
  };

  return (
    <>
      <JsonLd data={webPageSchema} />
      <JsonLd data={itemListSchema} />
      <BreadcrumbJsonLd
        locale={locale}
        items={[
          { name: locale === "sw" ? "Nyumbani" : "Home", path: "" },
          { name: locale === "sw" ? "Cheza" : "Play", path: "/play" },
        ]}
      />
      {children}
    </>
  );
}
