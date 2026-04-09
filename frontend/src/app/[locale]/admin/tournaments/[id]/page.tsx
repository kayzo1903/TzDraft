"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, Link } from "@/i18n/routing";
import { useParams } from "next/navigation";
import { AlertTriangle, Crown, EyeOff, Eye, Loader2, RefreshCw, Trash2, Trophy } from "lucide-react";
import {
  tournamentService,
  type Tournament,
  type TournamentDetail,
  type TournamentMatch,
  type TournamentParticipant,
  type TournamentScope,
  type TournamentStyle,
  type PrizeCurrency,
} from "@/services/tournament.service";
import { REPOST_DRAFT_STORAGE_KEY, buildRepostFormState } from "../tournament-admin.utils";

interface PrizeEntry {
  placement: number;
  amount: string;
  currency: PrizeCurrency;
  label: string;
}

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
    prizes: (tournament.prizes ?? []).map((p) => ({
      placement: p.placement,
      amount: `${p.amount}`,
      currency: p.currency as PrizeCurrency,
      label: p.label ?? "",
    })) as PrizeEntry[],
    roundDurationDays: tournament.roundDurationMinutes ? Math.floor(tournament.roundDurationMinutes / 1440).toString() : "0",
    roundDurationHours: tournament.roundDurationMinutes ? Math.floor((tournament.roundDurationMinutes % 1440) / 60).toString() : "0",
    roundDurationMinutes: tournament.roundDurationMinutes ? (tournament.roundDurationMinutes % 60).toString() : "0",
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

function participantDisplayName(participant: TournamentParticipant | undefined | null) {
  if (!participant) return "Unknown player";
  return participant.displayName || participant.username || participant.userId.slice(0, 8);
}

function participantHandle(participant: TournamentParticipant | undefined | null) {
  if (!participant) return null;
  return participant.username ? `@${participant.username}` : null;
}

function playerNameFromId(
  playerId: string | null,
  participantsById: Map<string, TournamentParticipant>,
) {
  if (!playerId) return "BYE";
  const participant = participantsById.get(playerId);
  return participant ? participantDisplayName(participant) : playerId;
}

function sortParticipants(participants: TournamentParticipant[]) {
  return [...participants].sort((left, right) => {
    const leftSeed = left.seed ?? Number.MAX_SAFE_INTEGER;
    const rightSeed = right.seed ?? Number.MAX_SAFE_INTEGER;
    if (leftSeed !== rightSeed) return leftSeed - rightSeed;
    if (right.eloAtSignup !== left.eloAtSignup) return right.eloAtSignup - left.eloAtSignup;
    return participantDisplayName(left).localeCompare(participantDisplayName(right));
  });
}

type ConfirmDialogProps = {
  title: string;
  message: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
};

