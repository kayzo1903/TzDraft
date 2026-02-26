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
  const canonical = getCanonicalUrl(locale, "/rules", siteUrl);

  return {
    title: "Rules",
    description:
      "Official Tanzania Drafti (8x8) rules: movement, mandatory capture, promotion, and endgame conditions.",
    alternates: {
      canonical,
      languages: getLanguageAlternates("/rules", siteUrl),
    },
    openGraph: {
      title: "Rules - TzDraft",
      description:
        "Official Tanzania Drafti (8x8) rules: movement, mandatory capture, promotion, and endgame conditions.",
      url: canonical,
      locale,
      type: "article",
      images: ["/logo/logo.png"],
    },
  };
}

export default function RulesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
