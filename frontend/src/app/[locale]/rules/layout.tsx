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
  params: Promise<{ locale: string }> | { locale: string };
}): Promise<Metadata> {
  const resolvedParams = params instanceof Promise ? await params : params;
  const locale = resolvedParams.locale;

  if (!isAppLocale(locale)) {
    return {};
  }

  const siteUrl = getSiteUrl();
  const canonical = getCanonicalUrl(locale, "/rules", siteUrl);
  const meta = {
    sw: {
      title: "Sheria za Drafti | Jinsi ya Kucheza Drafti Tanzania",
      description:
        "Soma sheria rasmi za Drafti ya Tanzania: mwendo, kula lazima, kupandishwa kuwa kingi, na masharti ya ushindi.",
      keywords: [
        "sheria za drafti",
        "jinsi ya kucheza drafti tanzania",
        "kanuni za drafti",
        "tanzania drafti rules",
      ],
    },
    en: {
      title: "Tanzania Drafti Rules | How To Play Drafti",
      description:
        "Learn the official Tanzania Drafti (8x8) rules: movement, mandatory capture, promotion, and winning conditions.",
      keywords: [
        "tanzania drafti rules",
        "how to play drafti",
        "drafti rules 8x8",
        "mandatory capture drafti",
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
      languages: getLanguageAlternates("/rules", siteUrl),
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
      type: "article",
      images: [{ url: new URL("/logo/logo.png", siteUrl).toString(), width: 1200, height: 630, alt: "Tanzania Drafti Rules — TzDraft" }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [new URL("/logo/logo.png", siteUrl).toString()],
    },
    other: {
      "revisit-after": "1 week",
      language: locale === "sw" ? "Swahili" : "English",
      rating: "General",
    },
  };
}

export default async function RulesLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const siteUrl = getSiteUrl();

  if (!isAppLocale(locale)) {
    return children;
  }

  return (
    <>
      <BreadcrumbJsonLd
        locale={locale}
        items={[
          { name: locale === "sw" ? "Nyumbani" : "Home", path: "" },
          { name: locale === "sw" ? "Sheria" : "Rules", path: "/rules" },
        ]}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          name:
            locale === "sw"
              ? "Sheria za Drafti Tanzania"
              : "Tanzania Drafti Rules",
          description:
            locale === "sw"
              ? "Sheria rasmi za Drafti Tanzania kwenye TzDraft."
              : "Official Tanzania Drafti rules on TzDraft.",
          url: `${siteUrl}/${locale}/rules`,
        }}
      />
      {children}
    </>
  );
}
