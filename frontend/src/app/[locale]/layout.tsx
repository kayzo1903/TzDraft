import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { JsonLd } from "@/components/seo/JsonLd";
import { EngineInit } from "@/components/engine/EngineInit";
import { AuthInitializer } from "@/components/auth/AuthInitializer";
import type { Metadata } from "next";
import {
  getCanonicalUrl,
  getLanguageAlternates,
  getSiteUrl,
  isAppLocale,
} from "@/lib/seo";

const SITE_NAME = "TzDraft";

const LOCALE_META = {
  sw: {
    title: "TzDraft | Cheza Drafti Mtandaoni Tanzania — Bure Kabisa",
    description:
      "Cheza Drafti mtandaoni na marafiki au dhidi ya AI. Jisajili bure leo na jiunge na zaidi ya wachezaji 500 kila siku Tanzania.",
  },
  en: {
    title: "TzDraft | Play Tanzania Drafti Online — Free",
    description:
      "Play Tanzania Drafti (8×8) online against AI or friends. Free to join — Tanzania's dedicated online Drafti platform.",
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

  const { title, description } =
    LOCALE_META[locale as keyof typeof LOCALE_META] ?? LOCALE_META.en;

  const siteUrl = getSiteUrl();
  const canonical = getCanonicalUrl(locale, "", siteUrl);
  const ogLocale = locale === "sw" ? "sw_TZ" : "en_TZ";
  const ogLocaleAlt = locale === "sw" ? "en_TZ" : "sw_TZ";

  return {
    metadataBase: siteUrl,
    applicationName: SITE_NAME,
    title: {
      default: title,
      template: `%s | ${SITE_NAME}`,
    },
    description,
    authors: [{ name: SITE_NAME, url: siteUrl.toString() }],
    creator: SITE_NAME,
    publisher: SITE_NAME,
    category: "Sports",
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
      type: "website",
      siteName: SITE_NAME,
      title,
      description,
      url: canonical,
      locale: ogLocale,
      alternateLocale: [ogLocaleAlt],
      images: [
        {
          url: new URL("/logo/tzdraft-logo-solid.png", siteUrl).toString(),
          width: 1200,
          height: 630,
          alt: "TzDraft — Tanzania Drafti Online",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [new URL("/logo/tzdraft-logo-solid.png", siteUrl).toString()],
    },
    icons: {
      icon: "/logo/tzdraft-logo-solid.png",
    },
  };
}

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "TzDraft",
  url: "https://www.tzdraft.co.tz",
  logo: "https://www.tzdraft.co.tz/logo/tzdraft-logo-solid.png",
  description:
    "Tanzania's dedicated online Drafti gaming platform. Play against AI or friends for free.",
  address: {
    "@type": "PostalAddress",
    addressCountry: "TZ",
    addressRegion: "Dar es Salaam",
  },
};

const gameSchema = {
  "@context": "https://schema.org",
  "@type": "VideoGame",
  name: "TzDraft — Drafti Mtandaoni",
  description:
    "Cheza Drafti mtandaoni Tanzania. Piga vita AI au marafiki wako bila malipo.",
  url: "https://www.tzdraft.co.tz",
  image: "https://www.tzdraft.co.tz/logo/tzdraft-logo-solid.png",
  numberOfPlayers: {
    "@type": "QuantitativeValue",
    minValue: 1,
    maxValue: 2,
  },
  gamePlatform: "Web Browser",
  inLanguage: ["sw", "en"],
  countryOfOrigin: {
    "@type": "Country",
    name: "Tanzania",
  },
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "TZS",
    availability: "https://schema.org/InStock",
  },
};

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!isAppLocale(locale)) {
    notFound();
  }

  const messages = await getMessages();

  return (
    <NextIntlClientProvider messages={messages}>
      <AuthInitializer />
      <EngineInit />
      <JsonLd data={organizationSchema} />
      <JsonLd data={gameSchema} />
      <Navbar />
      {children}
      <Footer />
    </NextIntlClientProvider>
  );
}
