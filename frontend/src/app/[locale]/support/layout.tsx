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
  const canonical = getCanonicalUrl(locale, "/support", siteUrl);

  return {
    title: "Support",
    description: "Get help with TzDraft: account, gameplay, and reporting issues.",
    alternates: {
      canonical,
      languages: getLanguageAlternates("/support", siteUrl),
    },
    openGraph: {
      title: "Support - TzDraft",
      description: "Get help with TzDraft: account, gameplay, and reporting issues.",
      url: canonical,
      locale,
      type: "website",
      images: ["/logo/logo.png"],
    },
  };
}

export default function SupportLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
