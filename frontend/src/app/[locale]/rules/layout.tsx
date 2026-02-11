import type { Metadata } from "next";

const getSiteUrl = () => {
  const raw = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  try {
    return new URL(raw);
  } catch {
    return new URL("http://localhost:3000");
  }
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }> | { locale: string };
}): Promise<Metadata> {
  const resolvedParams = params instanceof Promise ? await params : params;
  const locale = resolvedParams.locale;
  const siteUrl = getSiteUrl();

  const canonical = new URL(`/${locale}/rules`, siteUrl);

  return {
    title: "Rules",
    description:
      "Official Tanzania Drafti (8x8) rules: movement, mandatory capture, promotion, and endgame conditions.",
    alternates: {
      canonical,
      languages: {
        sw: new URL("/sw/rules", siteUrl),
        en: new URL("/en/rules", siteUrl),
      },
    },
    openGraph: {
      title: "Rules — TzDraft",
      description:
        "Official Tanzania Drafti (8x8) rules: movement, mandatory capture, promotion, and endgame conditions.",
      url: canonical,
      locale,
      type: "article",
    },
  };
}

export default function RulesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

