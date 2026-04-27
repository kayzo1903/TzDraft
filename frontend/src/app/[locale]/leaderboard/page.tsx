import LeaderboardClient from './LeaderboardClient';
import { JsonLd } from '@/components/seo/JsonLd';
import type { LeaderboardEntry } from '@/services/history.service';
import type { Metadata } from 'next';
import { getCanonicalUrl, getSiteUrl, isAppLocale, buildPageMetadata } from '@/lib/seo';

export const revalidate = 300; // ISR: revalidate every 5 minutes

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isSw = locale === 'sw';
  const siteUrl = getSiteUrl();

  return buildPageMetadata({
    locale: isAppLocale(locale) ? locale : 'en',
    path: '/leaderboard',
    title: isSw 
      ? 'Orodha ya Ubora — Wachezaji Bora wa Drafti Tanzania | TzDraft' 
      : 'Global Leaderboard — Top Tanzania Drafti Players | TzDraft',
    description: isSw
      ? 'Angalia viwango vya hivi karibuni vya wachezaji bora wa Tanzania Drafti. Jua nani anaongoza kwenye rating, michezo iliyochezwa, na ushindi Tanzania nzima.'
      : 'View the latest rankings of the best Tanzania Drafti players. See who leads in rating, games played, and total wins across the nation.',
    keywords: ['leaderboard', 'rankings', 'top players', 'TzDraft', 'Tanzania Drafti', 'orodha ya ubora', 'wachezaji bora'],
  });
}

async function fetchGlobalLeaderboard(): Promise<{ items: LeaderboardEntry[]; total: number }> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) return { items: [], total: 0 };

  try {
    const res = await fetch(`${apiUrl}/auth/leaderboard?skip=0&take=50`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return { items: [], total: 0 };
    const json = await res.json();
    return json.data ?? { items: [], total: 0 };
  } catch {
    return { items: [], total: 0 };
  }
}

export default async function LeaderboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const { items, total } = await fetchGlobalLeaderboard();

  const siteUrl = getSiteUrl();
  const resolvedLocale = isAppLocale(locale) ? locale : 'en';
  const canonical = getCanonicalUrl(resolvedLocale, '/leaderboard', siteUrl);
  const isSw = locale === 'sw';

  /* ItemList schema — top 10 players with real data for rich results */
  const itemListSchema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: isSw ? 'Orodha ya Ubora ya TzDraft' : 'TzDraft Leaderboard',
    description: isSw
      ? 'Wachezaji bora 50 wa Tanzania Drafti kwenye TzDraft, kwa mpangilio wa rating.'
      : 'Top 50 Tanzania Drafti players on TzDraft, ranked by rating.',
    url: canonical,
    numberOfItems: total,
    itemListOrder: 'https://schema.org/ItemListOrderDescending',
    itemListElement: items.slice(0, 10).map((entry, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: entry.displayName,
      description: isSw
        ? `Rating: ${entry.rating} | Michezo: ${entry.gamesPlayed}`
        : `Rating: ${entry.rating} | Games played: ${entry.gamesPlayed}`,
      url: `${canonical}#${entry.username}`,
      item: {
        '@type': 'Person',
        name: entry.displayName,
        identifier: entry.username,
        description: isSw
          ? `Mchezaji wa Tanzania Drafti — Rating ${entry.rating}`
          : `Tanzania Drafti player — Rating ${entry.rating}`,
        ...(entry.country ? { nationality: entry.country } : {}),
      },
    })),
  };

  /* SportsEvent-style FAQ schema — boosts rich results */
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: isSw
      ? [
          {
            '@type': 'Question',
            name: 'Nani ni mchezaji bora wa Tanzania Drafti?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: items[0]
                ? `Kulingana na data ya hivi karibuni, ${items[0].displayName} ana rating ya juu zaidi ya ${items[0].rating} kwenye TzDraft.`
                : 'Angalia orodha ya ubora kwenye TzDraft kwa habari za hivi karibuni.',
            },
          },
          {
            '@type': 'Question',
            name: 'Rating inahesabiwaje kwenye TzDraft?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'TzDraft hutumia mfumo wa Elo kuhesabu rating. Rating inaongezeka unaposhinda na inashuka ukipoteza, kulingana na nguvu ya mpinzani wako.',
            },
          },
        ]
      : [
          {
            '@type': 'Question',
            name: 'Who is the top Tanzania Drafti player?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: items[0]
                ? `Based on current data, ${items[0].displayName} holds the highest rating of ${items[0].rating} on TzDraft.`
                : 'Check the TzDraft leaderboard for the latest rankings.',
            },
          },
          {
            '@type': 'Question',
            name: 'How is the rating calculated on TzDraft?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'TzDraft uses an Elo-based rating system. Your rating increases when you win and decreases when you lose, weighted by your opponent\'s strength.',
            },
          },
          {
            '@type': 'Question',
            name: 'Can I filter the leaderboard by region?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Yes. Use the Region tab on the leaderboard to filter players by their registered region across Tanzania.',
            },
          },
        ],
  };

  return (
    <>
      <JsonLd data={itemListSchema} />
      {items.length > 0 && <JsonLd data={faqSchema} />}
      <LeaderboardClient initialEntries={items} initialTotal={total} />
    </>
  );
}
