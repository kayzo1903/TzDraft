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
  const canonical = getCanonicalUrl(locale, "/policy", siteUrl);

  return {
    title: "Policy",
    description: "TzDraft policies: fair play, privacy, and platform guidelines.",
    alternates: {
      canonical,
      languages: getLanguageAlternates("/policy", siteUrl),
    },
    openGraph: {
      title: "Policy - TzDraft",
      description: "TzDraft policies: fair play, privacy, and platform guidelines.",
      url: canonical,
      locale,
      type: "article",
      images: ["/logo/logo.png"],
    },
  };
}

export default function PolicyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
