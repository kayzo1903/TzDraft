import { routing } from "@/i18n/routing";

const DEFAULT_SITE_URL = "https://www.tzdraft.co.tz";

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
  return {
    sw: new URL(`/sw${suffix}`, siteUrl).toString(),
    en: new URL(`/en${suffix}`, siteUrl).toString(),
    "x-default": new URL("/", siteUrl).toString(),
  };
}

