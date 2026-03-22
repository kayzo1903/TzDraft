import type { Metadata } from "next";
import { BreadcrumbJsonLd } from "@/components/seo/BreadcrumbJsonLd";
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
      description: "Orodha ya mashindano yote ya Drafti Tanzania kwenye TzDraft — kanda, nchi nzima, na mashindano ya kibinafsi.",
    },
    en: {
      title: "Drafti Tournaments | TzDraft",
      description: "Browse all Tanzania Drafti tournaments on TzDraft — regional, national, and open competitions.",
    },
  } as const;
  const { title, description } = meta[locale as keyof typeof meta] ?? meta.en;

  return {
    title,
    description,
    alternates: { canonical, languages: getLanguageAlternates("/community/tournament", siteUrl) },
    openGraph: { title, description, url: canonical, locale, type: "website", images: ["/logo/logo.png"] },
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
      {children}
    </>
  );
}
