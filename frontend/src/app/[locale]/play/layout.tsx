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

  const canonical = new URL(`/${locale}/play`, siteUrl);

  return {
    title: "Play",
    description: "Choose how you want to play Tanzania Drafti: vs AI, friends, or online modes.",
    alternates: {
      canonical,
      languages: {
        sw: new URL("/sw/play", siteUrl),
        en: new URL("/en/play", siteUrl),
      },
    },
    openGraph: {
      title: "Play — TzDraft",
      description:
        "Choose how you want to play Tanzania Drafti: vs AI, friends, or online modes.",
      url: canonical,
      locale,
      type: "website",
    },
  };
}

export default function PlayLayout({ children }: { children: React.ReactNode }) {
  return children;
}

