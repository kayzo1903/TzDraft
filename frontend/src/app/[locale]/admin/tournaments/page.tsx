"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  CalendarDays,
  CheckCircle2,
  RefreshCw,
  ShieldCheck,
  Trophy,
  Users,
} from "lucide-react";
import { tournamentService, type Tournament, type TournamentStatus } from "@/services/tournament.service";
import { REPOST_DRAFT_STORAGE_KEY, buildRepostFormState } from "./tournament-admin.utils";
import { z } from "zod";

type TournamentStyle = "BLITZ" | "RAPID" | "CLASSICAL" | "UNLIMITED";
type TournamentScope = "GLOBAL" | "COUNTRY" | "REGION";

interface FormState {
  name: string;
  descriptionEn: string;
  descriptionSw: string;
  rulesEn: string;
  rulesSw: string;
  style: TournamentStyle;
  scope: TournamentScope;
  country: string;
  region: string;
  maxPlayers: string;
  minPlayers: string;
  scheduledStartDate: string;
  scheduledStartTime: string;
  registrationDeadlineDate: string;
  registrationDeadlineTime: string;
  minElo: string;
  maxElo: string;
  minMatchmakingWins: string;
  minAiLevelBeaten: string;
  requiredAiLevelPlayed: string;
}

type FormErrorKey = keyof FormState | "scheduledStartAt" | "registrationDeadline";
type FormErrors = Partial<Record<FormErrorKey, string>>;

const initialState: FormState = {
  name: "",
  descriptionEn: "",
  descriptionSw: "",
  rulesEn: "",
  rulesSw: "",
  style: "RAPID",
  scope: "GLOBAL",
  country: "",
  region: "",
  maxPlayers: "8",
  minPlayers: "4",
  scheduledStartDate: "",
  scheduledStartTime: "",
  registrationDeadlineDate: "",
  registrationDeadlineTime: "",
  minElo: "",
  maxElo: "",
  minMatchmakingWins: "",
  minAiLevelBeaten: "",
  requiredAiLevelPlayed: "",
};


const tournamentFormSchema = z
  .object({
    name: z.string().trim().min(3, "Tournament name must be at least 3 characters."),
    descriptionEn: z.string().trim().min(10, "English description must be at least 10 characters."),
    descriptionSw: z.string().trim().min(10, "Swahili description must be at least 10 characters."),
    rulesEn: z.string(),
    rulesSw: z.string(),
    style: z.enum(["BLITZ", "RAPID", "CLASSICAL", "UNLIMITED"]),
    scope: z.enum(["GLOBAL", "COUNTRY", "REGION"]),
    country: z.string(),
    region: z.string(),
    maxPlayers: z.string(),
    minPlayers: z.string(),
    scheduledStartDate: z.string(),
    scheduledStartTime: z.string(),
    registrationDeadlineDate: z.string(),
    registrationDeadlineTime: z.string(),
    minElo: z.string(),
    maxElo: z.string(),
    minMatchmakingWins: z.string(),
    minAiLevelBeaten: z.string(),
    requiredAiLevelPlayed: z.string(),
  })
  .superRefine((data, ctx) => {
    const maxPlayers = Number(data.maxPlayers);
    const minPlayers = Number(data.minPlayers);

    if (!Number.isFinite(maxPlayers) || maxPlayers < 4 || maxPlayers > 32) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["maxPlayers"],
        message: "Max players must be between 4 and 32.",
      });
    }

    if (!Number.isFinite(minPlayers) || minPlayers < 4) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["minPlayers"],
        message: "Min players must be at least 4.",
      });
    }

    if (Number.isFinite(minPlayers) && Number.isFinite(maxPlayers) && minPlayers > maxPlayers) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["minPlayers"],
        message: "Min players cannot be greater than max players.",
      });
    }

    if (data.scope !== "GLOBAL" && !data.country.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["country"],
        message: "Country is required for COUNTRY and REGION tournaments.",
      });
    }

    if (data.scope === "REGION" && !data.region.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["region"],
        message: "Region is required when scope is REGION.",
      });
    }

    if (data.minElo && data.maxElo && Number(data.minElo) > Number(data.maxElo)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["maxElo"],
        message: "Maximum ELO must be greater than or equal to minimum ELO.",
      });
    }

    const scheduledStartAt = combineLocalDateTime(data.scheduledStartDate, data.scheduledStartTime);
    const registrationDeadline = combineLocalDateTime(
      data.registrationDeadlineDate,
      data.registrationDeadlineTime,
    );

    if (!scheduledStartAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["scheduledStartAt"],
        message: "Set both a start date and start time.",
      });
    }

    const hasRegistrationDate = data.registrationDeadlineDate.trim().length > 0;
    const hasRegistrationTime = data.registrationDeadlineTime.trim().length > 0;

    if (hasRegistrationDate !== hasRegistrationTime) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["registrationDeadline"],
        message: "Set both a registration closing date and time, or leave both blank.",
      });
    }

    if (registrationDeadline && scheduledStartAt) {
      const registration = new Date(registrationDeadline).getTime();
      const scheduled = new Date(scheduledStartAt).getTime();
      if (Number.isFinite(registration) && Number.isFinite(scheduled) && registration > scheduled) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["registrationDeadline"],
          message: "Registration deadline must be before the scheduled start.",
        });
      }
    }
  });

