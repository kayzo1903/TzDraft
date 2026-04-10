"use client";

import { Link } from "@/i18n/routing";
import { useState, useRef, useEffect } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Link2,
  LoaderCircle,
  Share2,
  Swords,
  Trophy,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { useTournament } from "@/hooks/useTournament";
import { useAuth } from "@/hooks/useAuth";
import {
  tournamentService,
  type TournamentDetail,
  type TournamentMatch,
  type TournamentParticipant,
  type TournamentStatus,
} from "@/services/tournament.service";

interface Props {
  id: string;
  locale: string;
  initialData: TournamentDetail | null;
}

interface FeedbackDialogState {
  tone: "success" | "error";
  title: string;
  message: string;
}

function normalizeDialogMessage(
  value: unknown,
  fallback: string,
): string {
  if (typeof value === "string" && value.trim()) {
    return value;
  }

  if (Array.isArray(value)) {
    const parts = value
      .map((item) => normalizeDialogMessage(item, ""))
      .filter(Boolean);

    return parts.length > 0 ? parts.join(" ") : fallback;
  }

  if (value && typeof value === "object") {
    const maybeMessage = (value as { message?: unknown }).message;
    if (typeof maybeMessage === "string" && maybeMessage.trim()) {
      return maybeMessage;
    }

    if (Array.isArray(maybeMessage)) {
      return normalizeDialogMessage(maybeMessage, fallback);
    }
  }

  return fallback;
}

function localizeDialogMessage(message: string, locale: string) {
  if (locale !== "sw") {
    return message;
  }

  const knownMessages: Record<string, string> = {
    "Eligibility requirements not met": "Hujatimiza masharti ya kujiunga na mashindano haya.",
  };

  return knownMessages[message] ?? message;
}

function getRegistrationStatus(tournament: TournamentDetail["tournament"], participantsCount: number) {
  if (tournament.status !== "REGISTRATION") {
    return "NOT_STARTED";
  }

  const now = Date.now();
  const registrationDeadline = tournament.registrationDeadline
    ? new Date(tournament.registrationDeadline).getTime()
    : null;
  const scheduledStartAt = new Date(tournament.scheduledStartAt).getTime();

  if (participantsCount >= tournament.maxPlayers) {
    return "FULL";
  }

  if (registrationDeadline !== null && registrationDeadline <= now) {
    return "DEADLINE_PASSED";
  }

  if (scheduledStartAt <= now) {
    return "STARTED";
  }

  return "OPEN";
}

function formatTournamentType(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatDateTime(value: string | null, locale: string) {
  if (!value) return locale === "sw" ? "Haijawekwa" : "Not set";

  return new Intl.DateTimeFormat(locale === "sw" ? "sw-TZ" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatDateOnly(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale === "sw" ? "sw-TZ" : "en-US", {
    dateStyle: "medium",
  }).format(new Date(value));
}

function statusLabel(status: TournamentStatus, locale: string) {
  const labels = {
    DRAFT: { en: "Draft", sw: "Rasimu" },
    REGISTRATION: { en: "Registration Open", sw: "Usajili Wazi" },
    ACTIVE: { en: "Live Now", sw: "Inaendelea" },
    COMPLETED: { en: "Completed", sw: "Imekamilika" },
    CANCELLED: { en: "Cancelled", sw: "Imefutwa" },
  } as const;

  return labels[status][locale as "en" | "sw"] ?? status;
}

function statusTone(status: TournamentStatus) {
  const tones = {
    REGISTRATION: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
    ACTIVE: "border-sky-400/30 bg-sky-400/10 text-sky-200",
    COMPLETED: "border-white/10 bg-white/5 text-neutral-300",
    CANCELLED: "border-rose-400/30 bg-rose-400/10 text-rose-200",
    DRAFT: "border-amber-400/30 bg-amber-400/10 text-amber-200",
  } as const;

  return tones[status];
}

function playerLabel(
  userId: string | null,
  participantMap: Record<string, TournamentParticipant>,
  locale: string,
) {
  if (!userId) return "BYE";

  const participant = participantMap[userId];
  if (!participant) return locale === "sw" ? "Mchezaji" : "Player";

  return participant.seed != null
    ? `${locale === "sw" ? "Mchezaji" : "Player"} #${participant.seed}`
    : `${locale === "sw" ? "Mchezaji" : "Player"} ${participant.userId.slice(0, 6)}`;
}

function matchResultLabel(
  match: TournamentMatch,
  userId: string | undefined,
  locale: string,
) {
  if (!userId || !match.result) {
    return locale === "sw" ? "Inasubiri" : "Pending";
  }

  const won =
    (match.player1Id === userId && match.result === "PLAYER1_WIN") ||
    (match.player2Id === userId && match.result === "PLAYER2_WIN") ||
    match.result === "BYE";

  if (won) return locale === "sw" ? "Umeshinda" : "Won";
  return locale === "sw" ? "Umeshindwa" : "Lost";
}

function DetailCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400">
          {label}
        </span>
        <Icon className="h-4 w-4 text-amber-300" />
      </div>
      <p className="mt-4 text-xl font-black text-white">{value}</p>
      {hint && <p className="mt-2 text-sm text-neutral-400">{hint}</p>}
    </div>
  );
}

