import TournamentDetailClient from "./TournamentDetailClient";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

export const revalidate = 30;

async function fetchTournament(id: string) {
  try {
    const res = await fetch(`${API_URL}/tournaments/${id}`, { next: { revalidate: 30 } });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default async function TournamentDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const initialData = await fetchTournament(id);

  return <TournamentDetailClient id={id} locale={locale} initialData={initialData} />;
}
