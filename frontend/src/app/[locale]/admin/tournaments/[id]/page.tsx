"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Crown, Loader2, RefreshCw, Trophy } from "lucide-react";
import {
  tournamentService,
  type Tournament,
  type TournamentDetail,
  type TournamentMatch,
  type TournamentParticipant,
  type TournamentScope,
  type TournamentStyle,
} from "@/services/tournament.service";

function badgeClass(status: string) {
  const tone: Record<string, string> = {
    REGISTRATION: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
    ACTIVE: "border-sky-400/30 bg-sky-400/10 text-sky-200",
    COMPLETED: "border-white/10 bg-white/5 text-neutral-300",
    CANCELLED: "border-rose-400/30 bg-rose-400/10 text-rose-200",
    REGISTERED: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
    ELIMINATED: "border-rose-400/30 bg-rose-400/10 text-rose-200",
    ACTIVE_PARTICIPANT: "border-sky-400/30 bg-sky-400/10 text-sky-200",
    WITHDRAWN: "border-white/10 bg-white/5 text-neutral-300",
    PENDING: "border-white/10 bg-white/5 text-neutral-300",
    BYE: "border-amber-400/30 bg-amber-400/10 text-amber-200",
  };
  return tone[status] ?? "border-white/10 bg-white/5 text-neutral-300";
}

