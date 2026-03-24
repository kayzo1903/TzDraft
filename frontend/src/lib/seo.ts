import type { Metadata } from "next";
import { routing } from "@/i18n/routing";

const DEFAULT_SITE_URL = "https://www.tzdraft.co.tz";
export const SITE_NAME = "TzDraft";
export const DEFAULT_OG_IMAGE_PATH = "/logo/logo.png";

export type AppLocale = (typeof routing.locales)[number];

function normalizeSiteUrl(url: URL): URL {
  const normalized = new URL(url.toString());
  normalized.hash = "";
  normalized.search = "";
  normalized.pathname = "/";

  // Keep canonical host aligned with production redirects.
  if (normalized.hostname === "tzdraft.co.tz") {
    normalized.hostname = "www.tzdraft.co.tz";
  }

  return normalized;
}

export function getSiteUrl(): URL {
  const raw = process.env.NEXT_PUBLIC_SITE_URL || DEFAULT_SITE_URL;
  try {
    return normalizeSiteUrl(new URL(raw));
  } catch {
    return new URL(DEFAULT_SITE_URL);
  }
}

export function isAppLocale(locale: string): locale is AppLocale {
  return routing.locales.includes(locale as AppLocale);
}

export function getCanonicalUrl(
  locale: AppLocale,
  suffix = "",
  siteUrl: URL = getSiteUrl(),
): string {
  return new URL(`/${locale}${suffix}`, siteUrl).toString();
}

export function getLanguageAlternates(
  suffix = "",
  siteUrl: URL = getSiteUrl(),
): Record<string, string> {
  const defaultLocale = routing.defaultLocale;

  return {
    sw: new URL(`/sw${suffix}`, siteUrl).toString(),
    en: new URL(`/en${suffix}`, siteUrl).toString(),
    "x-default": new URL(`/${defaultLocale}${suffix}`, siteUrl).toString(),
  };
}

export function getOgLocale(locale: AppLocale): "sw_TZ" | "en_TZ" {
  return locale === "sw" ? "sw_TZ" : "en_TZ";
}

export function getAlternateOgLocale(locale: AppLocale): "sw_TZ" | "en_TZ" {
  return locale === "sw" ? "en_TZ" : "sw_TZ";
}

export function getAbsoluteUrl(path = "", siteUrl: URL = getSiteUrl()): string {
  return new URL(path, siteUrl).toString();
}

type SeoPageMetadataInput = {
  locale: AppLocale;
  path?: string;
  title: string;
  description: string;
  keywords?: string[];
  ogType?: "website" | "article";
  ogImagePath?: string;
  ogImageAlt?: string;
  /** Absolute URL or path — overrides ogImagePath when set (e.g. Sanity cover images). */
  ogImageUrl?: string;
  revisitAfter?: string;
  noindex?: boolean;
  nofollow?: boolean;
  /** ISO 8601 string — only used when ogType === "article" */
  articlePublishedTime?: string;
  /** Article author names — only used when ogType === "article" */
  articleAuthors?: string[];
};

export function buildPageMetadata({
  locale,
  path = "",
  title,
  description,
  keywords = [],
  ogType = "website",
  ogImagePath = DEFAULT_OG_IMAGE_PATH,
  ogImageAlt = `${SITE_NAME} social image`,
  ogImageUrl,
  revisitAfter,
  noindex = false,
  nofollow = false,
  articlePublishedTime,
  articleAuthors,
}: SeoPageMetadataInput): Metadata {
  const siteUrl = getSiteUrl();
  const canonical = getCanonicalUrl(locale, path, siteUrl);
  const resolvedOgImage = ogImageUrl ?? getAbsoluteUrl(ogImagePath, siteUrl);
  const index = !noindex;
  const follow = !nofollow;
  const other: Record<string, string> = {
    language: locale === "sw" ? "Swahili" : "English",
    rating: "General",
  };

  if (revisitAfter) {
    other["revisit-after"] = revisitAfter;
  }

  return {
    metadataBase: siteUrl,
    title,
    description,
    keywords,
    authors: [{ name: SITE_NAME, url: siteUrl.toString() }],
    creator: SITE_NAME,
    publisher: SITE_NAME,
    category: "Sports",
    applicationName: SITE_NAME,
    referrer: "origin-when-cross-origin",
    formatDetection: { telephone: false },
    alternates: {
      canonical,
      languages: getLanguageAlternates(path, siteUrl),
    },
    robots: {
      index,
      follow,
      googleBot: {
        index,
        follow,
        "max-snippet": -1,
        "max-image-preview": "large",
        "max-video-preview": -1,
      },
    },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: SITE_NAME,
      locale: getOgLocale(locale),
      alternateLocale: [getAlternateOgLocale(locale)],
      type: ogType,
      images: [
        {
          url: resolvedOgImage,
          width: 1200,
          height: 630,
          alt: ogImageAlt,
        },
      ],
      ...(ogType === "article" && {
        publishedTime: articlePublishedTime,
        authors: articleAuthors,
      }),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [resolvedOgImage],
    },
    other,
  };
}