function ConfirmDialog({
  title,
  message,
  confirmLabel,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-md rounded-3xl border border-rose-500/20 bg-gray-950 p-6 shadow-2xl">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3 text-rose-200">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-white">{title}</h3>
            <p className="text-sm leading-6 text-gray-300">{message}</p>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-gray-700 px-4 py-2 text-sm font-semibold text-gray-300 transition hover:border-gray-500 hover:text-white"
          >
            Keep as is
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-sm font-semibold text-rose-200 transition hover:border-rose-400/50 hover:text-white"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
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
  const router = useRouter();
  const { locale, id } = useParams<{ locale: string; id: string }>();
  const [detail, setDetail] = useState<TournamentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);
  const [resolvingMatchId, setResolvingMatchId] = useState<string | null>(null);
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
    hidden: false,
    prizes: [],
    currentRound: 0,
    roundDurationMinutes: 10080,
  }));
  const [savingEdit, setSavingEdit] = useState(false);
  const [editDirty, setEditDirty] = useState(false);
  const editDirtyRef = useRef(false);
  const [togglingVisibility, setTogglingVisibility] = useState(false);
  const [deletingTournament, setDeletingTournament] = useState(false);
  const [dialog, setDialog] = useState<{
    title: string;
    message: string;
    confirmLabel: string;
    onConfirm: () => void;
  } | null>(null);

  const loadTournament = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const data = await tournamentService.get(id);
      setDetail(data);
      // Use ref so this callback doesn't re-create on every edit keystroke
      if (!editDirtyRef.current || !isRefresh) {
        setEditForm(buildEditForm(data.tournament));
        setEditDirty(false);
        editDirtyRef.current = false;
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Failed to load tournament.");
    } finally {
      if (isRefresh) setRefreshing(false);
      else setLoading(false);
    }
  }, [id]); // no longer depends on editDirty — ref is used instead

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
  const participantsById = useMemo(
    () => new Map((detail?.participants ?? []).map((participant) => [participant.userId, participant])),
    [detail?.participants],
  );
  const sortedParticipants = useMemo(
    () => sortParticipants(detail?.participants ?? []),
    [detail?.participants],
  );
  const winnerName = useMemo(() => {
    if (!championId) return null;
    return participantDisplayName(participantsById.get(championId));
  }, [championId, participantsById]);

  const matchesInCurrentRound = useMemo(() => {
    if (!detail || roundNumber === 0) return [] as TournamentMatch[];
    const roundId = detail.rounds.find((round) => round.roundNumber === roundNumber)?.id;
    return detail.matches.filter((match) => match.roundId === roundId);
  }, [detail, roundNumber]);

  const canEditBeforeStart =
    detail?.tournament.status === "DRAFT" || detail?.tournament.status === "REGISTRATION";
  const canSaveEdits = canEditBeforeStart;
  const canCancelBeforeStart = canEditBeforeStart;
  const closeDialog = () => setDialog(null);

  const handleRepost = () => {
    if (!detail) return;
    localStorage.setItem(
      REPOST_DRAFT_STORAGE_KEY,
      JSON.stringify({
        sourceTournamentId: detail.tournament.id,
        sourceTournamentName: detail.tournament.name,
        form: buildRepostFormState(detail.tournament),
      }),
    );
    router.push("/admin/tournaments#publish");
  };

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

  const handleCancelTournament = async () => {
    if (!detail || !canCancelBeforeStart) return;
    setActionError(null);
    setActionSuccess(null);
    try {
      await tournamentService.cancel(detail.tournament.id);
      setActionSuccess(
        locale === "sw"
          ? "Mashindano yameghairiwa kabla ya kuanza."
          : "Tournament cancelled before start.",
      );
      await loadTournament(true);
    } catch (err: any) {
      setActionError(err?.response?.data?.message || err?.message || "Failed to cancel tournament.");
    }
  };

  const confirmStart = () => {
    if (!detail) return;
    setDialog({
      title: locale === "sw" ? "Anza mashindano?" : "Start tournament?",
      message:
        locale === "sw"
          ? `Hii itaanza mashindano mara moja kwa wachezaji ${detail.participants.length} waliojisajili. Haiwezekani kubatilisha baada ya kuanza.`
          : `This will immediately start the tournament for ${detail.participants.length} registered participant${detail.participants.length === 1 ? "" : "s"}. This cannot be undone.`,
      confirmLabel: locale === "sw" ? "Ndiyo, anza" : "Yes, start tournament",
      onConfirm: () => {
        closeDialog();
        void handleStart();
      },
    });
  };

  const confirmCancelTournament = () => {
    if (!detail || !canCancelBeforeStart) return;
    setDialog({
      title: locale === "sw" ? "Ghairi mashindano?" : "Cancel tournament?",
      message:
        locale === "sw"
          ? "Hii itasitisha mashindano haya kabla ya kuanza. Hakikisha una uhakika kabla ya kuendelea."
          : "This will cancel the tournament before it starts. Please confirm before continuing.",
      confirmLabel: locale === "sw" ? "Ndiyo, ghairi" : "Yes, cancel tournament",
      onConfirm: () => {
        closeDialog();
        void handleCancelTournament();
      },
    });
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

  const confirmRemoveParticipant = (participant: TournamentParticipant) => {
    setDialog({
      title: locale === "sw" ? "Ondoa mshiriki?" : "Remove participant?",
      message:
        locale === "sw"
          ? `Uko karibu kumuondoa ${participantDisplayName(participant)} kwa ukiukaji wa sera. Hatua hii itafuta usajili wake kwenye mashindano haya.`
          : `You are about to remove ${participantDisplayName(participant)} for a policy violation. This will revoke their tournament spot.`,
      confirmLabel: locale === "sw" ? "Ndiyo, ondoa" : "Yes, remove participant",
      onConfirm: () => {
        closeDialog();
        void handleRemoveParticipant(participant);
      },
    });
  };

  const handleManualResolveMatch = async (
    match: TournamentMatch,
    result: "PLAYER1_WIN" | "PLAYER2_WIN",
  ) => {
    if (!detail) return;
    setActionError(null);
    setActionSuccess(null);
    setResolvingMatchId(match.id);
    try {
      await tournamentService.adminResolveMatch(detail.tournament.id, match.id, result);
      setActionSuccess(
        locale === "sw"
          ? "Mechi imesuluhishwa kwa uamuzi wa admin."
          : "Match resolved by admin override.",
      );
      await loadTournament(true);
    } catch (err: any) {
      setActionError(
        err?.response?.data?.message || err?.message || "Failed to resolve match manually.",
      );
    } finally {
      setResolvingMatchId(null);
    }
  };

  const confirmManualResolveMatch = (
    match: TournamentMatch,
    result: "PLAYER1_WIN" | "PLAYER2_WIN",
  ) => {
    const awardedPlayerId = result === "PLAYER1_WIN" ? match.player1Id : match.player2Id;
    const awardedName = playerNameFromId(awardedPlayerId, participantsById);
    setDialog({
      title: locale === "sw" ? "Thibitisha matokeo ya admin?" : "Confirm manual result?",
      message:
        locale === "sw"
          ? `Hii itampa ushindi ${awardedName} na kuendeleza bracket ikiwa mechi hii ndiyo iliyokuwa inasubiriwa.`
          : `This will award the match to ${awardedName} and advance the bracket if this was the final unresolved match.`,
      confirmLabel: locale === "sw" ? "Ndiyo, weka ushindi" : "Yes, award win",
      onConfirm: () => {
        closeDialog();
        void handleManualResolveMatch(match, result);
      },
    });
  };

  const handleEditChange = (
    field: keyof typeof editForm,
    value: string | TournamentStyle | TournamentScope | PrizeEntry[],
  ) => {
    setEditForm((current) => ({ ...current, [field]: value }));
    editDirtyRef.current = true;
    setEditDirty(true);
  };

  const handleToggleHidden = async () => {
    if (!detail) return;
    setTogglingVisibility(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      await tournamentService.setVisibility(detail.tournament.id, !detail.tournament.hidden);
      setActionSuccess(
        detail.tournament.hidden
          ? locale === "sw" ? "Mashindano yanaonekana tena." : "Tournament is now visible."
          : locale === "sw" ? "Mashindano yamefichwa." : "Tournament is now hidden.",
      );
      await loadTournament(true);
    } catch (err: any) {
      setActionError(err?.response?.data?.message || err?.message || "Failed to update visibility.");
    } finally {
      setTogglingVisibility(false);
    }
  };

  const confirmDeleteTournament = () => {
    if (!detail) return;
    setDialog({
      title: locale === "sw" ? "Futa mashindano?" : "Delete tournament?",
      message:
        locale === "sw"
          ? `Hii itafuta mashindano yote ya "${detail.tournament.name}" ikiwemo raundi, mechi, na washiriki. Haiwezekani kubatilisha.`
          : `This will permanently delete "${detail.tournament.name}" including all rounds, matches, and participants. This cannot be undone.`,
      confirmLabel: locale === "sw" ? "Ndiyo, futa" : "Yes, delete permanently",
      onConfirm: () => {
        closeDialog();
        void handleDeleteTournament();
      },
    });
  };

  const handleDeleteTournament = async () => {
    if (!detail) return;
    setDeletingTournament(true);
    setActionError(null);
    try {
      await tournamentService.deleteTournament(detail.tournament.id);
      router.push("/admin/tournaments");
    } catch (err: any) {
      setActionError(err?.response?.data?.message || err?.message || "Failed to delete tournament.");
      setDeletingTournament(false);
    }
  };

  const handleSaveTournament = async () => {
    if (!detail || (canEditBeforeStart && !editForm.scheduledStartAt) || !canSaveEdits) return;
    setActionError(null);
    setActionSuccess(null);
    setSavingEdit(true);
    try {
      const prizes = (editForm.prizes as PrizeEntry[])
        .filter((p) => p.amount.trim() !== "")
        .map((p) => ({
          placement: p.placement,
          amount: Number(p.amount),
          currency: p.currency,
          label: p.label.trim() || undefined,
        }));

      const payload = canEditBeforeStart
        ? {
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
            prizes,
          }
        : {
            name: editForm.name.trim(),
            descriptionEn: editForm.descriptionEn.trim(),
            descriptionSw: editForm.descriptionSw.trim(),
            rulesEn: editForm.rulesEn.trim() ? editForm.rulesEn.trim() : null,
            rulesSw: editForm.rulesSw.trim() ? editForm.rulesSw.trim() : null,
          };

      await tournamentService.update(detail.tournament.id, payload);
      setEditDirty(false);
      editDirtyRef.current = false;
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
        <Link href="/admin/tournaments" className="text-sm text-amber-300 underline underline-offset-2">
          Back to tournaments
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {dialog && (
        <ConfirmDialog
          title={dialog.title}
          message={dialog.message}
          confirmLabel={dialog.confirmLabel}
          onCancel={closeDialog}
          onConfirm={dialog.onConfirm}
        />
      )}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-4">
          <Link href="/admin/tournaments" className="text-sm text-amber-300 underline underline-offset-2">
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
              onClick={confirmStart}
              className="inline-flex items-center justify-center rounded-xl bg-amber-400 px-4 py-2.5 text-sm font-bold text-gray-950 transition hover:bg-amber-300"
            >
              Start tournament
            </button>
          )}
          {canCancelBeforeStart && (
            <button
              type="button"
              onClick={confirmCancelTournament}
              className="inline-flex items-center justify-center rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-sm font-semibold text-rose-200 transition hover:border-rose-400/50 hover:text-white"
            >
              Cancel tournament
            </button>
          )}
          {!canEditBeforeStart && (
            <button
              type="button"
              onClick={handleRepost}
              className="inline-flex items-center justify-center rounded-xl border border-sky-500/30 bg-sky-500/10 px-4 py-2.5 text-sm font-semibold text-sky-200 transition hover:border-sky-400/50 hover:text-white"
            >
              Repost as new tournament
            </button>
          )}
          <button
            type="button"
            onClick={handleToggleHidden}
            disabled={togglingVisibility}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-700 px-4 py-2.5 text-sm font-semibold text-gray-300 transition hover:border-gray-500 hover:text-white disabled:opacity-50"
          >
            {detail.tournament.hidden
              ? <><Eye className="h-4 w-4" /> Unhide</>
              : <><EyeOff className="h-4 w-4" /> Hide</>
            }
          </button>
          <button
            type="button"
            onClick={confirmDeleteTournament}
            disabled={deletingTournament || detail.tournament.status === "ACTIVE"}
            title={detail.tournament.status === "ACTIVE" ? "Cancel the tournament before deleting" : undefined}
            className="inline-flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-sm font-semibold text-rose-200 transition hover:border-rose-400/50 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" />
            {deletingTournament ? "Deleting..." : "Delete"}
          </button>
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
          { label: "Winner", value: winnerName ?? "Pending" },
        ].map((item) => (
          <div key={item.label} className="rounded-2xl border border-gray-800 bg-gray-900/70 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">{item.label}</p>
            <p className="mt-4 break-all text-2xl font-black text-white">{item.value}</p>
          </div>
        ))}
      </section>

      <section id="edit-tournament" className="scroll-mt-24 rounded-2xl border border-gray-800 bg-gray-900/70 p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">
              {locale === "sw" ? "Hariri mashindano" : "Edit tournament"}
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-gray-400">
              {canEditBeforeStart
                ? locale === "sw"
                  ? "Unaweza kusahihisha jina, maelezo, mipaka ya wachezaji na ratiba kabla mashindano hayajaanza."
                  : "You can fix the name, descriptions, player limits, and timing before the tournament starts."
                : locale === "sw"
                  ? "Mashindano yaliyoanza au yaliyokamilika hayahaririwi moja kwa moja. Tumia repost kuunda toleo jipya lenye sheria zilezile."
                  : "Started or completed tournaments are not edited in place. Use repost to create a fresh tournament with the same rules."}
            </p>
          </div>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-gray-300">
            {canEditBeforeStart
              ? locale === "sw"
                ? "Uhariri kamili umefunguliwa"
                : "Full editing available"
              : locale === "sw"
                ? "Tumia repost"
                : "Use repost"}
          </span>
        </div>
        <p className="mt-4 text-xs text-gray-500">
          {canEditBeforeStart
            ? locale === "sw"
              ? "Kabla mashindano hayajaanza unaweza kubadilisha ratiba, mipaka ya wachezaji, upeo na maelezo."
              : "Before the tournament starts you can update schedule, player limits, scope, and descriptions."
            : locale === "sw"
              ? "Hali hii imefungwa kwa uhariri. Badala yake, repost itapakia sheria na mipangilio yake kwenye fomu ya mashindano mapya."
              : "This state is locked for editing. Repost will load its rules and settings into the new tournament form instead."}
        </p>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <label className="space-y-2 lg:col-span-2">
            <span className="text-sm font-semibold text-white">
              {locale === "sw" ? "Jina la mashindano" : "Tournament name"}
            </span>
            <input
              type="text"
              value={editForm.name}
              onChange={(event) => handleEditChange("name", event.target.value)}
              disabled={!canSaveEdits || savingEdit}
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
              disabled={!canSaveEdits || savingEdit}
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
              disabled={!canSaveEdits || savingEdit}
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
              disabled={!canSaveEdits || savingEdit}
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
              disabled={!canSaveEdits || savingEdit}
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
              disabled={!canEditBeforeStart || savingEdit}
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
              disabled={!canEditBeforeStart || savingEdit}
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
                disabled={!canEditBeforeStart || savingEdit}
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
                disabled={!canEditBeforeStart || savingEdit}
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
              disabled={!canEditBeforeStart || savingEdit}
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
              disabled={!canEditBeforeStart || savingEdit}
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
              disabled={!canEditBeforeStart || savingEdit}
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
              disabled={!canEditBeforeStart || savingEdit}
              className="w-full rounded-xl border border-gray-700 bg-black/30 px-4 py-3 text-sm text-white outline-none transition focus:border-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
            />
            <p className="text-xs text-gray-500">
              {locale === "sw"
                ? `Sasa: ${toReadableDateTime(detail.tournament.registrationDeadline, locale)}`
                : `Current: ${toReadableDateTime(detail.tournament.registrationDeadline, locale)}`}
            </p>
          </label>
        </div>

        <div className="mt-6 rounded-2xl border border-gray-800 bg-black/10 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-white">
                {locale === "sw" ? "Zawadi" : "Prize Pool"}
              </span>
              {canEditBeforeStart && (
                <button
                  type="button"
                  onClick={() =>
                    handleEditChange("prizes", [
                      ...(editForm.prizes as PrizeEntry[]),
                      {
                        placement: (editForm.prizes as PrizeEntry[]).length + 1,
                        amount: "",
                        currency: "TSH" as PrizeCurrency,
                        label: "",
                      },
                    ])
                  }
                  className="inline-flex items-center gap-1 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-200 transition hover:border-emerald-400/50 hover:text-white"
                >
                  + Add placement
                </button>
              )}
            </div>
            {(editForm.prizes as PrizeEntry[]).length === 0 ? (
              <p className="mt-3 text-xs text-gray-500">
                {canEditBeforeStart ? "No prizes set." : "No prizes were set for this tournament."}
              </p>
            ) : (
              <div className="mt-3 space-y-2">
                {(editForm.prizes as PrizeEntry[]).map((prize, idx) => (
                  <div key={prize.placement} className="flex flex-wrap items-center gap-2">
                    <span className="min-w-[52px] text-xs font-semibold text-amber-300">
                      {prize.placement === 1 ? "1st" : prize.placement === 2 ? "2nd" : prize.placement === 3 ? "3rd" : `${prize.placement}th`}
                    </span>
                    <input
                      type="number"
                      min={0}
                      placeholder="Amount"
                      value={prize.amount}
                      disabled={!canEditBeforeStart || savingEdit}
                      onChange={(e) => {
                        const next = (editForm.prizes as PrizeEntry[]).map((p, i) =>
                          i === idx ? { ...p, amount: e.target.value } : p,
                        );
                        handleEditChange("prizes", next);
                      }}
                      className="w-28 rounded-xl border border-gray-700 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-amber-300 disabled:opacity-60"
                    />
                    <select
                      value={prize.currency}
                      disabled={!canEditBeforeStart || savingEdit}
                      onChange={(e) => {
                        const next = (editForm.prizes as PrizeEntry[]).map((p, i) =>
                          i === idx ? { ...p, currency: e.target.value as PrizeCurrency } : p,
                        );
                        handleEditChange("prizes", next);
                      }}
                      className="rounded-xl border border-gray-700 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-amber-300 disabled:opacity-60"
                    >
                      <option value="TSH">TSH</option>
                      <option value="USD">USD</option>
                    </select>
                    <input
                      type="text"
                      placeholder="Label (optional)"
                      value={prize.label}
                      disabled={!canEditBeforeStart || savingEdit}
                      onChange={(e) => {
                        const next = (editForm.prizes as PrizeEntry[]).map((p, i) =>
                          i === idx ? { ...p, label: e.target.value } : p,
                        );
                        handleEditChange("prizes", next);
                      }}
                      className="flex-1 min-w-[100px] rounded-xl border border-gray-700 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-amber-300 disabled:opacity-60"
                    />
                    <button
                      type="button"
                      disabled={!canEditBeforeStart || savingEdit}
                      onClick={() => {
                        const next = (editForm.prizes as PrizeEntry[])
                          .filter((_, i) => i !== idx)
                          .map((p, i) => ({ ...p, placement: i + 1 }));
                        handleEditChange("prizes", next);
                      }}
                      className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-2 py-2 text-xs font-semibold text-rose-300 transition hover:border-rose-400/50 hover:text-white disabled:opacity-50"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleSaveTournament}
            disabled={!canSaveEdits || savingEdit || (canEditBeforeStart && !editForm.scheduledStartAt)}
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
            disabled={!canEditBeforeStart || savingEdit}
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
              sortedParticipants.map((participant) => (
                <div key={participant.userId} className="flex flex-col gap-4 rounded-2xl border border-gray-800 bg-black/20 p-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-3">
                      <div>
                        <p className="font-semibold text-white">{participantDisplayName(participant)}</p>
                        {participantHandle(participant) && (
                          <p className="text-xs text-gray-500">{participantHandle(participant)}</p>
                        )}
                      </div>
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
                      onClick={() => confirmRemoveParticipant(participant)}
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
                        <p className="font-semibold text-white">
                          {playerNameFromId(match.player1Id, participantsById)} vs{" "}
                          {playerNameFromId(match.player2Id, participantsById)}
                        </p>
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
                      {!match.result && detail.tournament.status === "ACTIVE" && match.player1Id && match.player2Id && (
                        <div className="mt-4 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => confirmManualResolveMatch(match, "PLAYER1_WIN")}
                            disabled={resolvingMatchId === match.id}
                            className="inline-flex items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs font-semibold text-amber-200 transition hover:border-amber-400/50 hover:text-white disabled:opacity-50"
                          >
                            {resolvingMatchId === match.id
                              ? "Resolving..."
                              : `Award ${playerNameFromId(match.player1Id, participantsById)}`}
                          </button>
                          <button
                            type="button"
                            onClick={() => confirmManualResolveMatch(match, "PLAYER2_WIN")}
                            disabled={resolvingMatchId === match.id}
                            className="inline-flex items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs font-semibold text-amber-200 transition hover:border-amber-400/50 hover:text-white disabled:opacity-50"
                          >
                            {resolvingMatchId === match.id
                              ? "Resolving..."
                              : `Award ${playerNameFromId(match.player2Id, participantsById)}`}
                          </button>
                          <span className="inline-flex items-center rounded-xl border border-gray-800 bg-gray-900 px-3 py-2 text-[11px] font-medium text-gray-400">
                            Manual result entry for stuck matches
                          </span>
                        </div>
                      )}
	                  </div>
	                ))
              )}
	            </div>
	          </section>

            <section className="rounded-2xl border border-gray-800 bg-gray-900/70 p-6">
              <h2 className="text-lg font-bold text-white">Full Tournament Timetable</h2>
              <p className="mt-1 text-sm text-gray-400">
                Once the tournament starts, every round and match appears here for admin review.
              </p>
              <div className="mt-6 space-y-4">
                {detail.rounds.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-gray-800 px-4 py-8 text-center text-sm text-gray-500">
                    The timetable will appear after Round 1 is created.
                  </div>
                ) : (
                  detail.rounds.map((round) => {
                    const roundMatches = detail.matches.filter((match) => match.roundId === round.id);
                    return (
                      <div key={round.id} className="rounded-2xl border border-gray-800 bg-black/20 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="font-semibold text-white">Round {round.roundNumber}</p>
                            <p className="mt-1 text-xs text-gray-400">
                              Started: {toReadableDateTime(round.startedAt, locale)}
                            </p>
                          </div>
                          <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${badgeClass(round.status)}`}>
                            {pretty(round.status)}
                          </span>
                        </div>

                        <div className="mt-4 space-y-3">
                          {roundMatches.length === 0 ? (
                            <div className="rounded-xl border border-dashed border-gray-800 px-4 py-6 text-center text-xs text-gray-500">
                              No matches have been created for this round yet.
                            </div>
                          ) : (
                            roundMatches.map((match) => (
                              <div key={match.id} className="rounded-xl border border-gray-800 bg-gray-950/70 px-4 py-3">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                  <div className="space-y-1">
                                    <p className="text-sm font-semibold text-white">
                                      {playerNameFromId(match.player1Id, participantsById)} vs{" "}
                                      {playerNameFromId(match.player2Id, participantsById)}
                                    </p>
                                    <div className="flex flex-wrap gap-2 text-[11px] text-gray-400">
                                      <span className="rounded-full bg-white/5 px-3 py-1">Score {match.player1Wins}-{match.player2Wins}</span>
                                      <span className="rounded-full bg-white/5 px-3 py-1">Games {match.gamesPlayed}</span>
                                      <span className="rounded-full bg-white/5 px-3 py-1">Started {toReadableDateTime(match.startedAt, locale)}</span>
                                      <span className="rounded-full bg-white/5 px-3 py-1">Finished {toReadableDateTime(match.completedAt, locale)}</span>
                                    </div>
                                  </div>
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${badgeClass(match.status)}`}>
                                      {pretty(match.status)}
                                    </span>
                                    {match.result && (
                                      <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-200">
                                        {pretty(match.result)}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </section>
	        </div>
	      </section>
	    </div>
	  );
	}
