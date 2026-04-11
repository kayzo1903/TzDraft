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
  const canonical = getCanonicalUrl(locale, "/policy", siteUrl);
  const meta = {
    sw: {
      title: "Sera na Faragha | Kanuni za TzDraft",
      description:
        "Soma sera ya TzDraft kuhusu mchezo wa haki, faragha ya mtumiaji, usalama wa akaunti, na matumizi ya taarifa.",
      keywords: [
        "sera ya tzdraft",
        "faragha ya tzdraft",
        "kanuni za drafti",
        "usalama wa akaunti tzdraft",
      ],
    },
    en: {
      title: "Policy and Privacy | TzDraft Guidelines",
      description:
        "Read TzDraft's policy and privacy guidelines covering fair play, account safety, user data, and platform rules.",
      keywords: [
        "tzdraft policy",
        "tzdraft privacy",
        "fair play policy drafti",
        "account safety tzdraft",
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
      languages: getLanguageAlternates("/policy", siteUrl),
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
      images: [{ url: new URL("/logo/logo-universal.png", siteUrl).toString(), width: 1200, height: 630, alt: "TzDraft Policy & Privacy" }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [new URL("/logo/logo-universal.png", siteUrl).toString()],
    },
    other: {
      "revisit-after": "1 month",
      language: locale === "sw" ? "Swahili" : "English",
      rating: "General",
    },
  };
}

export default async function PolicyLayout({
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
          {
            name: locale === "sw" ? "Sera na Faragha" : "Policy & Privacy",
            path: "/policy",
          },
        ]}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          name:
            locale === "sw"
              ? "Sera na Faragha za TzDraft"
              : "TzDraft Policy and Privacy",
          description:
            locale === "sw"
              ? "Kanuni za fair play, faragha, na usalama wa akaunti za TzDraft."
              : "TzDraft guidelines for fair play, privacy, and account safety.",
          url: `${siteUrl}/${locale}/policy`,
        }}
      />
      {children}
    </>
  );
}