function toOptionalNumber(value: string): number | undefined {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function inputClassName() {
  return "w-full rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 text-sm text-white placeholder:text-gray-500 focus:border-amber-400 focus:outline-none";
}

function textareaClassName() {
  return "w-full min-h-32 rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 text-sm text-white placeholder:text-gray-500 focus:border-amber-400 focus:outline-none";
}

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

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-rose-300">{message}</p>;
}

function FieldTooltip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  return (
    <span ref={ref} className="relative inline-flex items-center align-middle">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="ml-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full border border-gray-600 text-[10px] font-bold text-gray-400 transition hover:border-amber-400 hover:text-amber-300"
        aria-label="More information"
      >
        ?
      </button>
      {open && (
        <span className="absolute left-5 top-1/2 z-30 -translate-y-1/2 w-64 rounded-xl border border-gray-700 bg-gray-950 px-3 py-2.5 text-xs leading-relaxed text-gray-300 shadow-2xl shadow-black/60">
          {text}
        </span>
      )}
    </span>
  );
}

function combineLocalDateTime(date: string, time: string) {
  if (!date.trim() && !time.trim()) return "";
  if (!date.trim() || !time.trim()) return null;
  return `${date}T${time}`;
}

function TimePickerField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <input
      type="time"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={inputClassName()}
    />
  );
}

function formatLocalDateTime(value: string) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "full",
    timeStyle: "short",
  }).format(date);
}

