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

  const canonical = new URL(`/${locale}/profile`, siteUrl);

  return {
    title: 'Profile',
    description: 'Your TzDraft account details and stats.',
    alternates: {
      canonical,
      languages: {
        sw: new URL('/sw/profile', siteUrl),
        en: new URL('/en/profile', siteUrl),
      },
    },
    openGraph: {
      title: 'Profile - TzDraft',
      description: 'Your TzDraft account details and stats.',
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

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return children;
}

