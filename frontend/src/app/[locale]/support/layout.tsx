import type { Metadata } from "next";
import { BreadcrumbJsonLd } from "@/components/seo/BreadcrumbJsonLd";
import { JsonLd } from "@/components/seo/JsonLd";
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
  const meta = {
    sw: {
      title: "Kituo cha Msaada cha TzDraft | Akaunti, Mechi na Ripoti",
      description:
        "Pata msaada wa kitaalamu kuhusu akaunti ya TzDraft, matatizo ya mechi, mashindano, hitilafu za mchezo, na ripoti za usalama au ukiukaji.",
      keywords: [
        "msaada wa tzdraft",
        "tatizo la akaunti ya drafti",
        "ripoti hitilafu tzdraft",
        "msaada wa mchezo wa drafti",
        "msaada mashindano tzdraft",
        "ripoti ukiukaji tzdraft",
      ],
    },
    en: {
      title: "TzDraft Support Center | Account, Match and Safety Help",
      description:
        "Get production-ready help for TzDraft accounts, match issues, tournament disputes, gameplay bugs, and fair-play or safety reports.",
      keywords: [
        "tzdraft support",
        "drafti account help",
        "report gameplay issue",
        "tzdraft help center",
        "tzdraft tournament support",
        "report fair play violation",
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
    alternates: {
      canonical,
      languages: getLanguageAlternates("/support", siteUrl),
    },
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
      images: [{ url: new URL("/logo/logo-universal.png", siteUrl).toString(), width: 1200, height: 630, alt: "TzDraft Support Center" }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [new URL("/logo/logo-universal.png", siteUrl).toString()],
    },
    other: {
      "revisit-after": "3 days",
      language: locale === "sw" ? "Swahili" : "English",
      rating: "General",
    },
  };
}

export default async function SupportLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const siteUrl = getSiteUrl();

  if (!isAppLocale(locale)) {
    return children;
  }

  return (
    <>
      <BreadcrumbJsonLd
        locale={locale}
        items={[
          { name: locale === "sw" ? "Nyumbani" : "Home", path: "" },
          { name: locale === "sw" ? "Msaada" : "Support", path: "/support" },
        ]}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "ContactPage",
          name: locale === "sw" ? "Msaada wa TzDraft" : "TzDraft Support",
          description:
            locale === "sw"
              ? "Ukurasa wa msaada wa TzDraft kwa akaunti, gameplay, na ripoti."
              : "TzDraft support page for accounts, gameplay, and issue reporting.",
          url: `${siteUrl}/${locale}/support`,
          isPartOf: {
            "@type": "WebSite",
            name: "TzDraft",
            url: siteUrl.toString(),
          },
          about: {
            "@type": "VideoGame",
            name: "TzDraft",
          },
          contactPoint: {
            "@type": "ContactPoint",
            contactType: "customer support",
            email: "support@tzdraft.com",
            availableLanguage: ["en", "sw"],
            areaServed: "TZ",
          },
        }}
      />
      {children}
    </>
  );
}
