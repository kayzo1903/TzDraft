import type { Metadata } from "next";
import { BreadcrumbJsonLd } from "@/components/seo/BreadcrumbJsonLd";
import { JsonLd } from "@/components/seo/JsonLd";
import {
  getCanonicalUrl,
  getLanguageAlternates,
  getSiteUrl,
  isAppLocale,
} from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;

  if (!isAppLocale(locale)) return {};

  const siteUrl = getSiteUrl();
  const canonical = getCanonicalUrl(locale, "/learn", siteUrl);

  const meta = {
    sw: {
      title: "Makala na Mwongozo wa Drafti Tanzania",
      description:
        "Jifunze sheria za Drafti ya Tanzania, mikakati, historia, na jinsi ya kucheza mtandaoni.",
      keywords: [
        "makala drafti tanzania",
        "mwongozo wa drafti",
        "sheria za drafti",
        "mikakati ya drafti",
      ],
    },
    en: {
      title: "Tanzania Drafti Articles and Guides",
      description:
        "Learn Tanzania Drafti rules, strategy, history, and how to play online.",
      keywords: [
        "tanzania drafti articles",
        "drafti guides",
        "drafti strategy",
        "drafti rules online",
      ],
    },
  } as const;

  const { title, description, keywords } = meta[locale as keyof typeof meta] ?? meta.en;

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
      languages: getLanguageAlternates("/learn", siteUrl),
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
      images: [{ url: new URL("/logo/logo.png", siteUrl).toString(), width: 1200, height: 630, alt: "TzDraft — Tanzania Drafti Articles" }],
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

export default async function LearnLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const siteUrl = getSiteUrl();
  const pageUrl = `${siteUrl}/${locale}/learn`;

  return (
    <>
      {isAppLocale(locale) && (
        <BreadcrumbJsonLd
          locale={locale}
          items={[
            { name: locale === "sw" ? "Nyumbani" : "Home", path: "" },
            { name: locale === "sw" ? "Makala" : "Articles", path: "/learn" },
          ]}
        />
      )}
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name:
            locale === "sw"
              ? "Makala na Mwongozo wa Drafti Tanzania"
              : "Tanzania Drafti Articles and Guides",
          description:
            locale === "sw"
              ? "Makala ya sheria, historia, na mikakati ya Drafti Tanzania."
              : "Articles about Tanzania Drafti rules, history, and strategy.",
          url: pageUrl,
        }}
      />
      {children}
    </>
  );
}
