import { useState, useRef, useEffect } from "react";
import { z } from "zod";
import type { Tournament, PrizeCurrency } from "@/services/tournament.service";

export const REPOST_DRAFT_STORAGE_KEY = "admin_tournament_repost_draft";

export type CompetitionFormat = "SINGLE_ELIMINATION" | "ROUND_ROBIN";
export type TournamentStyle = "BLITZ" | "RAPID" | "CLASSICAL" | "UNLIMITED";
export type TournamentScope = "GLOBAL" | "COUNTRY" | "REGION";

export interface PrizeEntry {
  placement: number;
  amount: string;
  currency: PrizeCurrency;
  label: string;
}

export interface FormState {
  format: CompetitionFormat;
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
  roundDurationDays: string;
  roundDurationHours: string;
  roundDurationMinutes: string;
  prizes: PrizeEntry[];
}

export type FormErrorKey = keyof FormState | "scheduledStartAt" | "registrationDeadline";
export type FormErrors = Partial<Record<FormErrorKey, string>>;

export const initialState: FormState = {
  format: "SINGLE_ELIMINATION",
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
  roundDurationDays: "7",
  roundDurationHours: "0",
  roundDurationMinutes: "0",
  prizes: [],
};

export function combineLocalDateTime(date: string, time: string) {
  if (!date.trim() && !time.trim()) return "";
  if (!date.trim() || !time.trim()) return null;
  return `${date}T${time}`;
}

export const tournamentFormSchema = z
  .object({
    format: z.enum(["SINGLE_ELIMINATION", "ROUND_ROBIN"]),
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
    roundDurationDays: z.string(),
    roundDurationHours: z.string(),
    roundDurationMinutes: z.string(),
  })
  .superRefine((data, ctx) => {
    const maxPlayers = Number(data.maxPlayers);
    const minPlayers = Number(data.minPlayers);

    if (!Number.isFinite(minPlayers) || minPlayers < 4) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["minPlayers"],
        message: "Min players must be at least 4.",
      });
    }

    if (data.format === "SINGLE_ELIMINATION" && maxPlayers > 32) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["maxPlayers"],
        message: "Max players for Elimination is 32.",
      });
    }

    if (data.format === "ROUND_ROBIN" && maxPlayers > 12) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["maxPlayers"],
        message: "Max players for League is 12.",
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

    const totalMinutes = 
      (Number(data.roundDurationDays) || 0) * 1440 + 
      (Number(data.roundDurationHours) || 0) * 60 + 
      (Number(data.roundDurationMinutes) || 0);

    if (totalMinutes < 45) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["roundDurationMinutes"],
        message: "Total round duration must be at least 45 minutes.",
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

export function toOptionalNumber(value: string): number | undefined {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function inputClassName() {
  return "w-full rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 text-sm text-white placeholder:text-gray-500 focus:border-amber-400 focus:outline-none";
}

export function textareaClassName() {
  return "w-full min-h-32 rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 text-sm text-white placeholder:text-gray-500 focus:border-amber-400 focus:outline-none";
}

export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-rose-300">{message}</p>;
}

export function FieldTooltip({ text }: { text: string }) {
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

export function TimePickerField({
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

export function formatLocalDateTime(value: string) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "full",
    timeStyle: "short",
  }).format(date);
}

export function buildRepostFormState(tournament: Tournament): FormState {
  return {
    format: "SINGLE_ELIMINATION", // Re-posts always default to elimination since only tournaments use this correctly currently
    name: `${tournament.name} (Repost)`,
    descriptionEn: tournament.descriptionEn,
    descriptionSw: tournament.descriptionSw,
    rulesEn: tournament.rulesEn ?? "",
    rulesSw: tournament.rulesSw ?? "",
    style: tournament.style as TournamentStyle,
    scope: tournament.scope as TournamentScope,
    country: tournament.country ?? "",
    region: tournament.region ?? "",
    maxPlayers: `${tournament.maxPlayers}`,
    minPlayers: `${tournament.minPlayers}`,
    scheduledStartDate: "",
    scheduledStartTime: "",
    registrationDeadlineDate: "",
    registrationDeadlineTime: "",
    minElo: "",
    maxElo: "",
    minMatchmakingWins: "",
    minAiLevelBeaten: "",
    requiredAiLevelPlayed: "",
    roundDurationDays: Math.floor((tournament.roundDurationMinutes || 0) / 1440).toString(),
    roundDurationHours: Math.floor(((tournament.roundDurationMinutes || 0) % 1440) / 60).toString(),
    roundDurationMinutes: ((tournament.roundDurationMinutes || 0) % 60).toString(),
    prizes: (tournament.prizes ?? []).map((p) => ({
      placement: p.placement,
      amount: `${p.amount}`,
      currency: p.currency,
      label: p.label ?? "",
    })),
  };
}
