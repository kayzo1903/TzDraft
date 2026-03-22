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
  const canonical = getCanonicalUrl(locale, "/settings", siteUrl);

  return {
    title: "Settings",
    description: "Manage your TzDraft preferences and account shortcuts.",
    alternates: {
      canonical,
      languages: getLanguageAlternates("/settings", siteUrl),
    },
    openGraph: {
      title: "Settings - TzDraft",
      description: "Manage your TzDraft preferences and account shortcuts.",
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

export default async function SettingsLayout({
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
          { name: locale === "sw" ? "Mipangilio" : "Settings", path: "/settings" },
        ]}
      />
      {children}
    </>
  );
}