function pretty(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function toDateTimeLocalValue(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  const hours = `${date.getHours()}`.padStart(2, "0");
  const minutes = `${date.getMinutes()}`.padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function toReadableDateTime(value: string | null, locale: string) {
  if (!value) {
    return locale === "sw" ? "Hakijawekwa" : "Not set";
  }

  return new Intl.DateTimeFormat(locale === "sw" ? "sw-KE" : "en-US", {
    dateStyle: "full",
    timeStyle: "short",
  }).format(new Date(value));
}

function buildEditForm(tournament: Tournament) {
  return {
    name: tournament.name,
    descriptionEn: tournament.descriptionEn,
    descriptionSw: tournament.descriptionSw,
    rulesEn: tournament.rulesEn ?? "",
    rulesSw: tournament.rulesSw ?? "",
    style: tournament.style,
    scope: tournament.scope,
    country: tournament.country ?? "",
    region: tournament.region ?? "",
    maxPlayers: `${tournament.maxPlayers}`,
    minPlayers: `${tournament.minPlayers}`,
    scheduledStartAt: toDateTimeLocalValue(tournament.scheduledStartAt),
    registrationDeadline: toDateTimeLocalValue(tournament.registrationDeadline),
  };
}

function currentRoundNumber(detail: TournamentDetail) {
  const activeRound = detail.rounds.find((round) => round.status === "ACTIVE");
  if (activeRound) return activeRound.roundNumber;
  if (detail.rounds.length === 0) return 0;
  return Math.max(...detail.rounds.map((round) => round.roundNumber));
}

function winnerId(detail: TournamentDetail) {
  if (detail.tournament.status !== "COMPLETED") return null;
  const roundsById = new Map(detail.rounds.map((round) => [round.id, round.roundNumber]));
  const finalMatch = [...detail.matches]
    .sort((a, b) => (roundsById.get(b.roundId) ?? 0) - (roundsById.get(a.roundId) ?? 0))
    .find((match) => match.result === "PLAYER1_WIN" || match.result === "PLAYER2_WIN");
  if (!finalMatch) return null;
  return finalMatch.result === "PLAYER1_WIN" ? finalMatch.player1Id : finalMatch.player2Id;
}

function participantLabel(participant: TournamentParticipant, championId: string | null) {
  if (championId && participant.userId === championId) return "Champion";
  if (participant.status === "ACTIVE") return "Still in bracket";
  return pretty(participant.status);
}

function automationSummary(detail: TournamentDetail, locale: string) {
  const scheduledStartAt = new Date(detail.tournament.scheduledStartAt).getTime();
  const now = Date.now();
  const firstRoundStartedAt = detail.rounds[0]?.startedAt
    ? new Date(detail.rounds[0].startedAt).getTime()
    : null;
  const participantCount = detail.participants.length;
  const minimum = detail.tournament.minPlayers;

  if (
    detail.tournament.status === "CANCELLED" &&
    scheduledStartAt <= now &&
    participantCount < minimum
  ) {
    return {
      tone: "rose" as const,
      title: locale === "sw" ? "Ilighairiwa kiotomatiki" : "Cancelled automatically",
      message:
        locale === "sw"
          ? `Mashindano yalighairiwa kiotomatiki muda wa kuanza ulipofika kwa sababu wachezaji ${minimum} wa chini hawakufikiwa.`
          : `This tournament was cancelled automatically at scheduled start because the minimum ${minimum} players was not reached.`,
    };
  }

  if (
    detail.tournament.status === "ACTIVE" &&
    scheduledStartAt <= now &&
    firstRoundStartedAt !== null &&
    Math.abs(firstRoundStartedAt - scheduledStartAt) <= 90_000
  ) {
    return {
      tone: "sky" as const,
      title: locale === "sw" ? "Ilianza kiotomatiki" : "Started automatically",
      message:
        locale === "sw"
          ? "Mashindano haya yalianza kiotomatiki muda wa kuanza ulipofika na idadi ya chini ya wachezaji ilikuwa imetimia."
          : "This tournament started automatically when the scheduled start time arrived and the minimum player count was already met.",
    };
  }

  if (detail.tournament.status === "REGISTRATION" && scheduledStartAt <= now) {
    return {
      tone: "amber" as const,
      title: locale === "sw" ? "Inasubiri usindikaji wa ratiba" : "Waiting for scheduler",
      message:
        locale === "sw"
          ? "Muda wa kuanza umepita. Mfumo unapaswa kuanza au kughairi mashindano muda mfupi ujao."
          : "The scheduled start time has passed. The scheduler should start or cancel this tournament shortly.",
    };
  }

  return null;
}

export default function AdminTournamentMonitorPage() {
  const { locale, id } = useParams<{ locale: string; id: string }>();
  const [detail, setDetail] = useState<TournamentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(() => buildEditForm({
    id: "",
    name: "",
    descriptionEn: "",
    descriptionSw: "",
    rulesEn: null,
    rulesSw: null,
    format: "SINGLE_ELIMINATION",
    style: "RAPID",
    status: "REGISTRATION",
    scope: "GLOBAL",
    country: null,
    region: null,
    maxPlayers: 4,
    minPlayers: 4,
    minElo: null,
    maxElo: null,
    minMatchmakingWins: null,
    minAiLevelBeaten: null,
    requiredAiLevelPlayed: null,
    registrationDeadline: null,
    scheduledStartAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  }));
  const [savingEdit, setSavingEdit] = useState(false);
  const [editDirty, setEditDirty] = useState(false);

  const loadTournament = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const data = await tournamentService.get(id);
      setDetail(data);
      if (!editDirty || !isRefresh) {
        setEditForm(buildEditForm(data.tournament));
        setEditDirty(false);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Failed to load tournament.");
    } finally {
      if (isRefresh) setRefreshing(false);
      else setLoading(false);
    }
  }, [editDirty, id]);

  useEffect(() => {
    loadTournament();
  }, [loadTournament]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      void loadTournament(true);
    }, 10000);
    return () => window.clearInterval(interval);
  }, [loadTournament]);

  const roundNumber = useMemo(() => (detail ? currentRoundNumber(detail) : 0), [detail]);
  const championId = useMemo(() => (detail ? winnerId(detail) : null), [detail]);
  const automationState = useMemo(
    () => (detail ? automationSummary(detail, locale) : null),
    [detail, locale],
  );

  const matchesInCurrentRound = useMemo(() => {
    if (!detail || roundNumber === 0) return [] as TournamentMatch[];
    const roundId = detail.rounds.find((round) => round.roundNumber === roundNumber)?.id;
    return detail.matches.filter((match) => match.roundId === roundId);
  }, [detail, roundNumber]);

  const handleStart = async () => {
    if (!detail) return;
    setActionError(null);
    setActionSuccess(null);
    try {
      await tournamentService.start(detail.tournament.id);
      setActionSuccess(locale === "sw" ? "Mashindano yameanzishwa." : "Tournament started.");
      await loadTournament(true);
    } catch (err: any) {
      setActionError(err?.response?.data?.message || err?.message || "Failed to start tournament.");
    }
  };

  const handleRemoveParticipant = async (participant: TournamentParticipant) => {
    if (!detail) return;
    setActionError(null);
    setActionSuccess(null);
    setRemovingUserId(participant.userId);
    try {
      await tournamentService.adminRemoveParticipant(detail.tournament.id, participant.userId);
      setActionSuccess(
        locale === "sw"
          ? "Mchezaji ameondolewa kwenye mashindano."
          : "Participant removed from the tournament.",
      );
      await loadTournament(true);
    } catch (err: any) {
      setActionError(err?.response?.data?.message || err?.message || "Failed to remove participant.");
    } finally {
      setRemovingUserId(null);
    }
  };

  const handleEditChange = (
    field: keyof typeof editForm,
    value: string | TournamentStyle | TournamentScope,
  ) => {
    setEditForm((current) => ({ ...current, [field]: value }));
    setEditDirty(true);
  };

  const handleSaveTournament = async () => {
    if (!detail || !editForm.scheduledStartAt) return;
    setActionError(null);
    setActionSuccess(null);
    setSavingEdit(true);
    try {
      await tournamentService.update(detail.tournament.id, {
        name: editForm.name.trim(),
        descriptionEn: editForm.descriptionEn.trim(),
        descriptionSw: editForm.descriptionSw.trim(),
        rulesEn: editForm.rulesEn.trim() ? editForm.rulesEn.trim() : null,
        rulesSw: editForm.rulesSw.trim() ? editForm.rulesSw.trim() : null,
        style: editForm.style,
        scope: editForm.scope,
        country: editForm.scope === "GLOBAL" ? null : editForm.country.trim() || null,
        region: editForm.scope === "REGION" ? editForm.region.trim() || null : null,
        maxPlayers: Number(editForm.maxPlayers),
        minPlayers: Number(editForm.minPlayers),
        scheduledStartAt: new Date(editForm.scheduledStartAt).toISOString(),
        registrationDeadline: editForm.registrationDeadline
          ? new Date(editForm.registrationDeadline).toISOString()
          : null,
      });
      setEditDirty(false);
      setActionSuccess(
        locale === "sw"
          ? "Maelezo ya mashindano yamesasishwa."
          : "Tournament details updated.",
      );
      await loadTournament(true);
    } catch (err: any) {
      setActionError(err?.response?.data?.message || err?.message || "Failed to update tournament.");
    } finally {
      setSavingEdit(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-gray-400">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-rose-300">{error ?? "Tournament not found."}</p>
        <Link href={`/${locale}/admin/tournaments`} className="text-sm text-amber-300 underline underline-offset-2">
          Back to tournaments
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-4">
          <Link href={`/${locale}/admin/tournaments`} className="text-sm text-amber-300 underline underline-offset-2">
            Back to tournaments
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-black text-white">{detail.tournament.name}</h1>
            <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${badgeClass(detail.tournament.status)}`}>
              {pretty(detail.tournament.status)}
            </span>
          </div>
          <p className="max-w-3xl text-sm leading-7 text-gray-300">
            {locale === "sw" ? detail.tournament.descriptionSw : detail.tournament.descriptionEn}
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          {detail.tournament.status === "REGISTRATION" && (
            <button
              type="button"
              onClick={handleStart}
              className="inline-flex items-center justify-center rounded-xl bg-amber-400 px-4 py-2.5 text-sm font-bold text-gray-950 transition hover:bg-amber-300"
            >
              Start tournament
            </button>
          )}
          <button
            type="button"
            onClick={() => loadTournament(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-700 px-4 py-2.5 text-sm font-semibold text-gray-300 transition hover:border-gray-500 hover:text-white disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {actionError && (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {actionError}
        </div>
      )}

      {actionSuccess && (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          {actionSuccess}
        </div>
      )}

      {automationState && (
        <div
          className={`rounded-2xl border px-4 py-4 text-sm ${
            automationState.tone === "rose"
              ? "border-rose-500/30 bg-rose-500/10 text-rose-200"
              : automationState.tone === "sky"
                ? "border-sky-500/30 bg-sky-500/10 text-sky-200"
                : "border-amber-500/30 bg-amber-500/10 text-amber-200"
          }`}
        >
          <p className="font-semibold">{automationState.title}</p>
          <p className="mt-1 leading-6">{automationState.message}</p>
        </div>
      )}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Current Round", value: roundNumber > 0 ? `${roundNumber}` : "Not started" },
          { label: "Joined Players", value: `${detail.participants.length}/${detail.tournament.maxPlayers}` },
          {
            label: "Still In",
            value: `${detail.participants.filter((participant) => participant.status === "REGISTERED" || participant.status === "ACTIVE").length}`,
          },
          { label: "Winner", value: championId ?? "Pending" },
        ].map((item) => (
          <div key={item.label} className="rounded-2xl border border-gray-800 bg-gray-900/70 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">{item.label}</p>
            <p className="mt-4 break-all text-2xl font-black text-white">{item.value}</p>
          </div>
        ))}
      </section>

      <section className="rounded-2xl border border-gray-800 bg-gray-900/70 p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">
              {locale === "sw" ? "Hariri mashindano" : "Edit tournament"}
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-gray-400">
              {locale === "sw"
                ? "Unaweza kusahihisha jina, maelezo, mipaka ya wachezaji na ratiba kabla mashindano hayajaanza."
                : "You can fix the name, descriptions, player limits, and timing while the tournament is still in registration."}
            </p>
          </div>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-gray-300">
            {detail.tournament.status === "REGISTRATION"
              ? locale === "sw"
                ? "Inaweza kuhaririwa"
                : "Editable now"
              : locale === "sw"
                ? "Imefungwa baada ya kuanza"
                : "Locked after start"}
          </span>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <label className="space-y-2 lg:col-span-2">
            <span className="text-sm font-semibold text-white">
              {locale === "sw" ? "Jina la mashindano" : "Tournament name"}
            </span>
            <input
              type="text"
              value={editForm.name}
              onChange={(event) => handleEditChange("name", event.target.value)}
              disabled={detail.tournament.status !== "REGISTRATION" || savingEdit}
              className="w-full rounded-xl border border-gray-700 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-semibold text-white">
              {locale === "sw" ? "Maelezo ya Kiingereza" : "English description"}
            </span>
            <textarea
              value={editForm.descriptionEn}
              onChange={(event) => handleEditChange("descriptionEn", event.target.value)}
              disabled={detail.tournament.status !== "REGISTRATION" || savingEdit}
              rows={4}
              className="w-full rounded-xl border border-gray-700 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-semibold text-white">
              {locale === "sw" ? "Maelezo ya Kiswahili" : "Swahili description"}
            </span>
            <textarea
              value={editForm.descriptionSw}
              onChange={(event) => handleEditChange("descriptionSw", event.target.value)}
              disabled={detail.tournament.status !== "REGISTRATION" || savingEdit}
              rows={4}
              className="w-full rounded-xl border border-gray-700 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-semibold text-white">
              {locale === "sw" ? "Sheria kwa Kiingereza" : "English rules"}
            </span>
            <textarea
              value={editForm.rulesEn}
              onChange={(event) => handleEditChange("rulesEn", event.target.value)}
              disabled={detail.tournament.status !== "REGISTRATION" || savingEdit}
              rows={3}
              className="w-full rounded-xl border border-gray-700 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-semibold text-white">
              {locale === "sw" ? "Sheria kwa Kiswahili" : "Swahili rules"}
            </span>
            <textarea
              value={editForm.rulesSw}
              onChange={(event) => handleEditChange("rulesSw", event.target.value)}
              disabled={detail.tournament.status !== "REGISTRATION" || savingEdit}
              rows={3}
              className="w-full rounded-xl border border-gray-700 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-semibold text-white">
              {locale === "sw" ? "Muda wa mchezo" : "Time control"}
            </span>
            <select
              value={editForm.style}
              onChange={(event) => handleEditChange("style", event.target.value as TournamentStyle)}
              disabled={detail.tournament.status !== "REGISTRATION" || savingEdit}
              className="w-full rounded-xl border border-gray-700 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {["BLITZ", "RAPID", "CLASSICAL", "UNLIMITED"].map((style) => (
                <option key={style} value={style} className="bg-gray-950 text-white">
                  {pretty(style)}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-sm font-semibold text-white">
              {locale === "sw" ? "Upeo wa mashindano" : "Tournament scope"}
            </span>
            <select
              value={editForm.scope}
              onChange={(event) => handleEditChange("scope", event.target.value as TournamentScope)}
              disabled={detail.tournament.status !== "REGISTRATION" || savingEdit}
              className="w-full rounded-xl border border-gray-700 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {["GLOBAL", "COUNTRY", "REGION"].map((scope) => (
                <option key={scope} value={scope} className="bg-gray-950 text-white">
                  {pretty(scope)}
                </option>
              ))}
            </select>
          </label>

          {editForm.scope !== "GLOBAL" && (
            <label className="space-y-2">
              <span className="text-sm font-semibold text-white">
                {locale === "sw" ? "Nchi" : "Country"}
              </span>
              <input
                type="text"
                value={editForm.country}
                onChange={(event) => handleEditChange("country", event.target.value)}
                disabled={detail.tournament.status !== "REGISTRATION" || savingEdit}
                className="w-full rounded-xl border border-gray-700 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </label>
          )}

          {editForm.scope === "REGION" && (
            <label className="space-y-2">
              <span className="text-sm font-semibold text-white">
                {locale === "sw" ? "Mkoa" : "Region"}
              </span>
              <input
                type="text"
                value={editForm.region}
                onChange={(event) => handleEditChange("region", event.target.value)}
                disabled={detail.tournament.status !== "REGISTRATION" || savingEdit}
                className="w-full rounded-xl border border-gray-700 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </label>
          )}

          <label className="space-y-2">
            <span className="text-sm font-semibold text-white">
              {locale === "sw" ? "Wachezaji wa juu" : "Maximum players"}
            </span>
            <input
              type="number"
              min={4}
              value={editForm.maxPlayers}
              onChange={(event) => handleEditChange("maxPlayers", event.target.value)}
              disabled={detail.tournament.status !== "REGISTRATION" || savingEdit}
              className="w-full rounded-xl border border-gray-700 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-semibold text-white">
              {locale === "sw" ? "Wachezaji wa chini" : "Minimum players"}
            </span>
            <input
              type="number"
              min={4}
              value={editForm.minPlayers}
              onChange={(event) => handleEditChange("minPlayers", event.target.value)}
              disabled={detail.tournament.status !== "REGISTRATION" || savingEdit}
              className="w-full rounded-xl border border-gray-700 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-semibold text-white">
              {locale === "sw" ? "Muda mpya wa kuanza" : "New start time"}
            </span>
            <input
              type="datetime-local"
              value={editForm.scheduledStartAt}
              onChange={(event) => handleEditChange("scheduledStartAt", event.target.value)}
              disabled={detail.tournament.status !== "REGISTRATION" || savingEdit}
              className="w-full rounded-xl border border-gray-700 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
            />
            <p className="text-xs text-gray-500">
              {locale === "sw"
                ? `Sasa: ${toReadableDateTime(detail.tournament.scheduledStartAt, locale)}`
                : `Current: ${toReadableDateTime(detail.tournament.scheduledStartAt, locale)}`}
            </p>
          </label>

          <label className="space-y-2">
            <span className="text-sm font-semibold text-white">
              {locale === "sw" ? "Mwisho wa usajili" : "Registration deadline"}
            </span>
            <input
              type="datetime-local"
              value={editForm.registrationDeadline}
              onChange={(event) => handleEditChange("registrationDeadline", event.target.value)}
              disabled={detail.tournament.status !== "REGISTRATION" || savingEdit}
              className="w-full rounded-xl border border-gray-700 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
            />
            <p className="text-xs text-gray-500">
              {locale === "sw"
                ? `Sasa: ${toReadableDateTime(detail.tournament.registrationDeadline, locale)}`
                : `Current: ${toReadableDateTime(detail.tournament.registrationDeadline, locale)}`}
            </p>
          </label>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleSaveTournament}
            disabled={detail.tournament.status !== "REGISTRATION" || savingEdit || !editForm.scheduledStartAt}
            className="inline-flex items-center gap-2 rounded-xl bg-amber-400 px-4 py-2.5 text-sm font-bold text-gray-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {savingEdit && <Loader2 className="h-4 w-4 animate-spin" />}
            {locale === "sw" ? "Hifadhi mabadiliko" : "Save changes"}
          </button>
          <button
            type="button"
            onClick={() => {
              handleEditChange("registrationDeadline", "");
            }}
            disabled={detail.tournament.status !== "REGISTRATION" || savingEdit}
            className="inline-flex items-center rounded-xl border border-gray-700 px-4 py-2.5 text-sm font-semibold text-gray-300 transition hover:border-gray-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {locale === "sw" ? "Ondoa mwisho wa usajili" : "Clear registration deadline"}
          </button>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-2xl border border-gray-800 bg-gray-900/70 p-6">
          <h2 className="text-lg font-bold text-white">Participants</h2>
          <p className="mt-1 text-sm text-gray-400">
            Remove players during registration if they violate policy. After the tournament starts, removal is locked.
          </p>

          <div className="mt-6 space-y-3">
            {detail.participants.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-800 px-4 py-8 text-center text-sm text-gray-500">
                No participants yet.
              </div>
            ) : (
              detail.participants.map((participant) => (
                <div key={participant.userId} className="flex flex-col gap-4 rounded-2xl border border-gray-800 bg-black/20 p-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-3">
                      <p className="font-semibold text-white">{participant.userId}</p>
                      <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${badgeClass(participant.status === "ACTIVE" ? "ACTIVE_PARTICIPANT" : participant.status)}`}>
                        {participantLabel(participant, championId)}
                      </span>
                      {championId === participant.userId && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-xs font-semibold text-amber-200">
                          <Trophy className="h-3.5 w-3.5" />
                          Winner
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs text-gray-300">
                      <span className="rounded-full bg-white/5 px-3 py-1.5">Seed {participant.seed ?? "-"}</span>
                      <span className="rounded-full bg-white/5 px-3 py-1.5">ELO {participant.eloAtSignup}</span>
                      <span className="rounded-full bg-white/5 px-3 py-1.5">Wins {participant.matchWins}</span>
                      <span className="rounded-full bg-white/5 px-3 py-1.5">Losses {participant.matchLosses}</span>
                    </div>
                  </div>

                  {detail.tournament.status === "REGISTRATION" ? (
                    <button
                      type="button"
                      onClick={() => handleRemoveParticipant(participant)}
                      disabled={removingUserId === participant.userId}
                      className="inline-flex items-center justify-center rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-sm font-semibold text-rose-200 transition hover:bg-rose-500/20 disabled:opacity-50"
                    >
                      {removingUserId === participant.userId ? "Removing..." : "Remove for policy violation"}
                    </button>
                  ) : (
                    <span className="rounded-xl border border-gray-800 bg-gray-900 px-4 py-2 text-xs font-semibold text-gray-500">
                      Removal locked after start
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="space-y-6">
          <section className="rounded-2xl border border-gray-800 bg-gray-900/70 p-6">
            <h2 className="text-lg font-bold text-white">Round Progress</h2>
            <div className="mt-6 space-y-3">
              {detail.rounds.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-gray-800 px-4 py-8 text-center text-sm text-gray-500">
                  The tournament has not started yet.
                </div>
              ) : (
                detail.rounds.map((round) => {
                  const roundMatches = detail.matches.filter((match) => match.roundId === round.id);
                  const doneCount = roundMatches.filter((match) => match.status === "COMPLETED" || match.status === "BYE").length;
                  return (
                    <div key={round.id} className="rounded-2xl border border-gray-800 bg-black/20 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold text-white">Round {round.roundNumber}</p>
                          <p className="mt-1 text-xs text-gray-400">{doneCount}/{roundMatches.length} matches resolved</p>
                        </div>
                        <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${badgeClass(round.status)}`}>
                          {pretty(round.status)}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-gray-800 bg-gray-900/70 p-6">
            <h2 className="text-lg font-bold text-white">Current Round Matches</h2>
            <div className="mt-6 space-y-3">
              {matchesInCurrentRound.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-gray-800 px-4 py-8 text-center text-sm text-gray-500">
                  No matches in the current round yet.
                </div>
              ) : (
                matchesInCurrentRound.map((match) => (
                  <div key={match.id} className="rounded-2xl border border-gray-800 bg-black/20 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="space-y-2">
                        <p className="font-semibold text-white">{match.player1Id ?? "BYE"} vs {match.player2Id ?? "BYE"}</p>
                        <div className="flex flex-wrap gap-2 text-xs text-gray-300">
                          <span className="rounded-full bg-white/5 px-3 py-1.5">Games {match.gamesPlayed}</span>
                          <span className="rounded-full bg-white/5 px-3 py-1.5">Score {match.player1Wins}-{match.player2Wins}</span>
                          {match.currentGameId && (
                            <span className="rounded-full bg-white/5 px-3 py-1.5">Current game {match.currentGameId}</span>
                          )}
                        </div>
                      </div>
                      <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${badgeClass(match.status)}`}>
                        {pretty(match.status)}
                      </span>
                    </div>
                    {match.result && (
                      <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-200">
                        {pretty(match.result)}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}
