import LeaderboardClient from './LeaderboardClient';
import type { LeaderboardEntry } from '@/services/history.service';

export const revalidate = 300; // ISR: revalidate every 5 minutes

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

export default async function LeaderboardPage() {
  const { items, total } = await fetchGlobalLeaderboard();
  return <LeaderboardClient initialEntries={items} initialTotal={total} />;
}
