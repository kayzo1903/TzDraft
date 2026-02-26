import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import type { Metadata } from "next";
import {
  getCanonicalUrl,
  getLanguageAlternates,
  getSiteUrl,
  isAppLocale,
} from "@/lib/seo";

const SITE_NAME = "TzDraft";
const DEFAULT_DESCRIPTION =
  "Play Tanzania Drafti (8x8) online. Learn the rules, practice vs AI, and enjoy the classic game.";

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
  const canonical = getCanonicalUrl(locale, "", siteUrl);

  return {
    metadataBase: siteUrl,
    applicationName: SITE_NAME,
    title: {
      default: `${SITE_NAME} - Tanzania Drafti`,
      template: `%s - ${SITE_NAME}`,
    },
    description: DEFAULT_DESCRIPTION,
    alternates: {
      canonical,
      languages: getLanguageAlternates("", siteUrl),
    },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      title: `${SITE_NAME} - Tanzania Drafti`,
      description: DEFAULT_DESCRIPTION,
      url: canonical,
      locale,
      images: ["/logo/logo.png"],
    },
    twitter: {
      card: "summary_large_image",
      title: `${SITE_NAME} - Tanzania Drafti`,
      description: DEFAULT_DESCRIPTION,
      images: ["/logo/logo.png"],
    },
    icons: {
      icon: "/logo/logo.png",
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!isAppLocale(locale)) {
    notFound();
  }

  const messages = await getMessages();

  return (
    <NextIntlClientProvider messages={messages}>
      <Navbar />
      {children}
      <Footer />
    </NextIntlClientProvider>
  );
}
