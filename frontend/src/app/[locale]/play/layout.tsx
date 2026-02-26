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
  const canonical = getCanonicalUrl(locale, "/play", siteUrl);

  return {
    title: "Play",
    description:
      "Choose how you want to play Tanzania Drafti: vs AI, friends, or online modes.",
    alternates: {
      canonical,
      languages: getLanguageAlternates("/play", siteUrl),
    },
    openGraph: {
      title: "Play - TzDraft",
      description:
        "Choose how you want to play Tanzania Drafti: vs AI, friends, or online modes.",
      url: canonical,
      locale,
      type: "website",
      images: ["/logo/logo.png"],
    },
  };
}

export default function PlayLayout({ children }: { children: React.ReactNode }) {
  return children;
}
