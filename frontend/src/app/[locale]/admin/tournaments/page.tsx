"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Eye,
  EyeOff,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  Trophy,
} from "lucide-react";
import { tournamentService, type Tournament, type TournamentStatus } from "@/services/tournament.service";
import { REPOST_DRAFT_STORAGE_KEY, buildRepostFormState } from "./tournament-admin.utils";

function tournamentStatusClassName(status: TournamentStatus) {
  const tone = {
    REGISTRATION: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
    ACTIVE: "border-sky-400/30 bg-sky-400/10 text-sky-200",
    COMPLETED: "border-white/10 bg-white/5 text-neutral-300",
    CANCELLED: "border-rose-400/30 bg-rose-400/10 text-rose-200",
    DRAFT: "border-amber-400/30 bg-amber-400/10 text-amber-200",
  } as const;
  return tone[status];
}

function prettyFormat(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default function AdminTournamentsPage() {
  const { locale } = useParams<{ locale: string }>();
  const router = useRouter();
  
  const [tournaments, setTournaments] = useState<Tournament[]>(() => {
    try {
      const cached = localStorage.getItem("admin_tournaments_cache");
      return cached ? (JSON.parse(cached) as Tournament[]) : [];
    } catch {
      return [];
    }
  });
  const [loadingTournaments, setLoadingTournaments] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<Tournament | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const loadTournaments = useCallback(async () => {
    setLoadingTournaments(true);
    setListError(null);
    try {
      const data = await tournamentService.listAdmin();
      const sorted = [...data].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
      setTournaments(sorted);
      try { localStorage.setItem("admin_tournaments_cache", JSON.stringify(sorted)); } catch { /* quota exceeded */ }
    } catch (err: any) {
      setListError(err?.response?.data?.message || err?.message || "Failed to load tournaments.");
    } finally {
      setLoadingTournaments(false);
    }
  }, []);

  const handleToggleHidden = async (tournament: Tournament) => {
    setTogglingId(tournament.id);
    try {
      await tournamentService.setVisibility(tournament.id, !tournament.hidden);
      await loadTournaments();
    } catch {
      // silently fail — user can retry
    } finally {
      setTogglingId(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteDialog) return;
    setDeletingId(deleteDialog.id);
    setDeleteDialog(null);
    try {
      await tournamentService.deleteTournament(deleteDialog.id);
      await loadTournaments();
    } catch {
      // silently fail
    } finally {
      setDeletingId(null);
    }
  };

  useEffect(() => {
    loadTournaments();
  }, [loadTournaments]);

  const handleRepostTournament = (tournament: Tournament) => {
    const repostForm = buildRepostFormState(tournament);
    localStorage.setItem(
      REPOST_DRAFT_STORAGE_KEY,
      JSON.stringify({
        sourceTournamentName: tournament.name,
        form: repostForm,
      })
    );
    router.push(`/${locale}/admin/tournament/add`);
  };

  return (
    <div className="space-y-6">
      {deleteDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-md rounded-3xl border border-rose-500/20 bg-gray-950 p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white">Delete tournament?</h3>
            <p className="mt-2 text-sm leading-6 text-gray-300">
              <span className="font-semibold text-white">{deleteDialog.name}</span> will be permanently deleted including all rounds, matches, and participants. This cannot be undone.
            </p>
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button type="button" onClick={() => setDeleteDialog(null)} className="rounded-xl border border-gray-700 px-4 py-2 text-sm font-semibold text-gray-300 transition hover:border-gray-500 hover:text-white">
                Cancel
              </button>
              <button type="button" onClick={handleConfirmDelete} className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-sm font-semibold text-rose-200 transition hover:border-rose-400/50 hover:text-white">
                Yes, delete permanently
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Page header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-400" />
            <h1 className="text-2xl font-black text-white">Tournament Admin</h1>
          </div>
          <p className="mt-1 text-sm text-gray-400">
            {tournaments.length} tournament{tournaments.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={loadTournaments}
            disabled={loadingTournaments}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-700 px-4 py-2 text-sm font-semibold text-gray-300 transition hover:border-gray-500 hover:text-white disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loadingTournaments ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <Link
            href={`/${locale}/admin/tournament/add`}
            className="inline-flex items-center gap-2 rounded-xl bg-amber-400 px-5 py-2.5 text-sm font-bold text-gray-950 transition hover:bg-amber-300"
          >
            <Plus className="h-4 w-4" />
            New Tournament
          </Link>
        </div>
      </div>

      {/* Tournament list */}
      <section className="space-y-4">
        {listError && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{listError}</div>
        )}
        <div className="grid gap-4">
          {tournaments.length === 0 && !loadingTournaments ? (
            <div className="rounded-2xl border border-dashed border-gray-800 px-4 py-12 text-center text-sm text-gray-500">No tournaments yet. Click &quot;New Tournament&quot; to create one.</div>
          ) : (
            tournaments.map((tournament) => (
              <div
                key={tournament.id}
                className={`relative flex flex-col gap-4 rounded-2xl border p-5 lg:flex-row lg:items-center lg:justify-between transition ${
                  tournament.hidden
                    ? "border-gray-700 bg-gray-950/60 opacity-70"
                    : "border-gray-800 bg-black/20"
                }`}
              >
                <Link
                  href={`/${locale}/admin/tournaments/${tournament.id}`}
                  className="absolute inset-0 rounded-2xl"
                  aria-label={`Open ${tournament.name}`}
                />
                <div className="relative z-10 space-y-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="text-lg font-bold text-white">{tournament.name}</h3>
                    <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${tournamentStatusClassName(tournament.status)}`}>
                      {prettyFormat(tournament.status)}
                    </span>
                    {tournament.hidden && (
                      <span className="rounded-full border border-gray-600 bg-gray-800 px-3 py-1 text-xs font-semibold text-gray-400">
                        Hidden
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs text-gray-300">
                    <span className="rounded-full bg-white/5 px-3 py-1.5">{prettyFormat(tournament.format)}</span>
                    <span className="rounded-full bg-white/5 px-3 py-1.5">{tournament.style}</span>
                    <span className="rounded-full bg-white/5 px-3 py-1.5">{tournament.maxPlayers} players</span>
                    {tournament.prizes.length > 0 && (
                      <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1.5 text-amber-300">
                        {tournament.prizes.length} prize{tournament.prizes.length !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                </div>
                <div className="relative z-10 flex flex-wrap gap-2">
                  <Link
                    href={`/${locale}/admin/tournaments/${tournament.id}`}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-amber-400 px-4 py-2 text-sm font-bold text-gray-950 transition hover:bg-amber-300"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Manage
                  </Link>
                  {(tournament.status !== "DRAFT" && tournament.status !== "REGISTRATION") && (
                    <button
                      type="button"
                      onClick={(e) => { e.preventDefault(); handleRepostTournament(tournament); }}
                      className="inline-flex items-center justify-center rounded-xl border border-sky-500/30 bg-sky-500/10 px-4 py-2 text-sm font-semibold text-sky-200 transition hover:border-sky-400/50 hover:text-white"
                    >
                      Repost
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={togglingId === tournament.id}
                    onClick={(e) => { e.preventDefault(); void handleToggleHidden(tournament); }}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-gray-700 px-4 py-2 text-sm font-semibold text-gray-300 transition hover:border-gray-500 hover:text-white disabled:opacity-50"
                  >
                    {tournament.hidden ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                    {tournament.hidden ? "Unhide" : "Hide"}
                  </button>
                  <button
                    type="button"
                    disabled={deletingId === tournament.id}
                    onClick={(e) => { e.preventDefault(); setDeleteDialog(tournament); }}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-sm font-semibold text-rose-200 transition hover:border-rose-400/50 hover:text-white disabled:opacity-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {deletingId === tournament.id ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
