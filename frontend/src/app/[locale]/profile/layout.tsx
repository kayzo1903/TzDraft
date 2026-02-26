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
  const canonical = getCanonicalUrl(locale, "/profile", siteUrl);

  return {
    title: "Profile",
    description: "Your TzDraft account details and stats.",
    alternates: {
      canonical,
      languages: getLanguageAlternates("/profile", siteUrl),
    },
    openGraph: {
      title: "Profile - TzDraft",
      description: "Your TzDraft account details and stats.",
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

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return children;
}
