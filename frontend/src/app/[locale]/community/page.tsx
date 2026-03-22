import { ArrowRight, BarChart3, CalendarDays, Globe2, Trophy, Users } from "lucide-react";
import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/Button";
import type { Tournament, TournamentDetail, TournamentStatus } from "@/services/tournament.service";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

async function fetchTournaments(): Promise<Tournament[]> {
  try {
    const res = await fetch(`${API_URL}/tournaments`, {
      cache: "no-store",
    });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

async function fetchTournamentDetail(id: string): Promise<TournamentDetail | null> {
  try {
    const res = await fetch(`${API_URL}/tournaments/${id}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

function formatTournamentType(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatDate(date: string, locale: string) {
  return new Intl.DateTimeFormat(locale === "sw" ? "sw-TZ" : "en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
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

function publicTournamentStatus(tournament: Tournament): TournamentStatus | "COMPLETED" {
  if (!isRegistrationWindowOpen(tournament) && tournament.status === "REGISTRATION") {
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
        ? `Mashindano yalifungwa kwa sababu kiwango cha chini cha wachezaji ${tournament.minPlayers} hakikufikiwa.`
        : `Closed because the minimum ${tournament.minPlayers} players was not reached.`;
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
      ? "Mashindano yamekamilika. Fungua ukurasa wake kwa matokeo zaidi."
      : "Tournament closed. Open its page for the final outcome.";
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
      ? `Mshindi wa mwisho: Seed #${winner.seed}.`
      : `Final winner: Seed #${winner.seed}.`;
  }

  return locale === "sw"
    ? "Mashindano yamekamilika. Matokeo ya mwisho yapo kwenye ukurasa wa mashindano."
    : "Tournament finished. The final outcome is available on the tournament page.";
}

function statusChip(status: TournamentStatus | "COMPLETED", locale: string) {
  const labels = {
    REGISTRATION: { en: "Registration Open", sw: "Usajili Wazi" },
    ACTIVE: { en: "Live Now", sw: "Inaendelea" },
    COMPLETED: { en: "Completed", sw: "Imekamilika" },
    CANCELLED: { en: "Cancelled", sw: "Imefutwa" },
    DRAFT: { en: "Draft", sw: "Rasimu" },
  } as const;

  const tone = {
    REGISTRATION: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
    ACTIVE: "border-sky-400/30 bg-sky-400/10 text-sky-200",
    COMPLETED: "border-white/10 bg-white/5 text-neutral-300",
    CANCELLED: "border-rose-400/30 bg-rose-400/10 text-rose-200",
    DRAFT: "border-amber-400/30 bg-amber-400/10 text-amber-200",
  } as const;

  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${tone[status]}`}>
      {labels[status][locale as "en" | "sw"] ?? status}
    </span>
  );
}

export default async function CommunityPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const tournaments = await fetchTournaments();
  const decorated = await Promise.all(
    tournaments.map(async (tournament) => {
      const detail = await fetchTournamentDetail(tournament.id);
      return {
        ...tournament,
        detail,
        publicStatus: publicTournamentStatus(tournament),
        closureNote: closureMessage(tournament, detail, locale),
      };
    }),
  );

  const featured = [...decorated].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )[0] ?? null;

  const live = decorated.filter((t) => t.publicStatus === "ACTIVE");
  const open = decorated.filter((t) => t.publicStatus === "REGISTRATION");
  const completed = decorated.filter((t) => t.publicStatus === "COMPLETED");

  const spotlight = [featured, ...decorated.filter((t) => t.id !== featured?.id)]
    .filter((value): value is (Tournament & {
      detail: TournamentDetail | null;
      publicStatus: TournamentStatus | "COMPLETED";
      closureNote: string | null;
    }) => Boolean(value))
    .slice(0, 3);

  const copy = {
    eyebrow: locale === "sw" ? "KITUO CHA JAMII" : "COMMUNITY HUB",
    title: locale === "sw" ? "Jamii ya TzDraft sasa ina mlango wake." : "TzDraft community now has a front door.",
    subtitle: locale === "sw"
      ? "Fuata mashindano yanayoendelea, angalia yanayofungua usajili, na ruka haraka kwenda kwenye jedwali la ubingwa."
      : "Track live tournaments, catch new registration windows, and jump straight into the competitive side of TzDraft.",
    browse: locale === "sw" ? "Tazama Mashindano" : "Browse Tournaments",
    leaderboard: locale === "sw" ? "Fungua Leaderboard" : "Open Leaderboard",
    featuredLabel: locale === "sw" ? "Tangazo kuu la mashindano" : "Tournament announcement",
    emptyTitle: locale === "sw" ? "Ukurasa huu uko tayari kwa mashindano yajayo." : "This hub is ready for the next wave of tournaments.",
    emptyBody: locale === "sw"
      ? "Kwa sasa hakuna mashindano yaliyochapishwa, lakini njia ya jamii tayari imefunguliwa kutoka ukurasa wa nyumbani."
      : "There are no published tournaments yet, but the community route is now unlocked from the home page.",
    cardsTitle: locale === "sw" ? "Njia za haraka za ushindani" : "Fast lanes into competition",
    stripsTitle: locale === "sw" ? "Muonekano wa sasa" : "What the board looks like now",
    allLink: locale === "sw" ? "Ona yote" : "See all",
    players: locale === "sw" ? "wachezaji" : "players",
    starts: locale === "sw" ? "Inaanza" : "Starts",
    format: locale === "sw" ? "Muundo" : "Format",
    active: locale === "sw" ? "Yanayoendelea" : "Live",
    registration: locale === "sw" ? "Yaliyo wazi" : "Open",
    archive: locale === "sw" ? "Yaliyokamilika" : "Completed",
    noSpotlight: locale === "sw" ? "Hakuna mashindano ya kuonyesha bado." : "No tournaments to spotlight yet.",
    liveDesc: locale === "sw" ? "Matukio yanayochezwa sasa." : "Events happening right now.",
    openDesc: locale === "sw" ? "Mashindano yaliyo tayari kupokea wachezaji." : "Tournaments currently taking registrations.",
    doneDesc: locale === "sw" ? "Matukio yaliyofungwa karibuni." : "Recently closed events.",
    featuredNoteLabel: locale === "sw" ? "Ujumbe wa sasa" : "Current update",
    liveNote: locale === "sw"
      ? "Mashindano haya yanaendelea sasa. Fungua ukurasa wake kufuatilia raundi na mechi."
      : "This tournament is live right now. Open its page to follow rounds and matches.",
    openNote: locale === "sw"
      ? "Usajili uko wazi kwa sasa. Wachezaji wanaweza kujiunga kabla ya muda wa mwisho."
      : "Registration is currently open. Players can still join before the deadline.",
  };

  return (
    <main className="bg-[var(--background)]">
      <section className="relative overflow-hidden border-b border-white/5 px-4 py-14 sm:px-6 lg:px-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(249,115,22,0.16),_transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(56,189,248,0.12),_transparent_28%)]" />
        <div className="relative mx-auto max-w-6xl">
          <div className="grid gap-8 lg:grid-cols-[1.25fr_0.9fr] lg:items-end">
            <div className="space-y-6">
              <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-bold tracking-[0.2em] text-neutral-300">
                {copy.eyebrow}
              </span>
              <div className="space-y-4">
                <h1 className="max-w-3xl text-4xl font-black leading-tight text-white sm:text-5xl">
                  {copy.title}
                </h1>
                <p className="max-w-2xl text-base leading-7 text-neutral-300 sm:text-lg">
                  {copy.subtitle}
                </p>
              </div>
              <div className="flex flex-col gap-4 sm:flex-row">
                <Link href="/community/tournament">
                  <Button size="md" className="w-full gap-2 sm:w-auto">
                    {copy.browse}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/leaderboard">
                  <Button variant="outline" size="md" className="w-full sm:w-auto">
                    {copy.leaderboard}
                  </Button>
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {[
                {
                  icon: Trophy,
                  label: copy.active,
                  value: live.length.toString().padStart(2, "0"),
                  hint: copy.liveDesc,
                  accent: "text-amber-300",
                },
                {
                  icon: CalendarDays,
                  label: copy.registration,
                  value: open.length.toString().padStart(2, "0"),
                  hint: copy.openDesc,
                  accent: "text-emerald-300",
                },
                {
                  icon: Globe2,
                  label: copy.archive,
                  value: completed.length.toString().padStart(2, "0"),
                  hint: copy.doneDesc,
                  accent: "text-sky-300",
                },
                {
                  icon: Users,
                  label: locale === "sw" ? "Viti vya juu" : "Biggest field",
                  value: tournaments.length ? `${Math.max(...tournaments.map((t) => t.maxPlayers))}` : "00",
                  hint: locale === "sw" ? "Uwezo wa juu wa mashindano." : "Largest tournament size available.",
                  accent: "text-orange-300",
                },
              ].map(({ icon: Icon, label, value, hint, accent }) => (
                <div key={label} className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
                  <div className="mb-6 flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">{label}</span>
                    <Icon className={`h-4 w-4 ${accent}`} />
                  </div>
                  <div className="text-3xl font-black text-white">{value}</div>
                  <p className="mt-2 text-sm text-neutral-400">{hint}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          {featured ? (
            <div className="overflow-hidden rounded-3xl border border-white/10 bg-[linear-gradient(135deg,rgba(17,24,39,0.98),rgba(37,99,235,0.14),rgba(249,115,22,0.16))] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.35)] sm:p-8">
              <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
                <div className="space-y-5">
                  <div className="flex flex-wrap items-center gap-3">
                    {statusChip(featured.publicStatus, locale)}
                    <span className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-300">
                      {copy.featuredLabel}
                    </span>
                  </div>
                  <div>
                    <h2 className="text-3xl font-black text-white">{featured.name}</h2>
                    <p className="mt-3 max-w-2xl text-sm leading-7 text-neutral-300 sm:text-base">
                      {locale === "sw" ? featured.descriptionSw : featured.descriptionEn}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3 text-sm text-neutral-200">
                    <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5">
                      {copy.format}: {formatTournamentType(featured.format)}
                    </span>
                    <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5">
                      {featured.style}
                    </span>
                    <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5">
                      {featured.maxPlayers} {copy.players}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col justify-between gap-6 rounded-2xl border border-white/10 bg-black/20 p-5">
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">{copy.starts}</p>
                      <p className="mt-1 text-xl font-bold text-white">
                        {formatDate(featured.scheduledStartAt, locale)}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">
                        {copy.featuredNoteLabel}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-neutral-200">
                        {featured.publicStatus === "ACTIVE"
                          ? copy.liveNote
                          : featured.publicStatus === "REGISTRATION"
                            ? copy.openNote
                            : featured.closureNote}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <p className="text-neutral-400">{copy.registration}</p>
                        <p className="mt-1 text-2xl font-black text-white">{open.length}</p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <p className="text-neutral-400">{copy.active}</p>
                        <p className="mt-1 text-2xl font-black text-white">{live.length}</p>
                      </div>
                    </div>
                  </div>
                  <Link href={`/community/tournament/${featured.id}`} className="inline-flex">
                    <Button className="w-full gap-2 justify-center">
                      {locale === "sw" ? "Fungua ukurasa wa mashindano" : "Open tournament page"}
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-white/10 bg-white/5 p-8 text-center">
              <h2 className="text-2xl font-black text-white">{copy.emptyTitle}</h2>
              <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-neutral-400">
                {copy.emptyBody}
              </p>
            </div>
          )}
        </div>
      </section>

      <section className="px-4 pb-14 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl space-y-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black text-white">{copy.cardsTitle}</h2>
              <p className="mt-1 text-sm text-neutral-400">{copy.stripsTitle}</p>
            </div>
            <Link href="/community/tournament" className="text-sm font-semibold text-orange-300 hover:text-orange-200">
              {copy.allLink}
            </Link>
          </div>

          {spotlight.length === 0 ? (
            <p className="text-sm text-neutral-500">{copy.noSpotlight}</p>
          ) : (
            <div className="grid gap-5 lg:grid-cols-3">
              {spotlight.map((tournament) => (
                <Link
                  key={tournament.id}
                  href={`/community/tournament/${tournament.id}`}
                  className="group rounded-3xl border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] p-5 transition duration-200 hover:-translate-y-1 hover:border-orange-400/30 hover:bg-[linear-gradient(180deg,rgba(255,255,255,0.10),rgba(255,255,255,0.04))]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-lg font-bold text-white">{tournament.name}</h3>
                    {statusChip(tournament.publicStatus, locale)}
                  </div>
                  <p className="mt-4 line-clamp-3 text-sm leading-6 text-neutral-300">
                    {locale === "sw" ? tournament.descriptionSw : tournament.descriptionEn}
                  </p>
                  <div className="mt-5 flex flex-wrap gap-2 text-xs text-neutral-300">
                    <span className="rounded-full bg-white/5 px-3 py-1.5">{formatTournamentType(tournament.format)}</span>
                    <span className="rounded-full bg-white/5 px-3 py-1.5">{tournament.style}</span>
                    <span className="rounded-full bg-white/5 px-3 py-1.5">{formatDate(tournament.scheduledStartAt, locale)}</span>
                  </div>
                  <div className="mt-6 flex items-center justify-between text-sm text-neutral-400">
                    <span>{tournament.maxPlayers} {copy.players}</span>
                    <span className="inline-flex items-center gap-1 text-orange-300 transition group-hover:translate-x-1">
                      {locale === "sw" ? "Fungua" : "Open"}
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}

          <div className="grid gap-5 lg:grid-cols-2">
            <Link
              href="/community/tournament"
              className="rounded-3xl border border-sky-400/20 bg-sky-400/10 p-6 transition hover:border-sky-300/35 hover:bg-sky-400/14"
            >
              <div className="flex items-center gap-3 text-sky-200">
                <CalendarDays className="h-5 w-5" />
                <span className="text-sm font-semibold uppercase tracking-[0.16em]">
                  {locale === "sw" ? "Kalenda ya mashindano" : "Tournament calendar"}
                </span>
              </div>
              <h3 className="mt-4 text-2xl font-black text-white">
                {locale === "sw" ? "Kutoka usajili hadi mchezo wa mwisho." : "From registration windows to final rounds."}
              </h3>
              <p className="mt-3 text-sm leading-7 text-sky-100/80">
                {locale === "sw"
                  ? "Fungua orodha kamili kuona mashindano mapya, yaliyopo wazi, na yaliyokamilika karibuni."
                  : "Open the full listing to see fresh tournaments, active registration windows, and recently finished events."}
              </p>
            </Link>

            <Link
              href="/leaderboard"
              className="rounded-3xl border border-amber-400/20 bg-amber-400/10 p-6 transition hover:border-amber-300/35 hover:bg-amber-400/14"
            >
              <div className="flex items-center gap-3 text-amber-200">
                <BarChart3 className="h-5 w-5" />
                <span className="text-sm font-semibold uppercase tracking-[0.16em]">
                  {locale === "sw" ? "Wachezaji wa juu" : "Top players"}
                </span>
              </div>
              <h3 className="mt-4 text-2xl font-black text-white">
                {locale === "sw" ? "Fuata kasi ya ushindani wa jamii." : "Keep pace with the strongest players in the room."}
              </h3>
              <p className="mt-3 text-sm leading-7 text-amber-100/80">
                {locale === "sw"
                  ? "Ruka moja kwa moja kwenye leaderboard kuona nani anapanda, nani anatamba, na nani wa kumpinga."
                  : "Jump straight to the leaderboard to see who is climbing, who is holding form, and who might be your next rival."}
              </p>
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
