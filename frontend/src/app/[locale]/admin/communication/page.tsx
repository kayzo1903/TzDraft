"use client";

import { useEffect, useMemo, useState, type ElementType } from "react";
import {
  BellRing,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Flame,
  Megaphone,
  MessageSquareText,
  MousePointerClick,
  ShieldAlert,
  Sparkles,
  Smartphone,
  Target,
  Trash2,
  Pause,
  Play,
  AlertCircle,
  ArrowLeft,
} from "lucide-react";
import {
  communicationAudienceLabels,
  communicationAudienceSegments,
  communicationChannelLabels,
  communicationChannels,
  communicationPriorityLabels,
  communicationPriorities,
  communicationStatusLabels,
  communicationTypeLabels,
  communicationTypes,
  type CommunicationAudienceSegment,
  type CommunicationCampaign,
  type CommunicationChannel,
  type CommunicationPriority,
  type CommunicationType,
  type CommunicationCenterSnapshot,
  type CommunicationLocale,
} from "@tzdraft/shared-client";
import { communicationCenterService } from "@/services/communication-center.service";
import { Dialog } from "@/components/ui/Dialog";

type ScheduleMode = "instant" | "scheduled";

interface MessageDraft {
  title: Record<CommunicationLocale, string>;
  body: Record<CommunicationLocale, string>;
  ctaLabel: Record<CommunicationLocale, string>;
  ctaHref: string;
  audience: CommunicationAudienceSegment;
  type: CommunicationType;
  priority: CommunicationPriority;
  channels: CommunicationChannel[];
  scheduleMode: ScheduleMode;
  scheduleDate: string;
  scheduleTime: string;
  timezone: string;
}

const statusTone: Record<string, string> = {
  LIVE: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  SCHEDULED: "border-sky-500/30 bg-sky-500/10 text-sky-300",
  SENT: "border-neutral-700 bg-neutral-800 text-neutral-300",
  DRAFT: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  PAUSED: "border-rose-500/30 bg-rose-500/10 text-rose-300",
};

const typeTone: Record<CommunicationType, string> = {
  ANNOUNCEMENT: "bg-sky-500/10 text-sky-300 border-sky-500/20",
  PROMOTION: "bg-amber-500/10 text-amber-300 border-amber-500/20",
  ALERT: "bg-rose-500/10 text-rose-300 border-rose-500/20",
  ENGAGEMENT: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
};

const previewTone: Record<CommunicationType, string> = {
  ANNOUNCEMENT: "from-sky-500/25 via-cyan-500/10 to-slate-950",
  PROMOTION: "from-amber-500/25 via-orange-500/10 to-slate-950",
  ALERT: "from-rose-500/25 via-red-500/10 to-slate-950",
  ENGAGEMENT: "from-emerald-500/25 via-lime-500/10 to-slate-950",
};

function formatRate(value: number, total: number) {
  if (!total) return "0%";
  return `${((value / total) * 100).toFixed(1)}%`;
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function StatCard({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: string;
  value: string;
  detail: string;
  icon: ElementType;
}) {
  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-950/60 p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-neutral-500">
          {label}
        </p>
        <div className="rounded-xl border border-white/10 bg-white/5 p-2">
          <Icon className="h-4 w-4 text-amber-300" />
        </div>
      </div>
      <p className="mt-4 text-3xl font-semibold text-white">{value}</p>
      <p className="mt-1 text-sm text-neutral-400">{detail}</p>
    </div>
  );
}