export default function AdminTournamentsPage() {
  const { locale } = useParams<{ locale: string }>();
  const [form, setForm] = useState<FormState>(initialState);
  const [fieldErrors, setFieldErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [repostSourceName, setRepostSourceName] = useState<string | null>(null);
  const [tournaments, setTournaments] = useState<Tournament[]>(() => {
    try {
      const cached = localStorage.getItem("admin_tournaments_cache");
      return cached ? (JSON.parse(cached) as Tournament[]) : [];
    } catch {
      return [];
    }
  });
  const [loadingTournaments, setLoadingTournaments] = useState(false);
  const scheduledStartValue = useMemo(
    () => combineLocalDateTime(form.scheduledStartDate, form.scheduledStartTime),
    [form.scheduledStartDate, form.scheduledStartTime],
  );
  const registrationDeadlineValue = useMemo(
    () => combineLocalDateTime(form.registrationDeadlineDate, form.registrationDeadlineTime),
    [form.registrationDeadlineDate, form.registrationDeadlineTime],
  );
  const scheduledStartPreview = useMemo(
    () => formatLocalDateTime(typeof scheduledStartValue === "string" ? scheduledStartValue : ""),
    [scheduledStartValue],
  );
  const registrationDeadlinePreview = useMemo(
    () =>
      formatLocalDateTime(
        typeof registrationDeadlineValue === "string" ? registrationDeadlineValue : "",
      ),
    [registrationDeadlineValue],
  );
  const unmetSubmitRequirements = useMemo(() => {
    const missing: string[] = [];

    if (form.name.trim().length < 3) {
      missing.push("Tournament name must be at least 3 characters.");
    }

    if (form.descriptionEn.trim().length < 10) {
      missing.push("English description must be at least 10 characters.");
    }

    if (form.descriptionSw.trim().length < 10) {
      missing.push("Swahili description must be at least 10 characters.");
    }

    if (!form.scheduledStartDate.trim()) {
      missing.push("Pick a tournament start date.");
    }

    if (!form.scheduledStartTime.trim()) {
      missing.push("Pick a tournament start time.");
    }

    if (Number(form.maxPlayers) < 4) {
      missing.push("Maximum players must be at least 4.");
    }

    if (Number(form.minPlayers) < 4) {
      missing.push("Minimum players must be at least 4.");
    }

    return missing;
  }, [form]);

  const canSubmit = useMemo(() => {
    return unmetSubmitRequirements.length === 0;
  }, [unmetSubmitRequirements]);

  const loadTournaments = useCallback(async () => {
    setLoadingTournaments(true);
    try {
      const data = await tournamentService.list();
      const sorted = [...data].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
      setTournaments(sorted);
      try { localStorage.setItem("admin_tournaments_cache", JSON.stringify(sorted)); } catch { /* quota exceeded */ }
    } finally {
      setLoadingTournaments(false);
    }
  }, []);

  useEffect(() => {
    loadTournaments();
  }, [loadTournaments]);

  useEffect(() => {
    try {
      const rawDraft = localStorage.getItem(REPOST_DRAFT_STORAGE_KEY);
      if (!rawDraft) return;
      const parsed = JSON.parse(rawDraft) as { sourceTournamentName?: string; form?: FormState };
      if (parsed.form) {
        setForm(parsed.form);
        setFieldErrors({});
        setError(null);
        setCreatedId(null);
        setRepostSourceName(parsed.sourceTournamentName ?? "previous tournament");
        localStorage.removeItem(REPOST_DRAFT_STORAGE_KEY);
        window.location.hash = "publish";
      }
    } catch {
      localStorage.removeItem(REPOST_DRAFT_STORAGE_KEY);
    }
  }, []);

  const updateField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => ({ ...prev, [key]: undefined }));
    if (key === "scheduledStartDate" || key === "scheduledStartTime") {
      setFieldErrors((prev) => ({ ...prev, scheduledStartAt: undefined }));
    }
    if (key === "registrationDeadlineDate" || key === "registrationDeadlineTime") {
      setFieldErrors((prev) => ({ ...prev, registrationDeadline: undefined }));
    }
  };

  const handleRepostTournament = (tournament: Tournament) => {
    const repostForm = buildRepostFormState(tournament);
    setForm(repostForm);
    setFieldErrors({});
    setError(null);
    setCreatedId(null);
    setRepostSourceName(tournament.name);
    window.location.hash = "publish";
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setCreatedId(null);
    setFieldErrors({});

    const parsed = tournamentFormSchema.safeParse(form);
    if (!parsed.success) {
      const nextErrors: FormErrors = {};
      const flattened = parsed.error.flatten().fieldErrors;
      for (const [key, value] of Object.entries(flattened)) {
        if (value?.[0]) {
          nextErrors[key as keyof FormState] = value[0];
        }
      }
      setFieldErrors(nextErrors);
      setSubmitting(false);
      return;
    }

    const values = parsed.data;
    const scheduledStartAt = combineLocalDateTime(
      values.scheduledStartDate,
      values.scheduledStartTime,
    );
    const registrationDeadline = combineLocalDateTime(
      values.registrationDeadlineDate,
      values.registrationDeadlineTime,
    );

    try {
      const created = await tournamentService.create({
        name: values.name.trim(),
        descriptionEn: values.descriptionEn.trim(),
        descriptionSw: values.descriptionSw.trim(),
        rulesEn: values.rulesEn.trim() || undefined,
        rulesSw: values.rulesSw.trim() || undefined,
        format: "SINGLE_ELIMINATION",
        style: values.style,
        scope: values.scope,
        country: values.scope === "GLOBAL" ? undefined : values.country.trim() || undefined,
        region: values.scope === "REGION" ? values.region.trim() || undefined : undefined,
        maxPlayers: Number(values.maxPlayers),
        minPlayers: Number(values.minPlayers),
        scheduledStartAt: new Date(scheduledStartAt as string).toISOString(),
        registrationDeadline: registrationDeadline
          ? new Date(registrationDeadline).toISOString()
          : undefined,
        minElo: toOptionalNumber(values.minElo),
        maxElo: toOptionalNumber(values.maxElo),
        minMatchmakingWins: toOptionalNumber(values.minMatchmakingWins),
        minAiLevelBeaten: toOptionalNumber(values.minAiLevelBeaten),
        requiredAiLevelPlayed: toOptionalNumber(values.requiredAiLevelPlayed),
      });

      setCreatedId(created.id);
      setForm(initialState);
      setRepostSourceName(null);
      await loadTournaments();
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to create tournament.";
      setError(typeof message === "string" ? message : "Failed to create tournament.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="rounded-3xl border border-gray-800 bg-[linear-gradient(135deg,rgba(17,24,39,0.96),rgba(245,158,11,0.10),rgba(59,130,246,0.08))] p-6 sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-4">
            <span className="inline-flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-amber-300">
              <Trophy className="h-3.5 w-3.5" />
              Tournament Admin
            </span>
            <div>
              <h1 className="text-3xl font-black text-white">Create and Monitor Tournaments</h1>
              <p className="mt-2 max-w-3xl text-sm leading-7 text-gray-300">
                Publish a tournament, then open its monitor page to track status, joined players,
                current round, and winner.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="flex items-center gap-2 text-amber-300">
                <ShieldCheck className="h-4 w-4" />
                <span className="text-xs font-semibold uppercase tracking-[0.16em]">Phase</span>
              </div>
              <p className="mt-3 text-lg font-bold text-white">Single Elimination</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="flex items-center gap-2 text-sky-300">
                <CalendarDays className="h-4 w-4" />
                <span className="text-xs font-semibold uppercase tracking-[0.16em]">Monitor</span>
              </div>
              <p className="mt-3 text-lg font-bold text-white">Live Refresh</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="flex items-center gap-2 text-emerald-300">
                <Users className="h-4 w-4" />
                <span className="text-xs font-semibold uppercase tracking-[0.16em]">Tracked</span>
              </div>
              <p className="mt-3 text-lg font-bold text-white">{tournaments.length} tournaments</p>
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-gray-800 bg-gray-900/70 p-6">
            <h2 className="text-lg font-bold text-white">
              Core Details
              <FieldTooltip text="Public-facing text players see when browsing or registering. Both English and Swahili versions are required." />
            </h2>
            <div className="mt-5 grid gap-5">
              <label className="space-y-2">
                <span className="text-sm font-medium text-gray-200">
                  Tournament name
                  <FieldTooltip text="A clear, unique name shown on the tournament list and detail page. At least 3 characters." />
                </span>
                <input className={inputClassName()} value={form.name} onChange={(e) => updateField("name", e.target.value)} placeholder="Dar Open 2026" />
                <FieldError message={fieldErrors.name} />
              </label>
              <div className="grid gap-5 lg:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-medium text-gray-200">
                    Description (English)
                    <FieldTooltip text="Shown to English-speaking players on the tournament detail page. At least 10 characters." />
                  </span>
                  <textarea className={textareaClassName()} value={form.descriptionEn} onChange={(e) => updateField("descriptionEn", e.target.value)} />
                  <FieldError message={fieldErrors.descriptionEn} />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-gray-200">
                    Description (Swahili)
                    <FieldTooltip text="Shown to Swahili-speaking players on the tournament detail page. At least 10 characters." />
                  </span>
                  <textarea className={textareaClassName()} value={form.descriptionSw} onChange={(e) => updateField("descriptionSw", e.target.value)} />
                  <FieldError message={fieldErrors.descriptionSw} />
                </label>
              </div>
              <div className="grid gap-5 lg:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-medium text-gray-200">
                    Rules (English, optional)
                    <FieldTooltip text="Additional rules shown below the description on the tournament page. Leave blank to skip." />
                  </span>
                  <textarea className={textareaClassName()} value={form.rulesEn} onChange={(e) => updateField("rulesEn", e.target.value)} />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-gray-200">
                    Rules (Swahili, optional)
                    <FieldTooltip text="Same as the English rules field but shown to Swahili-speaking players." />
                  </span>
                  <textarea className={textareaClassName()} value={form.rulesSw} onChange={(e) => updateField("rulesSw", e.target.value)} />
                </label>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-gray-800 bg-gray-900/70 p-6">
            <h2 className="text-lg font-bold text-white">
              Eligibility Filters
              <FieldTooltip text="All filters are optional — leave any field blank to allow any registered player to join on that criterion." />
            </h2>
            <div className="mt-5 grid gap-5 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-medium text-gray-200">
                  Minimum ELO
                  <FieldTooltip text="Players below this ELO rating cannot register. Leave blank for no lower limit." />
                </span>
                <input type="number" className={inputClassName()} value={form.minElo} onChange={(e) => updateField("minElo", e.target.value)} placeholder="e.g. 1000" />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium text-gray-200">
                  Maximum ELO
                  <FieldTooltip text="Players above this ELO rating cannot register. Useful for beginner-only events." />
                </span>
                <input type="number" className={inputClassName()} value={form.maxElo} onChange={(e) => updateField("maxElo", e.target.value)} placeholder="e.g. 1600" />
                <FieldError message={fieldErrors.maxElo} />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium text-gray-200">
                  Min matchmaking wins
                  <FieldTooltip text="Requires a minimum number of wins from ranked online matchmaking. AI games are not counted." />
                </span>
                <input type="number" className={inputClassName()} value={form.minMatchmakingWins} onChange={(e) => updateField("minMatchmakingWins", e.target.value)} placeholder="e.g. 5" />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium text-gray-200">
                  Min AI level beaten
                  <FieldTooltip text="Player must have beaten an AI at least this difficulty level to qualify." />
                </span>
                <input type="number" className={inputClassName()} value={form.minAiLevelBeaten} onChange={(e) => updateField("minAiLevelBeaten", e.target.value)} placeholder="e.g. 3" />
              </label>
              <label className="space-y-2 md:col-span-2">
                <span className="text-sm font-medium text-gray-200">
                  Required AI level played
                  <FieldTooltip text="Player must have played against an AI of exactly this difficulty at least once — even if they lost." />
                </span>
                <input type="number" className={inputClassName()} value={form.requiredAiLevelPlayed} onChange={(e) => updateField("requiredAiLevelPlayed", e.target.value)} placeholder="e.g. 2" />
              </label>
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-2xl border border-gray-800 bg-gray-900/70 p-6">
            <h2 className="text-lg font-bold text-white">
              Format and Schedule
              <FieldTooltip text="Define how the bracket is structured and when the tournament runs. All times use your device's local timezone." />
            </h2>
            <div className="mt-5 grid gap-5">
              <label className="space-y-2 text-sm text-gray-300">
                <span className="font-medium text-gray-200">
                  Tournament format
                  <FieldTooltip text="Phase 1 only supports Single Elimination — one loss and you're out. More formats (Round Robin, Swiss) are coming in future phases." />
                </span>
                <input
                  className={`${inputClassName()} text-amber-300`}
                  value="SINGLE_ELIMINATION"
                  disabled
                />
              </label>
              <label className="space-y-2 text-sm text-gray-300">
                <span className="font-medium text-gray-200">
                  Time control
                  <FieldTooltip text="BLITZ = 5 min per player · RAPID = 10 min · CLASSICAL = 30 min · UNLIMITED = no clock. Applies to every game in the tournament." />
                </span>
                <select className={inputClassName()} value={form.style} onChange={(e) => updateField("style", e.target.value as TournamentStyle)}>
                  <option value="BLITZ">BLITZ</option>
                  <option value="RAPID">RAPID</option>
                  <option value="CLASSICAL">CLASSICAL</option>
                  <option value="UNLIMITED">UNLIMITED</option>
                </select>
              </label>
              <div className="grid gap-5 sm:grid-cols-2">
                <label className="space-y-2 text-sm text-gray-300">
                  <span className="font-medium text-gray-200">
                    Maximum players
                    <FieldTooltip text="Hard cap — registration closes once this number is reached. Maximum allowed is 32 for Single Elimination." />
                  </span>
                  <input type="number" className={inputClassName()} value={form.maxPlayers} onChange={(e) => updateField("maxPlayers", e.target.value)} min={4} max={32} placeholder="Enter max players" />
                  <FieldError message={fieldErrors.maxPlayers} />
                </label>
                <label className="space-y-2 text-sm text-gray-300">
                  <span className="font-medium text-gray-200">
                    Minimum players to start
                    <FieldTooltip text="The tournament cannot be started until at least this many players have registered. Must be at least 4." />
                  </span>
                  <input type="number" className={inputClassName()} value={form.minPlayers} onChange={(e) => updateField("minPlayers", e.target.value)} min={4} max={32} placeholder="Enter minimum players" />
                  <FieldError message={fieldErrors.minPlayers} />
                </label>
              </div>
              <div className="grid gap-5 lg:grid-cols-2">
                <label className="space-y-2 text-sm text-gray-300">
                  <span className="font-medium text-gray-200">
                    Tournament starts on
                    <FieldTooltip text="Date and local time when round 1 begins. Pick the date first, then use the time picker to set the hour." />
                  </span>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <input
                      type="date"
                      className={inputClassName()}
                      value={form.scheduledStartDate}
                      onChange={(e) => updateField("scheduledStartDate", e.target.value)}
                    />
                    <TimePickerField
                      value={form.scheduledStartTime}
                      onChange={(value) => updateField("scheduledStartTime", value)}
                    />
                  </div>
                  {scheduledStartPreview && (
                    <p className="text-xs text-amber-200">Selected: {scheduledStartPreview}</p>
                  )}
                  <FieldError
                    message={
                      fieldErrors.scheduledStartAt ||
                      fieldErrors.scheduledStartDate ||
                      fieldErrors.scheduledStartTime
                    }
                  />
                </label>
                <label className="space-y-2 text-sm text-gray-300">
                  <span className="font-medium text-gray-200">
                    Registration closes on
                    <FieldTooltip text="Last moment players can join. Must be before the tournament start time. Leave both fields blank for no deadline." />
                  </span>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <input
                      type="date"
                      className={inputClassName()}
                      value={form.registrationDeadlineDate}
                      onChange={(e) => updateField("registrationDeadlineDate", e.target.value)}
                    />
                    <TimePickerField
                      value={form.registrationDeadlineTime}
                      onChange={(value) => updateField("registrationDeadlineTime", value)}
                    />
                  </div>
                  {registrationDeadlinePreview && (
                    <p className="text-xs text-amber-200">Selected: {registrationDeadlinePreview}</p>
                  )}
                  <FieldError
                    message={
                      fieldErrors.registrationDeadline ||
                      fieldErrors.registrationDeadlineDate ||
                      fieldErrors.registrationDeadlineTime
                    }
                  />
                </label>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-gray-800 bg-gray-900/70 p-6">
            <h2 className="text-lg font-bold text-white">
              Scope
              <FieldTooltip text="Controls which players are eligible based on geography. Use GLOBAL for open events, COUNTRY or REGION to restrict to a specific area." />
            </h2>
            <div className="mt-5 grid gap-5">
              <label className="space-y-2">
                <span className="text-sm font-medium text-gray-200">
                  Geographic scope
                  <FieldTooltip text="GLOBAL = anyone worldwide · COUNTRY = only players from a specific country · REGION = only players from a specific region." />
                </span>
                <select className={inputClassName()} value={form.scope} onChange={(e) => updateField("scope", e.target.value as TournamentScope)}>
                  <option value="GLOBAL">GLOBAL</option>
                  <option value="COUNTRY">COUNTRY</option>
                  <option value="REGION">REGION</option>
                </select>
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium text-gray-200">
                  Country
                  <FieldTooltip text="Required when scope is COUNTRY or REGION. Use the country code set on player profiles (e.g. TZ for Tanzania)." />
                </span>
                <input className={inputClassName()} value={form.country} onChange={(e) => updateField("country", e.target.value)} placeholder="e.g. TZ" />
                <FieldError message={fieldErrors.country} />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium text-gray-200">
                  Region
                  <FieldTooltip text="Only active when scope is set to REGION. Enter the region name exactly as stored on player profiles." />
                </span>
                <input className={inputClassName()} value={form.region} onChange={(e) => updateField("region", e.target.value)} placeholder="e.g. Dar es Salaam" disabled={form.scope !== "REGION"} />
                <FieldError message={fieldErrors.region} />
              </label>
            </div>
          </section>

          <section id="publish" className="scroll-mt-24 rounded-2xl border border-gray-800 bg-gray-900/70 p-6">
            <h2 className="text-lg font-bold text-white">Publish</h2>
            {repostSourceName && (
              <div className="mt-5 rounded-xl border border-sky-500/30 bg-sky-500/10 px-4 py-3 text-sm text-sky-100">
                Reposting settings from <span className="font-semibold">{repostSourceName}</span>.
                Pick a new schedule, then publish it as a fresh tournament. Registration deadline
                and eligibility blockers were cleared so players are not accidentally locked out.
              </div>
            )}
            {error && <div className="mt-5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div>}
            {createdId && (
              <div className="mt-5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                  <div className="space-y-2">
                    <p>Tournament created successfully.</p>
                    <div className="flex flex-wrap gap-3 text-xs font-semibold">
                      <Link href={`/${locale}/admin/tournaments/${createdId}`} className="text-emerald-100 underline underline-offset-2">Open admin monitor</Link>
                      <Link href={`/${locale}/community/tournament/${createdId}`} className="text-emerald-100 underline underline-offset-2">Open detail page</Link>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div className="mt-6 flex flex-col gap-3">
              <button type="submit" disabled={!canSubmit || submitting} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-amber-400 px-4 py-3 text-sm font-bold text-gray-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:bg-gray-700 disabled:text-gray-400">
                {submitting ? "Creating tournament..." : "Create tournament"}
              </button>
              {!canSubmit && (
                <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 px-4 py-3 text-sm text-amber-100">
                  <p className="font-medium">Create tournament is disabled until these are set:</p>
                  <ul className="mt-2 space-y-1 text-xs leading-relaxed text-amber-100/80">
                    {unmetSubmitRequirements.map((requirement) => (
                      <li key={requirement}>{requirement}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </section>
        </div>
      </form>

      <section className="rounded-2xl border border-gray-800 bg-gray-900/70 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">Tournament Control Room</h2>
            <p className="mt-1 text-sm text-gray-400">Open any tournament to watch rounds, participants, and winners in near real time.</p>
          </div>
          <button type="button" onClick={loadTournaments} disabled={loadingTournaments} className="inline-flex items-center gap-2 rounded-xl border border-gray-700 px-4 py-2 text-sm font-semibold text-gray-300 transition hover:border-gray-500 hover:text-white disabled:opacity-50">
            <RefreshCw className={`h-4 w-4 ${loadingTournaments ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        <div className="mt-6 grid gap-4">
          {tournaments.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-800 px-4 py-8 text-center text-sm text-gray-500">No tournaments created yet.</div>
          ) : (
            tournaments.map((tournament) => (
              <div key={tournament.id} className="flex flex-col gap-4 rounded-2xl border border-gray-800 bg-black/20 p-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="text-lg font-bold text-white">{tournament.name}</h3>
                    <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${tournamentStatusClassName(tournament.status)}`}>
                      {prettyFormat(tournament.status)}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs text-gray-300">
                    <span className="rounded-full bg-white/5 px-3 py-1.5">{prettyFormat(tournament.format)}</span>
                    <span className="rounded-full bg-white/5 px-3 py-1.5">{tournament.style}</span>
                    <span className="rounded-full bg-white/5 px-3 py-1.5">{tournament.maxPlayers} players</span>
                  </div>
                </div>
	                <div className="flex flex-wrap gap-3">
	                  <Link href={`/${locale}/admin/tournaments/${tournament.id}`} className="inline-flex items-center justify-center rounded-xl bg-amber-400 px-4 py-2 text-sm font-bold text-gray-950 transition hover:bg-amber-300">
	                    Manage live
	                  </Link>
	                  {(tournament.status === "DRAFT" || tournament.status === "REGISTRATION") ? (
	                    <Link href={`/${locale}/admin/tournaments/${tournament.id}#edit-tournament`} className="inline-flex items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-200 transition hover:border-emerald-400/50 hover:text-white">
	                      Edit tournament
	                    </Link>
	                  ) : (
	                    <button
	                      type="button"
	                      onClick={() => handleRepostTournament(tournament)}
	                      className="inline-flex items-center justify-center rounded-xl border border-sky-500/30 bg-sky-500/10 px-4 py-2 text-sm font-semibold text-sky-200 transition hover:border-sky-400/50 hover:text-white"
	                    >
	                      Repost as new
	                    </button>
	                  )}
	                  <Link href={`/${locale}/community/tournament/${tournament.id}`} className="inline-flex items-center justify-center rounded-xl border border-gray-700 px-4 py-2 text-sm font-semibold text-gray-300 transition hover:border-gray-500 hover:text-white">
	                    Public page
	                  </Link>
	                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
