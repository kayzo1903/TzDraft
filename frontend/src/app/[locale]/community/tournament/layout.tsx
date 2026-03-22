import type { Metadata } from "next";
import { BreadcrumbJsonLd } from "@/components/seo/BreadcrumbJsonLd";
import { JsonLd } from "@/components/seo/JsonLd";
import { getCanonicalUrl, getLanguageAlternates, getSiteUrl, isAppLocale } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isAppLocale(locale)) return {};

  const siteUrl = getSiteUrl();
  const canonical = getCanonicalUrl(locale, "/community/tournament", siteUrl);

  const meta = {
    sw: {
      title: "Mashindano ya Drafti | TzDraft",
      description: "Orodha ya mashindano yote ya Drafti Tanzania kwenye TzDraft - kanda, nchi nzima, na mashindano ya kibinafsi.",
      keywords: [
        "mashindano ya drafti",
        "drafti tanzania tournament",
        "ratiba ya mashindano ya drafti",
        "tzdraft tournaments",
      ],
    },
    en: {
      title: "Drafti Tournaments | TzDraft",
      description: "Browse all Tanzania Drafti tournaments on TzDraft - regional, national, and open competitions.",
      keywords: [
        "drafti tournaments",
        "tanzania drafti competitions",
        "online drafti tournament",
        "tzdraft tournaments",
      ],
    },
  } as const;
  const { title, description, keywords } = meta[locale as keyof typeof meta] ?? meta.en;

  const ogLocale = locale === "sw" ? "sw_TZ" : "en_TZ";

  return {
    metadataBase: siteUrl,
    title,
    description,
    keywords: [...keywords],
    authors: [{ name: "TzDraft", url: siteUrl.toString() }],
    creator: "TzDraft",
    publisher: "TzDraft",
    category: "Sports",
    applicationName: "TzDraft",
    referrer: "origin-when-cross-origin",
    formatDetection: { telephone: false },
    alternates: { canonical, languages: getLanguageAlternates("/community/tournament", siteUrl) },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-snippet": -1,
        "max-image-preview": "large",
        "max-video-preview": -1,
      },
    },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: "TzDraft",
      locale: ogLocale,
      alternateLocale: [locale === "sw" ? "en_TZ" : "sw_TZ"],
      type: "website",
      images: [{ url: new URL("/logo/logo.png", siteUrl).toString(), width: 1200, height: 630, alt: "TzDraft Tournaments" }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [new URL("/logo/logo.png", siteUrl).toString()],
    },
    other: {
      "revisit-after": "1 day",
      language: locale === "sw" ? "Swahili" : "English",
      rating: "General",
    },
  };
}

export default async function TournamentListLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const siteUrl = getSiteUrl();
  const pageUrl = `${siteUrl}/${locale}/community/tournament`;

  return (
    <>
      {isAppLocale(locale) && (
        <BreadcrumbJsonLd
          locale={locale}
          items={[
            { name: locale === "sw" ? "Nyumbani" : "Home", path: "" },
            { name: locale === "sw" ? "Jamii" : "Community", path: "/community" },
            { name: locale === "sw" ? "Mashindano" : "Tournaments", path: "/community/tournament" },
          ]}
        />
      )}
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: locale === "sw" ? "Mashindano ya Drafti" : "Drafti Tournaments",
          description:
            locale === "sw"
              ? "Orodha ya mashindano ya Drafti Tanzania kwenye TzDraft."
              : "A browsable list of Tanzania Drafti tournaments on TzDraft.",
          url: pageUrl,
        }}
      />
      {children}
    </>
  );
}
