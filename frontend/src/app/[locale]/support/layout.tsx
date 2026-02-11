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

  const canonical = new URL(`/${locale}/support`, siteUrl);

  return {
    title: "Support",
    description: "Get help with TzDraft: account, gameplay, and reporting issues.",
    alternates: {
      canonical,
      languages: {
        sw: new URL("/sw/support", siteUrl),
        en: new URL("/en/support", siteUrl),
      },
    },
    openGraph: {
      title: "Support — TzDraft",
      description: "Get help with TzDraft: account, gameplay, and reporting issues.",
      url: canonical,
      locale,
      type: "website",
    },
  };
}

export default function SupportLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

