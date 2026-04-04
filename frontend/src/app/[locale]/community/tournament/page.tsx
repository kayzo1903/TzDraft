import { CalendarDays, Clock3, Trophy, Users } from "lucide-react";
import { Link } from "@/i18n/routing";
import type { Tournament, TournamentDetail } from "@/services/tournament.service";
import type { Metadata } from "next";
import { getCanonicalUrl, getLanguageAlternates, getSiteUrl, isAppLocale } from "@/lib/seo";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

type PublicStatus = "REGISTRATION" | "ACTIVE" | "COMPLETED" | "CANCELLED" | "DRAFT";

type DecoratedTournament = Tournament & {
  publicStatus: PublicStatus;
  detail: TournamentDetail | null;
  closureMessage: string | null;
};

async function fetchAll(): Promise<Tournament[]> {
  try {
    const res = await fetch(`${API_URL}/tournaments`, { cache: "no-store" });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

async function fetchDetail(id: string): Promise<TournamentDetail | null> {
  try {
    const res = await fetch(`${API_URL}/tournaments/${id}`, { cache: "no-store" });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

const STATUS_LABEL: Record<PublicStatus, Record<string, string>> = {
  REGISTRATION: { sw: "Usajili Wazi", en: "Registration Open" },
  ACTIVE: { sw: "Inaendelea", en: "Live Now" },
  COMPLETED: { sw: "Imekamilika", en: "Completed" },
  CANCELLED: { sw: "Imefutwa", en: "Cancelled" },
  DRAFT: { sw: "Rasimu", en: "Draft" },
};

const STATUS_COLOR: Record<PublicStatus, string> = {
  REGISTRATION: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
  ACTIVE: "border-sky-400/30 bg-sky-400/10 text-sky-200",
  COMPLETED: "border-white/10 bg-white/5 text-neutral-300",
  CANCELLED: "border-rose-400/30 bg-rose-400/10 text-rose-200",
  DRAFT: "border-amber-400/30 bg-amber-400/10 text-amber-200",
};

function formatTournamentType(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatDateTime(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale === "sw" ? "sw-TZ" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function isRegistrationWindowOpen(tournament: Tournament) {
  if (tournament.status !== "REGISTRATION") return false;

  const now = Date.now();
  const registrationDeadline = tournament.registrationDeadline
    ? new Date(tournament.registrationDeadline).getTime()
    : null;
  const scheduledStartAt = new Date(tournament.scheduledStartAt).getTime();

  if (registrationDeadline !== null && registrationDeadline <= now) {
    return false;
  }

  if (scheduledStartAt <= now) {
    return false;
  }

  return true;
}

function publicTournamentStatus(tournament: Tournament): PublicStatus {
  if (tournament.status === "REGISTRATION" && !isRegistrationWindowOpen(tournament)) {
    return "COMPLETED";
  }

  return tournament.status;
}

function closureMessage(
  tournament: Tournament,
  detail: TournamentDetail | null,
  locale: string,
) {
  const status = publicTournamentStatus(tournament);

  if (status === "CANCELLED") {
    const registered = detail?.participants.length ?? 0;
    if (registered < tournament.minPlayers) {
      return locale === "sw"
        ? `Mashindano yalifutwa kwa sababu wachezaji ${tournament.minPlayers} wa chini hawakufikiwa.`
        : `Cancelled because the minimum ${tournament.minPlayers} registered players was not reached.`;
    }

    return locale === "sw"
      ? "Mashindano haya yamefutwa."
      : "This tournament has been cancelled.";
  }

  if (status !== "COMPLETED") {
    return null;
  }

  const finalMatch = detail?.matches
    ?.filter((match) => match.completedAt)
    .sort((a, b) => {
      const aTime = a.completedAt ? new Date(a.completedAt).getTime() : 0;
      const bTime = b.completedAt ? new Date(b.completedAt).getTime() : 0;
      return bTime - aTime;
    })[0];

  if (!detail || !finalMatch) {
    return locale === "sw"
      ? "Mashindano yamefungwa. Angalia ukurasa wa mashindano kwa matokeo zaidi."
      : "Tournament closed. Open the detail page for the final outcome.";
  }

  const winnerId =
    finalMatch.result === "PLAYER1_WIN"
      ? finalMatch.player1Id
      : finalMatch.result === "PLAYER2_WIN"
        ? finalMatch.player2Id
        : null;

  const winner = winnerId
    ? detail.participants.find((participant) => participant.userId === winnerId)
    : null;

  if (winner?.seed != null) {
    return locale === "sw"
      ? `Mshindi: Seed #${winner.seed}.`
      : `Winner: Seed #${winner.seed}.`;
  }

  if (winnerId) {
    return locale === "sw"
      ? "Mshindi amepatikana. Fungua ukurasa wa mashindano kwa maelezo zaidi."
      : "Winner confirmed. Open the tournament page for more detail.";
  }

  return locale === "sw"
    ? "Mashindano yamefungwa. Matokeo ya mwisho yako kwenye ukurasa wa mashindano."
    : "Tournament finished. Final outcome is available on the detail page.";
}

function TournamentCard({
  tournament,
  locale,
}: {
  tournament: DecoratedTournament;
  locale: string;
}) {
  return (
    <Link
      href={`/community/tournament/${tournament.id}`}
      className="group block rounded-3xl border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] p-5 transition duration-200 hover:-translate-y-1 hover:border-orange-400/30 hover:bg-[linear-gradient(180deg,rgba(255,255,255,0.10),rgba(255,255,255,0.04))]"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-xl font-bold text-white">{tournament.name}</h3>
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-neutral-300">
            {locale === "sw" ? tournament.descriptionSw : tournament.descriptionEn}
          </p>
        </div>
        <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${STATUS_COLOR[tournament.publicStatus]}`}>
          {STATUS_LABEL[tournament.publicStatus][locale as "sw" | "en"]}
        </span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400">
            <Trophy className="h-3.5 w-3.5 text-amber-300" />
            {locale === "sw" ? "Muundo" : "Format"}
          </div>
          <p className="mt-2 text-sm text-white">{formatTournamentType(tournament.format)}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400">
            <Users className="h-3.5 w-3.5 text-sky-300" />
            {locale === "sw" ? "Wachezaji" : "Players"}
          </div>
          <p className="mt-2 text-sm text-white">
            {tournament.detail?.participants.length ?? 0}/{tournament.maxPlayers}
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400">
            <CalendarDays className="h-3.5 w-3.5 text-emerald-300" />
            {locale === "sw" ? "Kuanza" : "Starts"}
          </div>
          <p className="mt-2 text-sm text-white">{formatDateTime(tournament.scheduledStartAt, locale)}</p>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400">
          <Clock3 className="h-3.5 w-3.5 text-orange-300" />
          {locale === "sw" ? "Hali ya mashindano" : "Tournament note"}
        </div>
        <p className="mt-2 text-sm leading-6 text-neutral-200">
          {tournament.publicStatus === "REGISTRATION"
            ? locale === "sw"
              ? "Usajili bado uko wazi. Fungua mashindano kuona masharti na kujiunga."
              : "Registration is still open. Open the tournament to review requirements and join."
            : tournament.publicStatus === "ACTIVE"
              ? locale === "sw"
                ? "Mashindano yanaendelea sasa. Fungua ukurasa wa mashindano kuona raundi na mechi."
                : "This tournament is live now. Open the tournament page to follow rounds and matches."
              : tournament.closureMessage}
        </p>
      </div>
    </Link>
  );
}

const META = {
  sw: {
    title: "Mashindano ya Jamii | TzDraft",
    description: "Jiunge na mashindano yetu ya jamii na ushindane na wachezaji wengine kwa zawadi na umaarufu. Pata ratiba kamili hapa.",
  },
  en: {
    title: "Community Tournaments | TzDraft",
    description: "Join our community tournaments and compete against other players for prizes and glory. View the full schedule here.",
  },
} as const;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isAppLocale(locale)) return {};

  const siteUrl = getSiteUrl();
  const canonical = getCanonicalUrl(locale, "/community/tournament", siteUrl);
  const m = META[locale as keyof typeof META] ?? META.en;
  const ogLocale = locale === "sw" ? "sw_TZ" : "en_TZ";
  const ogLocaleAlt = locale === "sw" ? "en_TZ" : "sw_TZ";

  return {
    title: m.title,
    description: m.description,
    alternates: {
      canonical,
      languages: getLanguageAlternates("/community/tournament", siteUrl),
    },
    openGraph: {
      title: m.title,
      description: m.description,
      url: canonical,
      siteName: "TzDraft",
      locale: ogLocale,
      alternateLocale: [ogLocaleAlt],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: m.title,
      description: m.description,
    },
  };
}

export default async function TournamentsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const tournaments = await fetchAll();

  const decorated = await Promise.all(
    tournaments.map(async (tournament) => {
      const detail = await fetchDetail(tournament.id);
      return {
        ...tournament,
        publicStatus: publicTournamentStatus(tournament),
        detail,
        closureMessage: closureMessage(tournament, detail, locale),
      } satisfies DecoratedTournament;
    }),
  );
  const ordered = [...decorated].sort((a, b) => {
    const rank = {
      ACTIVE: 0,
      REGISTRATION: 1,
      COMPLETED: 2,
      CANCELLED: 3,
      DRAFT: 4,
    } as const;

    const statusDelta = rank[a.publicStatus] - rank[b.publicStatus];
    if (statusDelta !== 0) {
      return statusDelta;
    }

    return new Date(b.scheduledStartAt).getTime() - new Date(a.scheduledStartAt).getTime();
  });

  const copy = {
    title: locale === "sw" ? "Mashindano ya Jamii" : "Community Tournaments",
    subtitle:
      locale === "sw"
        ? "Angalia mashindano yote mahali pamoja. Kila kadi inaonyesha wazi kama mashindano yako wazi, yanaendelea, yamekamilika, au yamefutwa."
        : "Browse all tournaments in one place. Each card now makes the condition clear, whether it is open, live, completed, or cancelled.",
    empty:
      locale === "sw" ? "Hakuna mashindano bado." : "No tournaments yet.",
  };

  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-10 sm:px-6 lg:px-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ItemList",
            "itemListElement": ordered.slice(0, 10).map((t, index) => ({
              "@type": "ListItem",
              "position": index + 1,
              "item": {
                "@type": "SportsEvent",
                "name": t.name,
                "description": locale === "sw" ? t.descriptionSw : t.descriptionEn,
                "startDate": t.scheduledStartAt,
                "url": `${getSiteUrl()}/${locale}/community/tournament/${t.id}`
              }
            }))
          })
        }}
      />
      <div className="mx-auto flex min-h-[calc(100vh-12rem)] max-w-6xl flex-col space-y-10">
        <div className="rounded-3xl border border-white/10 bg-[linear-gradient(135deg,rgba(17,24,39,0.98),rgba(37,99,235,0.10),rgba(249,115,22,0.12))] p-6 sm:p-8">
          <h1 className="text-4xl font-black text-white">{copy.title}</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-neutral-300 sm:text-base">
            {copy.subtitle}
          </p>
        </div>

        {ordered.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-white/10 bg-white/5 px-4 py-5 text-sm text-neutral-400">
            {copy.empty}
          </p>
        ) : (
          <section className="grid flex-1 content-start gap-5 lg:grid-cols-2">
            {ordered.map((tournament) => (
              <TournamentCard key={tournament.id} tournament={tournament} locale={locale} />
            ))}
          </section>
        )}
      </div>
    </main>
  );
}
