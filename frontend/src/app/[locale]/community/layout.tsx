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
  const canonical = getCanonicalUrl(locale, "/community", siteUrl);

  const meta = {
    sw: {
      title: "Jamii | Mashindano ya Drafti Tanzania | TzDraft",
      description: "Jiunge na jamii ya Drafti Tanzania. Shiriki katika mashindano, angalia jedwali la bingwa, na pinga wachezaji kutoka kote Tanzania.",
    },
    en: {
      title: "Community | Tanzania Drafti Tournaments | TzDraft",
      description: "Join the TzDraft community. Compete in Tanzania Drafti tournaments, view the leaderboard, and challenge players from across Tanzania.",
    },
  } as const;
  const { title, description } = meta[locale as keyof typeof meta] ?? meta.en;

  return {
    title,
    description,
    alternates: { canonical, languages: getLanguageAlternates("/community", siteUrl) },
    openGraph: { title, description, url: canonical, locale, type: "website", images: ["/logo/logo.png"] },
  };
}

export default async function CommunityLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const siteUrl = getSiteUrl();

  const webPageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: locale === "sw" ? "Jamii ya TzDraft" : "TzDraft Community",
    description: locale === "sw"
      ? "Jamii ya wachezaji wa Drafti Tanzania"
      : "Tanzania Drafti players community hub",
    url: `${siteUrl}/${locale}/community`,
  };

  return (
    <>
      {isAppLocale(locale) && (
        <BreadcrumbJsonLd
          locale={locale}
          items={[
            { name: locale === "sw" ? "Nyumbani" : "Home", path: "" },
            { name: locale === "sw" ? "Jamii" : "Community", path: "/community" },
          ]}
        />
      )}
      <JsonLd data={webPageSchema} />
      {children}
    </>
  );
}
