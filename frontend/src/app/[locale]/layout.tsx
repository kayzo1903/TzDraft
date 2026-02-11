import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import type { Metadata } from "next";

const getSiteUrl = () => {
  const raw = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  try {
    return new URL(raw);
  } catch {
    return new URL("http://localhost:3000");
  }
};

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

  const siteUrl = getSiteUrl();
  const canonical = new URL(`/${locale}`, siteUrl);

  return {
    metadataBase: siteUrl,
    applicationName: SITE_NAME,
    title: {
      default: `${SITE_NAME} — Tanzania Drafti`,
      template: `%s — ${SITE_NAME}`,
    },
    description: DEFAULT_DESCRIPTION,
    alternates: {
      canonical,
      languages: {
        sw: new URL("/sw", siteUrl),
        en: new URL("/en", siteUrl),
      },
    },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      title: `${SITE_NAME} — Tanzania Drafti`,
      description: DEFAULT_DESCRIPTION,
      url: canonical,
      locale,
    },
    twitter: {
      card: "summary_large_image",
      title: `${SITE_NAME} — Tanzania Drafti`,
      description: DEFAULT_DESCRIPTION,
    },
    icons: {
      icon: "/logo/logo.png",
    },
  };
}

export default async function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // Ensure that the incoming `locale` is valid
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (!routing.locales.includes(locale as any)) {
    notFound();
  }

  // Providing all messages to the client
  // side is the easiest way to get started
  const messages = await getMessages();

  return (
    <NextIntlClientProvider messages={messages}>
      <Navbar />
      {children}
      <Footer />
    </NextIntlClientProvider>
  );
}
