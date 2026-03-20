import type { Metadata } from "next";
import { BreadcrumbJsonLd } from "@/components/seo/BreadcrumbJsonLd";
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
  const canonical = getCanonicalUrl(locale, "/rules", siteUrl);
  const meta = {
    sw: {
      title: "Sheria za Drafti | Jinsi ya Kucheza Drafti Tanzania",
      description:
        "Soma sheria rasmi za Drafti ya Tanzania: mwendo, kula lazima, kupandishwa kuwa kingi, na masharti ya ushindi.",
    },
    en: {
      title: "Tanzania Drafti Rules | How To Play Drafti",
      description:
        "Learn the official Tanzania Drafti (8x8) rules: movement, mandatory capture, promotion, and winning conditions.",
    },
  } as const;
  const { title, description } = meta[locale as keyof typeof meta] ?? meta.en;

  return {
    title,
    description,
    alternates: {
      canonical,
      languages: getLanguageAlternates("/rules", siteUrl),
    },
    openGraph: {
      title,
      description,
      url: canonical,
      locale,
      type: "article",
      images: ["/logo/logo.png"],
    },
  };
}

export default async function RulesLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!isAppLocale(locale)) {
    return children;
  }

  return (
    <>
      <BreadcrumbJsonLd
        locale={locale}
        items={[
          { name: locale === "sw" ? "Nyumbani" : "Home", path: "" },
          { name: locale === "sw" ? "Sheria" : "Rules", path: "/rules" },
        ]}
      />
      {children}
    </>
  );
}