function LoadingSpinner({ className = "h-4 w-4" }: { className?: string }) {
  return <LoaderCircle className={`${className} animate-spin`} />;
}

function FeedbackDialog({
  tone,
  title,
  message,
  locale,
  onClose,
}: FeedbackDialogState & { locale: string; onClose: () => void }) {
  const accent =
    tone === "success"
      ? {
          shell: "border-emerald-400/20 bg-emerald-400/10 text-emerald-200",
          icon: <CheckCircle2 className="h-5 w-5 text-emerald-300" />,
          button: "bg-emerald-400 text-gray-950 hover:bg-emerald-300",
        }
      : {
          shell: "border-rose-400/20 bg-rose-400/10 text-rose-200",
          icon: <AlertTriangle className="h-5 w-5 text-rose-300" />,
          button: "bg-rose-400 text-gray-950 hover:bg-rose-300",
        };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-neutral-950 p-6 shadow-2xl">
        <div className={`inline-flex rounded-full border px-3 py-2 ${accent.shell}`}>
          {accent.icon}
        </div>
        <h2 className="mt-5 text-2xl font-black text-white">{title}</h2>
        <p className="mt-3 text-sm leading-7 text-neutral-300">{message}</p>
        <button
          type="button"
          onClick={onClose}
          className={`mt-6 inline-flex w-full items-center justify-center rounded-xl px-4 py-3 text-sm font-bold transition ${accent.button}`}
        >
          {locale === "sw" ? "Funga" : "Close"}
        </button>
      </div>
    </div>
  );
}

