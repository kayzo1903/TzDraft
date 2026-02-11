import type { Metadata } from 'next';

const getSiteUrl = () => {
  const raw = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  try {
    return new URL(raw);
  } catch {
    return new URL('http://localhost:3000');
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

  const canonical = new URL(`/${locale}/settings`, siteUrl);

  return {
    title: 'Settings',
    description: 'Manage your TzDraft preferences and account shortcuts.',
    alternates: {
      canonical,
      languages: {
        sw: new URL('/sw/settings', siteUrl),
        en: new URL('/en/settings', siteUrl),
      },
    },
    openGraph: {
      title: 'Settings - TzDraft',
      description: 'Manage your TzDraft preferences and account shortcuts.',
      url: canonical,
      locale,
      type: 'website',
    },
    robots: {
      index: false,
      follow: false,
      nocache: true,
    },
  };
}

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return children;
}

