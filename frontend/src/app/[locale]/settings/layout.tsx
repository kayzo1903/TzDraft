import type { Metadata } from "next";
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
  const canonical = getCanonicalUrl(locale, "/settings", siteUrl);

  return {
    title: "Settings",
    description: "Manage your TzDraft preferences and account shortcuts.",
    alternates: {
      canonical,
      languages: getLanguageAlternates("/settings", siteUrl),
    },
    openGraph: {
      title: "Settings - TzDraft",
      description: "Manage your TzDraft preferences and account shortcuts.",
      url: canonical,
      locale,
      type: "website",
    },
    robots: {
      index: false,
      follow: false,
      nocache: true,
    },
  };
}

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
