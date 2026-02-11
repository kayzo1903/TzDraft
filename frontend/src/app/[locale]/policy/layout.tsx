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

  const canonical = new URL(`/${locale}/policy`, siteUrl);

  return {
    title: "Policy",
    description:
      "TzDraft policies: fair play, privacy, and platform guidelines.",
    alternates: {
      canonical,
      languages: {
        sw: new URL("/sw/policy", siteUrl),
        en: new URL("/en/policy", siteUrl),
      },
    },
    openGraph: {
      title: "Policy — TzDraft",
      description: "TzDraft policies: fair play, privacy, and platform guidelines.",
      url: canonical,
      locale,
      type: "article",
    },
  };
}

export default function PolicyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

