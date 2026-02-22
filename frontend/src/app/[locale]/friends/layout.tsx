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

  const canonical = new URL(`/${locale}/friends`, siteUrl);

  return {
    title: 'Friends',
    description: 'Manage your friendships and connect with other TzDraft players.',
    alternates: {
      canonical,
      languages: {
        sw: new URL('/sw/friends', siteUrl),
        en: new URL('/en/friends', siteUrl),
      },
    },
    openGraph: {
      title: 'Friends - TzDraft',
      description: 'Manage your friendships and connect with other TzDraft players.',
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

export default function FriendsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
