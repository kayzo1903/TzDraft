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
    },
    en: {
      title: "Tanzania Drafti Articles and Guides",
      description:
        "Learn Tanzania Drafti rules, strategy, history, and how to play online.",
    },
  } as const;

  const { title, description } = meta[locale as keyof typeof meta] ?? meta.en;

  return {
    title,
    description,
    alternates: {
      canonical,
      languages: getLanguageAlternates("/learn", siteUrl),
    },
    openGraph: {
      title,
      description,
      url: canonical,
      locale,
      type: "website",
      images: ["/logo/logo.png"],
    },
  };
}

export default function LearnLayout({ children }: { children: React.ReactNode }) {
  return children;
}
