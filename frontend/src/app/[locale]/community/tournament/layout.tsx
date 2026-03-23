import type { Metadata } from "next";
import { BreadcrumbJsonLd } from "@/components/seo/BreadcrumbJsonLd";
import { JsonLd } from "@/components/seo/JsonLd";
import {
  buildPageMetadata,
  getCanonicalUrl,
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

  const meta = {
    sw: {
      title: "Mashindano ya Drafti | TzDraft",
      description:
        "Orodha ya mashindano yote ya Drafti Tanzania kwenye TzDraft - kanda, nchi nzima, na mashindano ya kibinafsi.",
      keywords: [
        "mashindano ya drafti",
        "drafti tanzania tournament",
        "ratiba ya mashindano ya drafti",
        "tzdraft tournaments",
      ],
    },
    en: {
      title: "Drafti Tournaments | TzDraft",
      description:
        "Browse all Tanzania Drafti tournaments on TzDraft - regional, national, and open competitions.",
      keywords: [
        "drafti tournaments",
        "tanzania drafti competitions",
        "online drafti tournament",
        "tzdraft tournaments",
      ],
    },
  } as const;

  const { title, description, keywords } =
    meta[locale as keyof typeof meta] ?? meta.en;

  return buildPageMetadata({
    locale,
    path: "/community/tournament",
    title,
    description,
    keywords: [...keywords],
    ogImageAlt: "TzDraft tournaments",
    revisitAfter: "1 day",
  });
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

  return (
    <>
      {isAppLocale(locale) && (
        <BreadcrumbJsonLd
          locale={locale}
          items={[
            { name: locale === "sw" ? "Nyumbani" : "Home", path: "" },
            { name: locale === "sw" ? "Jamii" : "Community", path: "/community" },
            {
              name: locale === "sw" ? "Mashindano" : "Tournaments",
              path: "/community/tournament",
            },
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
          url: isAppLocale(locale)
            ? getCanonicalUrl(locale, "/community/tournament", siteUrl)
            : siteUrl.toString(),
        }}
      />
      {children}
    </>
  );
}