export default function TournamentDetailClient({ id, locale, initialData }: Props) {
  const { data, refetch } = useTournament(id);
  const { user } = useAuth();
  const [registering, setRegistering] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [dialog, setDialog] = useState<FeedbackDialogState | null>(null);
  const [copied, setCopied] = useState(false);
  const [showSharePanel, setShowSharePanel] = useState(false);
  const sharePanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (sharePanelRef.current && !sharePanelRef.current.contains(e.target as Node)) {
        setShowSharePanel(false);
      }
    }
    if (showSharePanel) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showSharePanel]);

  const detail = data ?? initialData;

  if (!detail) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-dashed border-white/10 bg-white/5 p-10 text-center">
          <h1 className="text-2xl font-black text-white">
            {locale === "sw" ? "Mashindano hayakupatikana." : "Tournament not found."}
          </h1>
          <Link
            href="/community/tournament"
            className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-amber-300"
          >
            <ArrowLeft className="h-4 w-4" />
            {locale === "sw" ? "Rudi kwenye mashindano" : "Back to tournaments"}
          </Link>
        </div>
      </main>
    );
  }

  const { tournament, participants, rounds, matches } = detail;
  const description = locale === "sw" ? tournament.descriptionSw : tournament.descriptionEn;
  const rules = locale === "sw" ? tournament.rulesSw : tournament.rulesEn;
  const registrationStatus = getRegistrationStatus(tournament, participants.length);
  const registrationOpen = registrationStatus === "OPEN";
  const participantMap = Object.fromEntries(participants.map((p) => [p.userId, p]));
  const isRegistered = user ? participants.some((participant) => participant.userId === user.id) : false;
  const canRegister = registrationOpen && !isRegistered;
  const canWithdraw = registrationStatus !== "NOT_STARTED" && registrationStatus !== "STARTED" && isRegistered;
  const myMatches = user
    ? matches.filter((match) => match.player1Id === user.id || match.player2Id === user.id)
    : [];
  const currentRound = rounds.find((round) => round.status === "ACTIVE")
    ?? rounds.find((round) => round.status === "PENDING")
    ?? rounds.at(-1)
    ?? null;
  const activeMatches = matches.filter((match) => match.status === "ACTIVE");
  const completedMatches = matches.filter((match) => match.status === "COMPLETED" || match.status === "BYE");
  const eligibilityRows = [
    tournament.minElo != null
      ? `${locale === "sw" ? "Kiwango cha chini cha ELO" : "Minimum ELO"}: ${tournament.minElo}`
      : null,
    tournament.maxElo != null
      ? `${locale === "sw" ? "Kiwango cha juu cha ELO" : "Maximum ELO"}: ${tournament.maxElo}`
      : null,
    tournament.minMatchmakingWins != null
      ? `${locale === "sw" ? "Ushindi wa ranked unaohitajika" : "Required ranked wins"}: ${tournament.minMatchmakingWins}`
      : null,
    tournament.minAiLevelBeaten != null
      ? `${locale === "sw" ? "Kiwango cha AI kilichoshindwa" : "AI level beaten"}: ${tournament.minAiLevelBeaten}+`
      : null,
    tournament.requiredAiLevelPlayed != null
      ? `${locale === "sw" ? "Kiwango cha AI kilichochezwa" : "Required AI level played"}: ${tournament.requiredAiLevelPlayed}+`
      : null,
  ].filter(Boolean) as string[];

  async function handleRegister() {
    setRegistering(true);
    try {
      await tournamentService.register(id);
      await refetch();
      setDialog({
        tone: "success",
        title: locale === "sw" ? "Umesajiliwa" : "Registration successful",
        message:
          locale === "sw"
            ? "Umejiunga rasmi kwenye mashindano haya. Endelea kufuatilia ukurasa huu kwa ratiba na mechi zako."
            : "You are now registered for this tournament. Keep an eye on this page for scheduling and your upcoming matches.",
      });
    } catch (error: any) {
      const fallbackMessage =
        locale === "sw"
          ? "Hatukuweza kukusajili kwa sasa."
          : "We could not register you right now.";

      setDialog({
        tone: "error",
        title: locale === "sw" ? "Usajili umeshindikana" : "Registration failed",
        message: localizeDialogMessage(
          normalizeDialogMessage(error?.response?.data?.message, fallbackMessage),
          locale,
        ),
      });
    } finally {
      setRegistering(false);
    }
  }

  async function handleWithdraw() {
    setWithdrawing(true);
    try {
      await tournamentService.withdraw(id);
      await refetch();
      setDialog({
        tone: "success",
        title: locale === "sw" ? "Umejitoa" : "Withdrawal successful",
        message:
          locale === "sw"
            ? "Umeondolewa kwenye usajili wa mashindano haya."
            : "You have been removed from this tournament registration.",
      });
    } catch (error: any) {
      const fallbackMessage =
        locale === "sw"
          ? "Hatukuweza kukuondoa kwenye mashindano kwa sasa."
          : "We could not withdraw you from the tournament right now.";

      setDialog({
        tone: "error",
        title: locale === "sw" ? "Kujitoa kumeshindikana" : "Withdrawal failed",
        message: localizeDialogMessage(
          normalizeDialogMessage(error?.response?.data?.message, fallbackMessage),
          locale,
        ),
      });
    } finally {
      setWithdrawing(false);
    }
  }

  function buildShareText() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    const prizes = tournament.prizes ?? [];
    const prizeText = prizes.length > 0
      ? (locale === "sw"
          ? ` 🏆 Zawadi: ${prizes.map((p) => `${p.placement === 1 ? "1st" : p.placement === 2 ? "2nd" : `${p.placement}th`} ${p.amount.toLocaleString()} ${p.currency}`).join(", ")}`
          : ` 🏆 Prizes: ${prizes.map((p) => `${p.placement === 1 ? "1st" : p.placement === 2 ? "2nd" : `${p.placement}th`} ${p.amount.toLocaleString()} ${p.currency}`).join(", ")}`)
      : "";
    const dateStr = new Intl.DateTimeFormat(locale === "sw" ? "sw-TZ" : "en-US", { dateStyle: "medium" }).format(new Date(tournament.scheduledStartAt));
    const text = locale === "sw"
      ? `🎯 ${tournament.name} — mashindano ya Drafti kwenye TzDraft!\n📅 ${dateStr} | 👥 ${participants.length}/${tournament.maxPlayers} wachezaji${prizeText}`
      : `🎯 ${tournament.name} — Tanzania Drafti tournament on TzDraft!\n📅 ${dateStr} | 👥 ${participants.length}/${tournament.maxPlayers} players${prizeText}`;
    return { url, text };
  }

  async function handleCopyLink() {
    const { url } = buildShareText();
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard unavailable
    }
  }

  function shareToWhatsApp() {
    const { url, text } = buildShareText();
    window.open(`https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`, "_blank");
  }

  function shareToTwitter() {
    const { url, text } = buildShareText();
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, "_blank");
  }

  function shareToFacebook() {
    const { url } = buildShareText();
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, "_blank");
  }

  function shareToTelegram() {
    const { url, text } = buildShareText();
    window.open(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`, "_blank");
  }

  return (
    <main className="bg-[var(--background)]">
      {dialog && (
        <FeedbackDialog
          {...dialog}
          locale={locale}
          onClose={() => setDialog(null)}
        />
      )}
      <section className="relative overflow-hidden border-b border-white/5 px-4 py-12 sm:px-6 lg:px-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(249,115,22,0.16),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(56,189,248,0.12),transparent_28%)]" />
        <div className="relative mx-auto max-w-6xl space-y-8">
          <div className="flex items-center justify-between gap-4">
            <Link
              href="/community/tournament"
              className="inline-flex items-center gap-2 text-sm font-semibold text-neutral-300 transition hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              {locale === "sw" ? "Mashindano yote" : "All tournaments"}
            </Link>

            <div className="relative" ref={sharePanelRef}>
              <button
                type="button"
                onClick={() => setShowSharePanel((v) => !v)}
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-neutral-200 transition hover:border-white/20 hover:bg-white/10"
              >
                <Share2 className="h-4 w-4" />
                {locale === "sw" ? "Shiriki" : "Share"}
              </button>

              {showSharePanel && (
                <div className="absolute right-0 top-11 z-50 w-64 rounded-2xl border border-white/10 bg-neutral-950 p-4 shadow-2xl">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400">
                      {locale === "sw" ? "Shiriki kupitia" : "Share via"}
                    </span>
                    <button type="button" onClick={() => setShowSharePanel(false)}>
                      <X className="h-4 w-4 text-neutral-500 hover:text-white" />
                    </button>
                  </div>
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={shareToWhatsApp}
                      className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm font-semibold text-neutral-200 transition hover:bg-white/10"
                    >
                      <span className="text-base">💬</span> WhatsApp
                    </button>
                    <button
                      type="button"
                      onClick={shareToTwitter}
                      className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm font-semibold text-neutral-200 transition hover:bg-white/10"
                    >
                      <span className="text-base">𝕏</span> Twitter / X
                    </button>
                    <button
                      type="button"
                      onClick={shareToFacebook}
                      className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm font-semibold text-neutral-200 transition hover:bg-white/10"
                    >
                      <span className="text-base">📘</span> Facebook
                    </button>
                    <button
                      type="button"
                      onClick={shareToTelegram}
                      className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm font-semibold text-neutral-200 transition hover:bg-white/10"
                    >
                      <span className="text-base">✈️</span> Telegram
                    </button>
                    <button
                      type="button"
                      onClick={handleCopyLink}
                      className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm font-semibold text-neutral-200 transition hover:bg-white/10"
                    >
                      {copied
                        ? <><Link2 className="h-4 w-4 text-emerald-400" /><span className="text-emerald-400">{locale === "sw" ? "Imenakiliwa!" : "Copied!"}</span></>
                        : <><Link2 className="h-4 w-4" />{locale === "sw" ? "Nakili kiungo" : "Copy link"}</>
                      }
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-3">
                <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusTone(tournament.status)}`}>
                  {statusLabel(tournament.status, locale)}
                </span>
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">
                  {formatTournamentType(tournament.format)}
                </span>
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">
                  {tournament.style}
                </span>
              </div>

              <div className="space-y-4">
                <h1 className="text-4xl font-black leading-tight text-white sm:text-5xl">
                  {tournament.name}
                </h1>
                <p className="max-w-3xl text-sm leading-7 text-neutral-300 sm:text-base">
                  {description}
                </p>
              </div>

              <div className="flex flex-wrap gap-3 text-sm text-neutral-200">
                <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5">
                  {participants.length}/{tournament.maxPlayers} {locale === "sw" ? "wachezaji" : "players"}
                </span>
                <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5">
                  {locale === "sw" ? "Kuanza" : "Starts"}: {formatDateOnly(tournament.scheduledStartAt, locale)}
                </span>
                <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5">
                  {locale === "sw" ? "Eneo" : "Scope"}: {tournament.scope}
                </span>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <DetailCard
                  icon={Users}
                  label={locale === "sw" ? "Usajili" : "Registration"}
                  value={`${participants.length}/${tournament.maxPlayers}`}
                  hint={
                    locale === "sw"
                      ? `Kima cha chini cha kuanza ni ${tournament.minPlayers}.`
                      : `Minimum needed to start is ${tournament.minPlayers}.`
                  }
                />
                <DetailCard
                  icon={Swords}
                  label={locale === "sw" ? "Raundi ya sasa" : "Current round"}
                  value={
                    currentRound
                      ? `${locale === "sw" ? "Raundi" : "Round"} ${currentRound.roundNumber}`
                      : locale === "sw"
                        ? "Haijaanza"
                        : "Not started"
                  }
                  hint={
                    locale === "sw"
                      ? `${activeMatches.length} mechi hai sasa.`
                      : `${activeMatches.length} live matches right now.`
                  }
                />
              </div>

              <div className="mt-5 space-y-3">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center gap-2 text-neutral-300">
                    <CalendarDays className="h-4 w-4 text-amber-300" />
                    <span className="text-xs font-semibold uppercase tracking-[0.16em]">
                      {locale === "sw" ? "Kuanza" : "Start time"}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-white">{formatDateTime(tournament.scheduledStartAt, locale)}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center gap-2 text-neutral-300">
                    <Clock3 className="h-4 w-4 text-sky-300" />
                    <span className="text-xs font-semibold uppercase tracking-[0.16em]">
                      {locale === "sw" ? "Usajili unafungwa" : "Registration closes"}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-white">{formatDateTime(tournament.registrationDeadline, locale)}</p>
                </div>
              </div>

              <div className="mt-5 flex flex-col gap-3">
                {canRegister && (
                  <button
                    onClick={handleRegister}
                    disabled={registering}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-400 px-4 py-3 text-sm font-bold text-gray-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:bg-gray-700 disabled:text-gray-400"
                  >
                    {registering ? <LoadingSpinner /> : <UserPlus className="h-4 w-4" />}
                    {registering
                      ? locale === "sw"
                        ? "Inasajili..."
                        : "Registering..."
                      : locale === "sw"
                        ? "Jisajili sasa"
                        : "Register now"}
                  </button>
                )}
                {canWithdraw && (
                  <button
                    onClick={handleWithdraw}
                    disabled={withdrawing}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm font-bold text-rose-200 transition hover:border-rose-400/50 hover:bg-rose-400/15 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {withdrawing && <LoadingSpinner />}
                    {withdrawing
                      ? locale === "sw"
                        ? "Inaondoa..."
                        : "Withdrawing..."
                      : locale === "sw"
                        ? "Jitoe kwenye mashindano"
                        : "Withdraw from tournament"}
                  </button>
                )}
                {!canRegister && !canWithdraw && (
                  <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-neutral-300">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                      <div>
                        {isRegistered ? (
                          <p>
                            {locale === "sw"
                              ? "Umesajiliwa tayari kwa mashindano haya."
                              : "You are already registered for this tournament."}
                          </p>
                        ) : (
                          <>
                            {registrationStatus === "FULL" && (
                              <p>
                                {locale === "sw"
                                  ? "Mashindano yamejaa. Hakuna nafasi zaidi zilizobaki."
                                  : "This tournament is full. No more slots available."}
                              </p>
                            )}
                            {registrationStatus === "DEADLINE_PASSED" && (
                              <p>
                                {locale === "sw"
                                  ? "Muda wa mwisho wa usajili umepita."
                                  : "The registration deadline has passed."}
                              </p>
                            )}
                            {registrationStatus === "STARTED" && (
                              <p>
                                {locale === "sw"
                                  ? "Mashindano tayari yameanza."
                                  : "The tournament has already started."}
                              </p>
                            )}
                            {registrationStatus === "NOT_STARTED" && (
                              <p>
                                {locale === "sw"
                                  ? "Usajili haupo wazi kwa hali hii."
                                  : "Registration is not open for this status."}
                              </p>
                            )}
                            {registrationStatus === "OPEN" && !user && (
                              <p>
                                {locale === "sw"
                                  ? "Tafadhali ingia ili ujisajili."
                                  : "Please sign in to register."}
                              </p>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-6xl gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-6">
            <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <h2 className="text-xl font-black text-white">
                {locale === "sw" ? "Muhtasari wa tukio" : "Event overview"}
              </h2>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <DetailCard
                  icon={Trophy}
                  label={locale === "sw" ? "Muundo" : "Format"}
                  value={formatTournamentType(tournament.format)}
                />
                <DetailCard
                  icon={Clock3}
                  label={locale === "sw" ? "Muda wa mchezo" : "Time control"}
                  value={tournament.style}
                />
                <DetailCard
                  icon={Users}
                  label={locale === "sw" ? "Wachezaji wa chini" : "Minimum players"}
                  value={String(tournament.minPlayers)}
                />
                <DetailCard
                  icon={CheckCircle2}
                  label={locale === "sw" ? "Mechi zilizokamilika" : "Completed matches"}
                  value={String(completedMatches.length)}
                />
              </div>
            </section>

            {(rules || eligibilityRows.length > 0) && (
              <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
                <h2 className="text-xl font-black text-white">
                  {locale === "sw" ? "Sheria na masharti" : "Rules and eligibility"}
                </h2>
                {rules && (
                  <div className="mt-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400">
                      {locale === "sw" ? "Sheria" : "Rules"}
                    </p>
                    <p className="mt-2 text-sm leading-7 text-neutral-300">{rules}</p>
                  </div>
                )}
                {eligibilityRows.length > 0 && (
                  <div className="mt-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400">
                      {locale === "sw" ? "Masharti ya kujiunga" : "Entry requirements"}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {eligibilityRows.map((row) => (
                        <span
                          key={row}
                          className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-sm text-neutral-200"
                        >
                          {row}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            )}

	            {rounds.length > 0 && (
	              <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
	                <div className="flex items-center justify-between gap-4">
	                  <div>
	                    <h2 className="text-xl font-black text-white">
	                      {locale === "sw" ? "Raundi na mechi" : "Rounds and matches"}
	                    </h2>
	                    <p className="mt-1 text-sm text-neutral-400">
	                      {locale === "sw"
	                        ? "Fuatilia maendeleo ya bracket kila raundi hadi fainali."
	                        : "Track the full bracket live from opening round through the final."}
	                    </p>
	                  </div>
	                </div>

                <div className="mt-6 space-y-6">
                  {rounds.map((round) => {
                    const roundMatches = matches.filter((match) => match.roundId === round.id);

                    return (
                      <div key={round.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
	                          <div className="flex flex-wrap items-center justify-between gap-3">
	                            <div>
	                              <h3 className="text-lg font-bold text-white">
	                                {locale === "sw" ? `Raundi ${round.roundNumber}` : `Round ${round.roundNumber}`}
	                              </h3>
	                              <p className="mt-1 text-sm text-neutral-400">
	                                {roundMatches.length} {locale === "sw" ? "mechi" : "matches"}
	                              </p>
                                <p className="mt-1 text-xs text-neutral-500">
                                  {locale === "sw" ? "Imeanza" : "Started"}: {formatDateTime(round.startedAt, locale)}
                                </p>
	                            </div>
	                            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-neutral-300">
	                              {round.status}
	                            </span>
	                          </div>

                        <div className="mt-4 space-y-3">
                          {roundMatches.map((match) => {
                            const isMyMatch = user && (match.player1Id === user.id || match.player2Id === user.id);

                            return (
                              <div
                                key={match.id}
                                className={`rounded-2xl border px-4 py-4 ${
                                  isMyMatch
                                    ? "border-amber-400/30 bg-amber-400/10"
                                    : "border-white/10 bg-white/5"
                                }`}
                              >
                                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
	                                  <div className="space-y-2">
	                                    <div className="flex items-center gap-2 text-sm text-neutral-300">
	                                      <span className={match.result === "PLAYER1_WIN" ? "font-bold text-white" : ""}>
	                                        {playerLabel(match.player1Id, participantMap, locale)}
	                                      </span>
                                      <span className="text-neutral-500">vs</span>
                                      <span className={match.result === "PLAYER2_WIN" ? "font-bold text-white" : ""}>
                                        {playerLabel(match.player2Id, participantMap, locale)}
                                      </span>
                                    </div>
	                                    <div className="text-xs text-neutral-400">
	                                      {locale === "sw" ? "Michezo" : "Games"}: {match.player1Wins}-{match.player2Wins}
	                                    </div>
                                      <div className="flex flex-wrap gap-2 text-[11px] text-neutral-500">
                                        <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1">
                                          {locale === "sw" ? "Imeanza" : "Started"}: {formatDateTime(match.startedAt, locale)}
                                        </span>
                                        <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1">
                                          {locale === "sw" ? "Imekamilika" : "Finished"}: {formatDateTime(match.completedAt, locale)}
                                        </span>
                                      </div>
	                                  </div>

	                                  <div className="flex items-center gap-3">
	                                    <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs font-semibold text-neutral-300">
	                                      {match.status}
	                                    </span>
	                                    {match.currentGameId && (
	                                      <Link
	                                        href={`/game/${match.currentGameId}`}
	                                        className="inline-flex items-center gap-2 rounded-full bg-amber-400 px-3 py-1.5 text-xs font-bold text-gray-950 transition hover:bg-amber-300"
	                                      >
	                                        {locale === "sw" ? "Tazama live" : "Watch live"}
	                                        <ArrowRight className="h-3.5 w-3.5" />
	                                      </Link>
	                                    )}
	                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
          </div>

          <div className="space-y-6">
            {myMatches.length > 0 && (
              <section className="rounded-3xl border border-amber-400/20 bg-amber-400/10 p-6">
                <h2 className="text-xl font-black text-white">
                  {locale === "sw" ? "Mechi zako" : "Your matches"}
                </h2>
                <div className="mt-5 space-y-3">
                  {myMatches.map((match) => {
                    const roundNumber = rounds.find((round) => round.id === match.roundId)?.roundNumber ?? "?";

                    return (
                      <div key={match.id} className="rounded-2xl border border-amber-400/20 bg-black/20 p-4">
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <p className="text-sm font-semibold text-white">
                              {locale === "sw" ? "Raundi" : "Round"} {roundNumber}
                            </p>
                            <p className="mt-1 text-sm text-amber-100/80">
                              {match.player1Wins}-{match.player2Wins} • {matchResultLabel(match, user?.id, locale)}
                            </p>
                          </div>
                          {match.currentGameId ? (
                            <Link
                              href={`/game/${match.currentGameId}`}
                              className="inline-flex items-center gap-2 rounded-full bg-amber-400 px-3 py-1.5 text-xs font-bold text-gray-950 transition hover:bg-amber-300"
                            >
                              {locale === "sw" ? "Cheza sasa" : "Play now"}
                              <ArrowRight className="h-3.5 w-3.5" />
                            </Link>
                          ) : (
                            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-neutral-200">
                              {match.status}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {(tournament.prizes?.length ?? 0) > 0 && (
              <section className="rounded-3xl border border-amber-400/20 bg-amber-400/5 p-6">
                <div className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-amber-300" />
                  <h2 className="text-xl font-black text-white">
                    {locale === "sw" ? "Zawadi" : "Prize Pool"}
                  </h2>
                </div>
                <div className="mt-5 space-y-3">
                  {[...tournament.prizes]
                    .sort((a, b) => a.placement - b.placement)
                    .map((prize) => {
                      const medals = ["🥇", "🥈", "🥉"];
                      const medal = medals[prize.placement - 1] ?? `#${prize.placement}`;
                      const placementLabel =
                        prize.placement === 1
                          ? locale === "sw" ? "1. Nafasi" : "1st Place"
                          : prize.placement === 2
                            ? locale === "sw" ? "2. Nafasi" : "2nd Place"
                            : prize.placement === 3
                              ? locale === "sw" ? "3. Nafasi" : "3rd Place"
                              : `${prize.placement}${locale === "sw" ? ". Nafasi" : "th Place"}`;
                      return (
                        <div
                          key={prize.id}
                          className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-4 py-3"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-xl">{medal}</span>
                            <div>
                              <p className="text-sm font-semibold text-white">{placementLabel}</p>
                              {prize.label && (
                                <p className="text-xs text-neutral-400">{prize.label}</p>
                              )}
                            </div>
                          </div>
                          <p className="text-sm font-black text-amber-300">
                            {prize.amount.toLocaleString()} {prize.currency}
                          </p>
                        </div>
                      );
                    })}
                </div>
              </section>
            )}

            <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <h2 className="text-xl font-black text-white">
                {locale === "sw" ? "Wachezaji waliosajiliwa" : "Registered players"}
              </h2>
              <p className="mt-1 text-sm text-neutral-400">
                {locale === "sw"
                  ? "Muonekano wa sasa wa nafasi, seed, na matokeo."
                  : "Current view of seeds, participation status, and match record."}
              </p>

              <div className="mt-5 space-y-3">
                {participants.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-4 text-sm text-neutral-400">
                    {locale === "sw"
                      ? "Hakuna aliyesajiliwa bado."
                      : "No players have registered yet."}
                  </div>
                ) : (
                  [...participants]
                    .sort((a, b) => {
                      if (a.seed == null && b.seed == null) return 0;
                      if (a.seed == null) return 1;
                      if (b.seed == null) return -1;
                      return a.seed - b.seed;
                    })
                    .map((participant) => (
                      <div
                        key={participant.userId}
                        className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-black/20 p-4"
                      >
                        <div>
                          <p className="text-sm font-semibold text-white">
                            {participant.seed != null
                              ? `${locale === "sw" ? "Seed" : "Seed"} #${participant.seed}`
                              : locale === "sw"
                                ? "Mchezaji aliyesajiliwa"
                                : "Registered player"}
                          </p>
                          <p className="mt-1 text-xs text-neutral-400">
                            {locale === "sw" ? "Amesajiliwa" : "Joined"} {formatDateTime(participant.registeredAt, locale)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400">
                            {participant.status}
                          </p>
                          <p className="mt-1 text-sm text-neutral-300">
                            {participant.matchWins}-{participant.matchLosses}
                          </p>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </section>
          </div>
        </div>
      </section>
    </main>
  );
}