function ChannelToggle({
  channel,
  active,
  disabled,
  onToggle,
}: {
  channel: CommunicationChannel;
  active: boolean;
  disabled?: boolean;
  onToggle: (channel: CommunicationChannel) => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onToggle(channel)}
      className={`rounded-2xl border px-4 py-3 text-left transition ${
        disabled
          ? "cursor-not-allowed border-neutral-800 bg-neutral-900/40 text-neutral-600"
          : active
          ? "border-amber-400/30 bg-amber-400/10 text-amber-200"
          : "border-neutral-800 bg-neutral-950/70 text-neutral-400 hover:border-neutral-700 hover:text-white"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">{communicationChannelLabels[channel]}</p>
          <p className="mt-1 text-xs text-neutral-500">
            {channel === "EMAIL"
              ? "Reserved for a future release."
              : "Optimized for the mobile app experience."}
          </p>
        </div>
        {active && !disabled && <CheckCircle2 className="h-4 w-4 text-amber-300" />}
      </div>
    </button>
  );
}

function CampaignCard({ 
  campaign, 
  onEdit, 
  onDelete, 
  onPause 
}: { 
  campaign: CommunicationCampaign; 
  onEdit: (campaign: CommunicationCampaign) => void;
  onDelete: (id: string) => void;
  onPause: (id: string) => void;
}) {
  const openRate = formatRate(
    campaign.analytics.opened,
    campaign.analytics.delivered,
  );
  const clickRate = formatRate(
    campaign.analytics.clicked,
    campaign.analytics.delivered,
  );
  const conversionRate = formatRate(
    campaign.analytics.conversions,
    campaign.analytics.clicked,
  );

  return (
    <div className="rounded-3xl border border-neutral-800 bg-neutral-950/70 p-5 transition hover:border-neutral-700">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${typeTone[campaign.type]}`}
            >
              {communicationTypeLabels[campaign.type]}
            </span>
            <span
              className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${
                statusTone[campaign.status] ?? statusTone.DRAFT
              }`}
            >
              {communicationStatusLabels[campaign.status]}
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-300">
              {communicationPriorityLabels[campaign.priority]}
            </span>
          </div>
          <div>
            <h3 className="text-xl font-semibold text-white">{campaign.title}</h3>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-400">{campaign.body}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-3">
          <div className="min-w-[220px] rounded-2xl border border-neutral-800 bg-black/30 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
              Target & Schedule
            </p>
            <div className="mt-3 space-y-2 text-sm text-neutral-300">
              <p className="flex items-center gap-2">
                <Target className="h-3.5 w-3.5 text-neutral-500" />
                {communicationAudienceLabels[campaign.audience]}
              </p>
              <p className="flex items-center gap-2">
                <Smartphone className="h-3.5 w-3.5 text-neutral-500" />
                {campaign.channels
                  .map((channel) => communicationChannelLabels[channel])
                  .join(" • ")}
              </p>
              <p className="flex items-center gap-2">
                <Clock3 className="h-3.5 w-3.5 text-neutral-500" />
                {campaign.schedule.localLabel}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onEdit(campaign)}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-neutral-800 bg-black/40 text-neutral-400 transition hover:border-sky-400/40 hover:text-sky-300"
              title="Edit Campaign"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            {campaign.status !== "PAUSED" && campaign.status !== "SENT" && (
              <button
                type="button"
                onClick={() => onPause(campaign.id)}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-neutral-800 bg-black/40 text-neutral-400 transition hover:border-amber-400/40 hover:text-amber-300"
                title="Pause Campaign"
              >
                <Pause className="h-4 w-4" />
              </button>
            )}
            <button
              type="button"
              onClick={() => onDelete(campaign.id)}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-neutral-800 bg-black/40 text-neutral-400 transition hover:border-rose-500/40 hover:text-rose-400"
              title="Delete Campaign"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-neutral-800 bg-black/30 p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-400/80">Impressions</p>
          <p className="mt-2 text-2xl font-semibold text-white">{campaign.analytics.delivered}</p>
          <p className="mt-1 text-[11px] text-neutral-500">
            Total mobile device deliveries
          </p>
        </div>
        <div className="rounded-2xl border border-neutral-800 bg-black/30 p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-sky-400/80">Open rate</p>
          <p className="mt-2 text-2xl font-semibold text-white">{openRate}</p>
          <p className="mt-1 text-[11px] text-neutral-500">{campaign.analytics.opened} manual opens</p>
        </div>
        <div className="rounded-2xl border border-neutral-800 bg-black/30 p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-400/80">CTR</p>
          <p className="mt-2 text-2xl font-semibold text-white">{clickRate}</p>
          <p className="mt-1 text-[11px] text-neutral-500">{campaign.analytics.clicked} CTA taps</p>
        </div>
        <div className="rounded-2xl border border-neutral-800 bg-black/30 p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-purple-400/80">Conversion</p>
          <p className="mt-2 text-2xl font-semibold text-white">{conversionRate}</p>
          <p className="mt-1 text-[11px] text-neutral-500">
            Joined or completed goal
          </p>
        </div>
      </div>
    </div>
  );
}

const INITIAL_DRAFT: MessageDraft = {
  title: { en: "", sw: "" },
  body: { en: "", sw: "" },
  ctaLabel: { en: "", sw: "" },
  ctaHref: "",
  audience: "ACTIVE_USERS",
  type: "PROMOTION",
  priority: "NORMAL",
  channels: [],
  scheduleMode: "instant",
  scheduleDate: "",
  scheduleTime: "",
  timezone: "Africa/Nairobi",
};

export default function AdminCommunicationCenterPage() {
  const [view, setView] = useState<"list" | "form">("list");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<CommunicationCenterSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [draftLocale, setDraftLocale] = useState<CommunicationLocale>("en");
  const [draft, setDraft] = useState<MessageDraft>(INITIAL_DRAFT);

  useEffect(() => {
    const saved = localStorage.getItem("admin_campaign_draft");
    if (saved && !editingId) {
      try {
        setDraft(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to restore draft", e);
      }
    }
  }, [editingId]);

  useEffect(() => {
    if (!editingId) {
      localStorage.setItem("admin_campaign_draft", JSON.stringify(draft));
    }
  }, [draft, editingId]);

  const refreshSnapshot = async () => {
    try {
      const updatedSnapshot = await communicationCenterService.getSnapshot();
      setSnapshot(updatedSnapshot);
    } catch (err) {
      console.error("Failed to refresh snapshot", err);
    }
  };

  useEffect(() => {
    refreshSnapshot().finally(() => setLoading(false));
  }, []);

  const validateDraft = () => {
    if (!draft.title.en || !draft.title.sw) return "Title is required in both EN and SW";
    if (!draft.body.en || !draft.body.sw) return "Body is required in both EN and SW";
    if (draft.channels.length === 0) return "At least one delivery channel must be selected";
    if (draft.scheduleMode === "scheduled" && (!draft.scheduleDate || !draft.scheduleTime)) {
      return "Schedule date and time are required for scheduled sends";
    }
    return null;
  };

  const handleSaveCampaign = async () => {
    const validationError = validateDraft();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setIsSaving(true);
    try {
      if (editingId) {
        await communicationCenterService.updateCampaign(editingId, draft);
      } else {
        await communicationCenterService.createCampaign(draft);
      }
      localStorage.removeItem("admin_campaign_draft");
      setDraft(INITIAL_DRAFT);
      setEditingId(null);
      setView("list");
      await refreshSnapshot();
    } catch (error: any) {
      setError(error?.response?.data?.message || "Failed to save campaign. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!draft.title.en && !draft.title.sw) {
      setError("Please provide at least a title for the draft.");
      return;
    }

    setError(null);
    setIsSaving(true);
    try {
      await communicationCenterService.saveDraft(draft);
      localStorage.removeItem("admin_campaign_draft");
      setDraft(INITIAL_DRAFT);
      setView("list");
      await refreshSnapshot();
    } catch (error: any) {
      setError(error?.response?.data?.message || "Failed to save draft.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditCampaign = (campaign: CommunicationCampaign) => {
    setEditingId(campaign.id);
    setDraft({
      title: campaign.localized.title,
      body: campaign.localized.body,
      ctaLabel: campaign.localized.ctaLabel,
      ctaHref: campaign.cta.href,
      audience: campaign.audience,
      type: campaign.type,
      priority: campaign.priority,
      channels: campaign.channels,
      scheduleMode: "instant", // Resets to instant for safety
      scheduleDate: "",
      scheduleTime: "",
      timezone: "Africa/Nairobi",
    });
    setView("form");
  };

  const handlePauseCampaign = async (id: string) => {
    try {
      await communicationCenterService.pauseCampaign(id);
      await refreshSnapshot();
    } catch (err) {
      console.error("Failed to pause campaign:", err);
    }
  };

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteCampaign = async (id: string) => {
    setDeleteConfirmId(id);
  };

  const confirmDelete = async () => {
    if (!deleteConfirmId) return;
    setIsDeleting(true);
    try {
      await communicationCenterService.deleteCampaign(deleteConfirmId);
      await refreshSnapshot();
    } catch (err) {
      console.error("Failed to delete campaign:", err);
    } finally {
      setIsDeleting(false);
      setDeleteConfirmId(null);
    }
  };

  const campaignGroups = useMemo(() => {
    const campaigns = snapshot?.campaigns ?? [];
    return {
      active: campaigns.filter((campaign) => campaign.status === "LIVE"),
      scheduled: campaigns.filter((campaign) => campaign.status === "SCHEDULED"),
      past: campaigns.filter((campaign) => campaign.status === "SENT"),
      drafts: campaigns.filter((campaign) => campaign.status === "DRAFT"),
    };
  }, [snapshot]);

  const previewTimestamp =
    draft.scheduleMode === "instant"
      ? "Send immediately"
      : `${draft.scheduleDate} at ${draft.scheduleTime} (${draft.timezone})`;

  const previewChannels = draft.channels.filter((channel) => channel !== "EMAIL");

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-[2rem] border border-neutral-800 bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.12),_transparent_36%),linear-gradient(135deg,#111827,#0a0a0a)] p-8">
        <div className="flex flex-col gap-8 xl:flex-row xl:items-center xl:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-amber-200">
              <Smartphone className="h-3.5 w-3.5" />
              Communication Center
            </div>
            <h1 className="mt-5 text-4xl font-semibold tracking-tight text-white">
              Campaign Management
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-neutral-300">
              Engage your mobile community with multi-channel announcements, 
              scheduled promotions, and real-time engagement triggers.
            </p>
          </div>

          <div className="flex shrink-0 gap-3">
            {view === "list" ? (
              <button
                onClick={() => {
                  setDraft(INITIAL_DRAFT);
                  setEditingId(null);
                  setView("form");
                }}
                className="flex h-14 items-center gap-3 rounded-2xl bg-amber-400 px-8 font-bold text-black transition hover:bg-amber-300 hover:scale-[1.02] active:scale-[0.98]"
              >
                <Sparkles className="h-5 w-5" />
                Create Campaign
              </button>
            ) : (
              <button
                onClick={() => setView("list")}
                className="flex h-14 items-center gap-3 rounded-2xl border border-neutral-700 bg-neutral-800 px-8 font-bold text-white transition hover:bg-neutral-700"
              >
                <ArrowLeft className="h-5 w-5" />
                Back to List
              </button>
            )}
          </div>
        </div>
      </section>

      {view === "list" && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
            {(snapshot?.overview ?? []).map((item) => (
              <div
                key={item.label}
                className="rounded-2xl border border-neutral-800 bg-neutral-950/70 p-5"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">
                  {item.label}
                </p>
                <p className="mt-3 text-3xl font-semibold text-white">{item.value}</p>
                <p className="mt-2 text-sm text-neutral-400">{item.delta}</p>
              </div>
            ))}
          </div>

          <section className="rounded-[2rem] border border-neutral-800 bg-neutral-950/70 p-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-white">All Campaigns</p>
                <p className="mt-1 text-sm text-neutral-400">
                  Manage your active, scheduled, and past communications.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 font-semibold text-emerald-300">
                  {campaignGroups.active.length} active
                </span>
                <span className="rounded-full border border-sky-500/20 bg-sky-500/10 px-3 py-1 font-semibold text-sky-300">
                  {campaignGroups.scheduled.length} scheduled
                </span>
                <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 font-semibold text-amber-300">
                  {campaignGroups.drafts.length} drafts
                </span>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              {snapshot?.campaigns.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-neutral-800 py-12 text-center">
                  <Megaphone className="h-10 w-10 text-neutral-700" />
                  <p className="mt-4 text-neutral-400">No campaigns found. Launch your first one!</p>
                </div>
              ) : (
                snapshot?.campaigns.map((campaign) => (
                  <CampaignCard 
                    key={campaign.id} 
                    campaign={campaign} 
                    onEdit={handleEditCampaign}
                    onDelete={handleDeleteCampaign}
                    onPause={handlePauseCampaign}
                  />
                ))
              )}
            </div>
          </section>
        </div>
      )}

      {view === "form" && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <section className="rounded-[2rem] border border-neutral-800 bg-neutral-950/70 p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-lg font-semibold text-white">
                  {editingId ? "Edit Campaign" : "Compose Message"}
                </p>
                <p className="mt-1 text-sm text-neutral-400">
                  Define your audience, schedule, and content for mobile delivery.
                </p>
              </div>
              <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-3">
                <Megaphone className="h-5 w-5 text-amber-300" />
              </div>
            </div>

            <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
              <div className="space-y-6">
                <div>
                  <label className="text-sm font-medium text-neutral-200 uppercase tracking-wider">Message type</label>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {communicationTypes.map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setDraft((current) => ({ ...current, type }))}
                        className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                          draft.type === type
                            ? typeTone[type]
                            : "border-neutral-800 bg-black/30 text-neutral-400 hover:border-neutral-700 hover:text-white"
                        }`}
                      >
                        {communicationTypeLabels[type]}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid gap-6 sm:grid-cols-2">
                  <div>
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-neutral-200">Title</label>
                      <div className="flex gap-1">
                        {(["en", "sw"] as const).map((loc) => (
                          <button
                            key={loc}
                            type="button"
                            onClick={() => setDraftLocale(loc)}
                            className={`rounded-lg border px-2 py-0.5 text-[10px] font-bold uppercase transition ${
                              draftLocale === loc
                                ? "border-amber-400/30 bg-amber-400/10 text-amber-200"
                                : "border-neutral-800 bg-black/30 text-neutral-500 hover:text-white"
                            }`}
                          >
                            {loc}
                          </button>
                        ))}
                      </div>
                    </div>
                    <input
                      value={draft.title[draftLocale]}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          title: { ...current.title, [draftLocale]: event.target.value }
                        }))
                      }
                      placeholder={`Enter title in ${draftLocale.toUpperCase()}...`}
                      className="mt-2 h-14 w-full rounded-2xl border border-neutral-800 bg-black/40 px-5 text-sm text-white outline-none transition focus:border-amber-400/40"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-neutral-200">CTA Label</label>
                    <input
                      value={draft.ctaLabel[draftLocale]}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          ctaLabel: { ...current.ctaLabel, [draftLocale]: event.target.value }
                        }))
                      }
                      placeholder="e.g. JOIN NOW"
                      className="mt-2 h-14 w-full rounded-2xl border border-neutral-800 bg-black/40 px-5 text-sm text-white outline-none transition focus:border-amber-400/40"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-neutral-200">Message Body</label>
                  <textarea
                    rows={6}
                    value={draft.body[draftLocale]}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        body: { ...current.body, [draftLocale]: event.target.value }
                      }))
                    }
                    placeholder="Write your message content here..."
                    className="mt-2 w-full rounded-2xl border border-neutral-800 bg-black/40 px-5 py-4 text-sm leading-7 text-white outline-none transition focus:border-amber-400/40"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-neutral-200">Deep Link / URL</label>
                  <input
                    value={draft.ctaHref}
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, ctaHref: event.target.value }))
                    }
                    placeholder="/game/lobby or https://..."
                    className="mt-2 h-14 w-full rounded-2xl border border-neutral-800 bg-black/40 px-5 text-sm text-white outline-none transition focus:border-amber-400/40"
                  />
                </div>
              </div>

              <div className="space-y-6">
                <div className="grid gap-6 sm:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium text-neutral-200">Target Audience</label>
                    <select
                      value={draft.audience}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          audience: event.target.value as CommunicationAudienceSegment,
                        }))
                      }
                      className="mt-2 h-14 w-full rounded-2xl border border-neutral-800 bg-black/40 px-5 text-sm text-white outline-none appearance-none"
                    >
                      {communicationAudienceSegments.map((segment) => (
                        <option key={segment} value={segment} className="bg-neutral-900">
                          {communicationAudienceLabels[segment]}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-neutral-200">Priority</label>
                    <select
                      value={draft.priority}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          priority: event.target.value as CommunicationPriority,
                        }))
                      }
                      className="mt-2 h-14 w-full rounded-2xl border border-neutral-800 bg-black/40 px-5 text-sm text-white outline-none"
                    >
                      {communicationPriorities.map((priority) => (
                        <option key={priority} value={priority} className="bg-neutral-900">
                          {communicationPriorityLabels[priority]}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-neutral-200">Delivery Channels</label>
                  <div className="mt-3 grid gap-3">
                    {communicationChannels.map((channel) => (
                      <ChannelToggle
                        key={channel}
                        channel={channel}
                        active={draft.channels.includes(channel)}
                        disabled={channel === "EMAIL"}
                        onToggle={(selectedChannel) =>
                          setDraft((current) => ({
                            ...current,
                            channels: current.channels.includes(selectedChannel)
                              ? current.channels.filter((item) => item !== selectedChannel)
                              : [...current.channels, selectedChannel],
                          }))
                        }
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-neutral-200">Schedule</label>
                  <div className="mt-3 flex gap-2">
                    {(["instant", "scheduled"] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setDraft((current) => ({ ...current, scheduleMode: mode }))}
                        className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                          draft.scheduleMode === mode
                            ? "border-amber-400/30 bg-amber-400/10 text-amber-200"
                            : "border-neutral-800 bg-black/30 text-neutral-400 hover:text-white"
                        }`}
                      >
                        {mode === "instant" ? "Send instantly" : "Schedule for later"}
                      </button>
                    ))}
                  </div>

                  {draft.scheduleMode === "scheduled" && (
                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      <input
                        type="date"
                        value={draft.scheduleDate}
                        onChange={(event) =>
                          setDraft((current) => ({ ...current, scheduleDate: event.target.value }))
                        }
                        className="h-14 rounded-2xl border border-neutral-800 bg-black/40 px-5 text-sm text-white"
                      />
                      <input
                        type="time"
                        value={draft.scheduleTime}
                        onChange={(event) =>
                          setDraft((current) => ({ ...current, scheduleTime: event.target.value }))
                        }
                        className="h-14 rounded-2xl border border-neutral-800 bg-black/40 px-5 text-sm text-white"
                      />
                    </div>
                  )}
                </div>

                {error && (
                  <div className="flex items-center gap-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <p>{error}</p>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-3 pt-4 sm:grid-cols-2">
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={handleSaveDraft}
                    className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl border border-neutral-700 bg-neutral-800 font-bold text-white transition hover:bg-neutral-700 disabled:opacity-50"
                  >
                    {isSaving ? <Clock3 className="h-4 w-4 animate-spin" /> : "Save Draft"}
                  </button>
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={handleSaveCampaign}
                    className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-amber-400 font-bold text-black transition hover:bg-amber-300 disabled:opacity-50"
                  >
                    {isSaving ? "Saving..." : editingId ? "Update Campaign" : "Launch Campaign"}
                  </button>
                </div>
              </div>
            </div>
          </section>

          <div className="space-y-6">
            <section className="rounded-[2rem] border border-neutral-800 bg-neutral-950/70 p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold text-white">Mobile Preview</p>
                  <p className="mt-1 text-sm text-neutral-400">Preview before sending.</p>
                </div>
                <Smartphone className="h-5 w-5 text-amber-300" />
              </div>

              <div className={`mt-5 overflow-hidden rounded-[1.75rem] border border-white/10 bg-gradient-to-br ${previewTone[draft.type]} p-5`}>
                <div className="flex items-center justify-between">
                  <span className="rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-white">
                    {communicationTypeLabels[draft.type]}
                  </span>
                  <span className="text-xs text-white/70">{previewTimestamp}</span>
                </div>
                <h3 className="mt-4 text-lg font-semibold text-white">{draft.title[draftLocale] || "Untitled"}</h3>
                <p className="mt-2 text-sm leading-6 text-white/78">{draft.body[draftLocale] || "No message body entered..."}</p>
                <div className="mt-5 flex items-center justify-between gap-3">
                  <div className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-neutral-950">
                    {draft.ctaLabel[draftLocale] || "LEARN MORE"}
                    <ChevronRight className="h-4 w-4" />
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-[2rem] border border-neutral-800 bg-neutral-950/70 p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold text-white">Spam Protection</p>
                  <p className="mt-1 text-sm text-neutral-400">Automated suppression policies.</p>
                </div>
                <ShieldAlert className="h-5 w-5 text-rose-300" />
              </div>
              <div className="mt-5 space-y-3">
                <div className="rounded-2xl border border-neutral-800 bg-black/20 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">Daily limit</p>
                  <p className="mt-2 font-semibold text-white">{snapshot?.policy.dailyCapPerUser ?? 0} per user</p>
                </div>
                <div className="rounded-2xl border border-neutral-800 bg-black/20 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">Quiet hours</p>
                  <p className="mt-2 font-semibold text-white">{snapshot?.policy.quietHoursLabel ?? "8 PM - 8 AM"}</p>
                </div>
              </div>
            </section>
          </div>
        </div>
      )}

      {loading && !snapshot && (
        <div className="flex items-center gap-3 rounded-2xl border border-neutral-800 bg-neutral-950/70 px-6 py-4 text-neutral-400">
          <Clock3 className="h-5 w-5 animate-spin" />
          Loading communication records...
        </div>
      )}

      <Dialog
        open={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={confirmDelete}
        title="Delete Campaign"
        description="Are you sure you want to delete this campaign? This action cannot be undone and all analytics data for this campaign will be lost."
        confirmText="Delete"
        confirmVariant="danger"
        loading={isDeleting}
      />
    </div>
  );
}
