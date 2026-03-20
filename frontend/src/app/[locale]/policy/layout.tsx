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
  const canonical = getCanonicalUrl(locale, "/policy", siteUrl);
  const meta = {
    sw: {
      title: "Sera na Faragha | Kanuni za TzDraft",
      description:
        "Soma sera ya TzDraft kuhusu mchezo wa haki, faragha ya mtumiaji, usalama wa akaunti, na matumizi ya taarifa.",
    },
    en: {
      title: "Policy and Privacy | TzDraft Guidelines",
      description:
        "Read TzDraft's policy and privacy guidelines covering fair play, account safety, user data, and platform rules.",
    },
  } as const;
  const { title, description } = meta[locale as keyof typeof meta] ?? meta.en;

  return {
    title,
    description,
    alternates: {
      canonical,
      languages: getLanguageAlternates("/policy", siteUrl),
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

export default async function PolicyLayout({
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
          {
            name: locale === "sw" ? "Sera na Faragha" : "Policy & Privacy",
            path: "/policy",
          },
        ]}
      />
      {children}
    </>
  );
}
