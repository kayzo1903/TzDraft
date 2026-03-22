import type { Metadata } from "next";
import { BreadcrumbJsonLd } from "@/components/seo/BreadcrumbJsonLd";
import {
  getCanonicalUrl,
  getLanguageAlternates,
  getSiteUrl,
  isAppLocale,
} from "@/lib/seo";

const META = {
  sw: {
    title: "Cheza Drafti na Rafiki | Mwaliko wa Kibinafsi | TzDraft",
    description:
      "Mualike rafiki wako kucheza Drafti ya Tanzania kupitia msimbo wa mwaliko au nambari ya WhatsApp. Pia cheza ana kwa ana kwenye kifaa kimoja bila ya mtandao.",
    keywords: [
      "cheza drafti na rafiki",
      "mwaliko wa drafti",
      "mechi ya kibinafsi drafti",
      "drafti ana kwa ana",
      "tzdraft na rafiki",
      "mechi ya kibinafsi",
    ],
    ogAlt: "Cheza Drafti na Rafiki — TzDraft",
  },
  en: {
    title: "Play Drafti With a Friend | Private Match & Local Pass-and-Play | TzDraft",
    description:
      "Challenge a friend to a private Tanzania Drafti game online via invite code or WhatsApp, or play face-to-face on one device with local pass-and-play.",
    keywords: [
      "play drafti with friends",
      "private drafti match",
      "drafti invite code",
      "pass and play drafti",
      "local drafti game",
      "challenge friend drafti",
      "tzdraft private game",
    ],
    ogAlt: "Play Drafti With a Friend — TzDraft",
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
  const canonical = getCanonicalUrl(locale, "/game/setup-friend", siteUrl);
  const m = META[locale as keyof typeof META] ?? META.en;
  const ogLocale = locale === "sw" ? "sw_TZ" : "en_TZ";
  const ogLocaleAlt = locale === "sw" ? "en_TZ" : "sw_TZ";

  return {
    metadataBase: siteUrl,
    title: m.title,
    description: m.description,
    keywords: m.keywords,
    authors: [{ name: "TzDraft", url: siteUrl.toString() }],
    creator: "TzDraft",
    publisher: "TzDraft",
    category: "Sports",
    applicationName: "TzDraft",
    referrer: "origin-when-cross-origin",
    formatDetection: { telephone: false },

    alternates: {
      canonical,
      languages: getLanguageAlternates("/game/setup-friend", siteUrl),
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
      "revisit-after": "3 days",
      language: locale === "sw" ? "Swahili" : "English",
      rating: "General",
    },
  };
}

export default async function SetupFriendLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return (
    <>
      {isAppLocale(locale) && (
        <BreadcrumbJsonLd
          locale={locale}
          items={[
            { name: locale === "sw" ? "Nyumbani" : "Home", path: "" },
            { name: locale === "sw" ? "Cheza" : "Play", path: "/play" },
            {
              name: locale === "sw" ? "Cheza na Rafiki" : "Play with Friend",
              path: "/game/setup-friend",
            },
          ]}
        />
      )}
      {children}
    </>
  );
}
