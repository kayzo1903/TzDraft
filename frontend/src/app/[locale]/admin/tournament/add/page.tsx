"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter, Link } from "@/i18n/routing";
import { useParams } from "next/navigation";
import { ChevronLeft, Trophy, CheckCircle2 } from "lucide-react";
import { tournamentService, type PrizeCurrency } from "@/services/tournament.service";
import {
  REPOST_DRAFT_STORAGE_KEY,
  initialState,
  tournamentFormSchema,
  toOptionalNumber,
  inputClassName,
  textareaClassName,
  FieldError,
  FieldTooltip,
  combineLocalDateTime,
  TimePickerField,
  formatLocalDateTime,
  type FormState,
  type FormErrors,
  type TournamentStyle,
  type TournamentScope,
} from "../../tournaments/tournament-admin.utils";

export default function AddTournamentPage() {
  const router = useRouter();
  const { locale } = useParams<{ locale: string }>();

  const [form, setForm] = useState<FormState>(initialState);
  const [fieldErrors, setFieldErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [repostSourceName, setRepostSourceName] = useState<string | null>(null);

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
      }
    } catch {
      localStorage.removeItem(REPOST_DRAFT_STORAGE_KEY);
    }
  }, []);

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
      const payload = {
        name: values.name.trim(),
        descriptionEn: values.descriptionEn.trim(),
        descriptionSw: values.descriptionSw.trim(),
        rulesEn: values.rulesEn.trim() || undefined,
        rulesSw: values.rulesSw.trim() || undefined,
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
        roundDurationMinutes: 
          (Number(values.roundDurationDays) || 0) * 1440 + 
          (Number(values.roundDurationHours) || 0) * 60 + 
          (Number(values.roundDurationMinutes) || 0),
        prizes: form.prizes
          .filter((p) => p.amount.trim() !== "")
          .map((p) => ({
            placement: p.placement,
            amount: Number(p.amount),
            currency: p.currency,
            label: p.label.trim() || undefined,
          })),
      };

      const created = await tournamentService.create({
        ...payload,
        format: values.format,
      });

      setCreatedId(created.id);
      setForm(initialState);
      setRepostSourceName(null);
      // Wait a moment so they can see success msg if they want, but usually it works fine to just redirect?
      // Actually we'll just not redirect instantly, but leave the success message and Links like previously.
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
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/admin/tournaments"
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-gray-700 text-gray-400 transition hover:border-gray-500 hover:text-white"
        >
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-400" />
            {repostSourceName ? `Reposting from "${repostSourceName}"` : "New Competition"}
          </h1>
          {repostSourceName && (
            <p className="mt-1 text-sm text-sky-300">
              Settings copied — pick a new schedule and publish as a fresh tournament.
            </p>
          )}
        </div>
      </div>

      <div className="rounded-3xl border border-amber-400/20 bg-gray-900/80 p-6 sm:p-8">
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
                    Competition Name
                    <FieldTooltip text="A clear, unique name shown on the competition list. At least 3 characters." />
                  </span>
                  <input className={inputClassName()} value={form.name} onChange={(e) => updateField("name", e.target.value)} placeholder="Summer Championship 2026" />
                  <FieldError message={fieldErrors.name} />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-medium text-gray-200">
                    Format Mode
                    <FieldTooltip text="Tournaments are sudden-death brackets (max 12). Leagues are rigorous point-based round robins (max 32)." />
                  </span>
                  <select
                    className={inputClassName()}
                    value={form.format}
                    onChange={(e) => updateField("format", e.target.value as any)}
                  >
                    <option value="SINGLE_ELIMINATION">Tournament (Single Elimination Knockout)</option>
                    <option value="ROUND_ROBIN">League (Football-style Round Robin)</option>
                  </select>
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
                <div className="space-y-2">
                  <span className="text-sm font-medium text-gray-200">
                    Round Duration
                    <FieldTooltip text="Minimum 45 minutes. The total time allocated for all matches in a single round to be completed." />
                  </span>
                  <div className="grid grid-cols-3 gap-3">
                    <label className="space-y-1">
                      <span className="text-[10px] uppercase tracking-wider text-gray-500 font-bold ml-1">Days</span>
                      <input type="number" className={inputClassName()} value={form.roundDurationDays} onChange={(e) => updateField("roundDurationDays", e.target.value)} min={0} placeholder="0" />
                    </label>
                    <label className="space-y-1">
                      <span className="text-[10px] uppercase tracking-wider text-gray-500 font-bold ml-1">Hours</span>
                      <input type="number" className={inputClassName()} value={form.roundDurationHours} onChange={(e) => updateField("roundDurationHours", e.target.value)} min={0} max={23} placeholder="0" />
                    </label>
                    <label className="space-y-1">
                      <span className="text-[10px] uppercase tracking-wider text-gray-500 font-bold ml-1">Mins</span>
                      <input type="number" className={inputClassName()} value={form.roundDurationMinutes} onChange={(e) => updateField("roundDurationMinutes", e.target.value)} min={0} max={59} placeholder="45" />
                    </label>
                  </div>
                  <FieldError message={fieldErrors.roundDurationMinutes} />
                </div>
                <div className="grid gap-5 sm:grid-cols-2">
                  <label className="space-y-2 text-sm text-gray-300">
                    <span className="font-medium text-gray-200">
                      Maximum players
                      <FieldTooltip text={`Hard cap — registration closes once this number is reached. Maximum allowed is ${form.format === "ROUND_ROBIN" ? 12 : 32} for the selected format.`} />
                    </span>
                    <input type="number" className={inputClassName()} value={form.maxPlayers} onChange={(e) => updateField("maxPlayers", e.target.value)} min={4} max={form.format === "ROUND_ROBIN" ? 12 : 32} placeholder="Enter max players" />
                    <FieldError message={fieldErrors.maxPlayers} />
                  </label>
                  <label className="space-y-2 text-sm text-gray-300">
                    <span className="font-medium text-gray-200">
                      Minimum players to start
                      <FieldTooltip text="The tournament cannot be started until at least this many players have registered. Must be at least 4." />
                    </span>
                    <input type="number" className={inputClassName()} value={form.minPlayers} onChange={(e) => updateField("minPlayers", e.target.value)} min={4} max={form.format === "ROUND_ROBIN" ? 12 : 32} placeholder="Enter minimum players" />
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
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-white">
                  Prize Pool
                  <FieldTooltip text="Optional prizes per placement. Set amount and currency (TSH or USD) for each place. Leave empty for no prizes." />
                </h2>
                <button
                  type="button"
                  onClick={() =>
                    setForm((prev) => ({
                      ...prev,
                      prizes: [
                        ...prev.prizes,
                        { placement: prev.prizes.length + 1, amount: "", currency: "TSH", label: "" },
                      ],
                    }))
                  }
                  className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-200 transition hover:border-emerald-400/50 hover:text-white"
                >
                  + Add placement
                </button>
              </div>
              {form.prizes.length === 0 ? (
                <p className="mt-4 text-sm text-gray-500">No prizes set. Click &quot;Add placement&quot; to declare prize money.</p>
              ) : (
                <div className="mt-4 space-y-3">
                  {form.prizes.map((prize, idx) => (
                    <div key={prize.placement} className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-800 bg-black/20 p-3">
                      <span className="min-w-[60px] text-sm font-semibold text-amber-300">
                        {prize.placement === 1 ? "1st" : prize.placement === 2 ? "2nd" : prize.placement === 3 ? "3rd" : `${prize.placement}th`} place
                      </span>
                      <input
                        type="number"
                        min={0}
                        placeholder="Amount"
                        value={prize.amount}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            prizes: prev.prizes.map((p, i) =>
                              i === idx ? { ...p, amount: e.target.value } : p,
                            ),
                          }))
                        }
                        className="w-32 rounded-xl border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:border-amber-400 focus:outline-none"
                      />
                      <select
                        value={prize.currency}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            prizes: prev.prizes.map((p, i) =>
                              i === idx ? { ...p, currency: e.target.value as PrizeCurrency } : p,
                            ),
                          }))
                        }
                        className="rounded-xl border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white focus:border-amber-400 focus:outline-none"
                      >
                        <option value="TSH">TSH</option>
                        <option value="USD">USD</option>
                      </select>
                      <input
                        type="text"
                        placeholder="Label (optional)"
                        value={prize.label}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            prizes: prev.prizes.map((p, i) =>
                              i === idx ? { ...p, label: e.target.value } : p,
                            ),
                          }))
                        }
                        className="flex-1 min-w-[120px] rounded-xl border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:border-amber-400 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setForm((prev) => ({
                            ...prev,
                            prizes: prev.prizes
                              .filter((_, i) => i !== idx)
                              .map((p, i) => ({ ...p, placement: i + 1 })),
                          }))
                        }
                        className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-2.5 py-2 text-xs font-semibold text-rose-300 transition hover:border-rose-400/50 hover:text-white"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
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

            <section className="rounded-2xl border border-gray-800 bg-gray-900/70 p-6">
              <h2 className="text-lg font-bold text-white">Publish</h2>
              {error && <div className="mt-5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div>}
              {createdId && (
                <div className="mt-5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                    <div className="space-y-2">
                      <p>Tournament created successfully.</p>
                      <div className="flex flex-wrap gap-3 text-xs font-semibold">
                        <Link href="/admin/tournaments" className="text-emerald-100 underline underline-offset-2">Open tournament list</Link>
                        <Link href={`/admin/tournaments/${createdId}`} className="text-emerald-100 underline underline-offset-2">Open admin monitor</Link>
                        <Link href={`/community/tournament/${createdId}`} className="text-emerald-100 underline underline-offset-2">Open detail page</Link>
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
      </div>
    </div>
  );
}
