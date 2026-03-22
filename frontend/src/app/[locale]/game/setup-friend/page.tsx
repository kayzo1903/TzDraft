"use client";

import React, { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Check,
  Clock3,
  Copy,
  Globe,
  Loader2,
  Monitor,
  QrCode,
  Shuffle,
  Smartphone,
  Users,
  Wifi,
} from "lucide-react";
import clsx from "clsx";
import QRCode from "react-qr-code";
import { useLocale, useTranslations } from "next-intl";
import { useAuthStore } from "@/lib/auth/auth-store";
import { authClient } from "@/lib/auth/auth-client";
import { Button } from "@/components/ui/Button";
import { gameService } from "@/services/game.service";

const TIME_OPTIONS = [5, 10, 15] as const;
type TimeOption = (typeof TIME_OPTIONS)[number];

type ColorChoice = "WHITE" | "BLACK" | "RANDOM";
type Tab = "local" | "online";
type OnlineView = "choose" | "creating" | "created" | "joining" | "joining-loading";

function SectionCard({
  title,
  body,
  icon,
}: {
  title: string;
  body: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-[var(--primary)]">
          {icon}
        </div>
        <div>
          <div className="text-sm font-black text-white">{title}</div>
          <p className="mt-1 text-sm leading-6 text-neutral-400">{body}</p>
        </div>
      </div>
    </div>
  );
}

function ColorPicker({
  value,
  onChange,
  label,
  whiteLabel,
  randomLabel,
  blackLabel,
  selectedLabel,
}: {
  value: ColorChoice;
  onChange: (c: ColorChoice) => void;
  label: string;
  whiteLabel: string;
  randomLabel: string;
  blackLabel: string;
  selectedLabel: string;
}) {
  const options: { value: ColorChoice; icon: React.ReactNode; label: string }[] = [
    {
      value: "WHITE",
      icon: <div className="h-4 w-4 rounded-full border border-neutral-300 bg-white shadow-sm" />,
      label: whiteLabel,
    },
    {
      value: "RANDOM",
      icon: <Shuffle className="h-3.5 w-3.5" />,
      label: randomLabel,
    },
    {
      value: "BLACK",
      icon: <div className="h-4 w-4 rounded-full border border-neutral-600 bg-neutral-900 shadow-sm" />,
      label: blackLabel,
    },
  ];

  return (
    <div className="space-y-3">
      <div className="text-xs font-black uppercase tracking-[0.22em] text-neutral-500">{label}</div>

      {/* Mobile: compact segmented control */}
      <div className="flex gap-2 sm:hidden">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={clsx(
              "flex flex-1 flex-col items-center gap-2 rounded-2xl border py-3 transition-all duration-200",
              value === opt.value
                ? "border-[var(--primary)]/50 bg-[var(--primary)]/10 text-white"
                : "border-white/10 bg-black/20 text-neutral-400 active:bg-black/30",
            )}
          >
            <div className={clsx(
              "flex h-8 w-8 items-center justify-center rounded-xl border border-white/10",
              value === opt.value ? "bg-white/10" : "bg-white/5",
            )}>
              {opt.icon}
            </div>
            <span className="text-[11px] font-bold leading-tight">{opt.label}</span>
            {value === opt.value && (
              <span className="h-1 w-4 rounded-full bg-[var(--primary)]" />
            )}
          </button>
        ))}
      </div>

      {/* Tablet/Desktop: card grid */}
      <div className="hidden grid-cols-3 gap-3 sm:grid">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={clsx(
              "rounded-2xl border p-4 text-left transition-all duration-200",
              value === opt.value
                ? "border-[var(--primary)]/50 bg-[var(--primary)]/10 text-white shadow-[0_12px_30px_rgba(249,115,22,0.12)]"
                : "border-white/10 bg-black/20 text-neutral-300 hover:border-white/15 hover:bg-black/30",
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5">
                {opt.icon}
              </div>
              {value === opt.value && (
                <span className="rounded-full bg-white/10 px-2 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-orange-100">
                  {selectedLabel}
                </span>
              )}
            </div>
            <div className="mt-4 text-sm font-black">{opt.label}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

function TimePicker({
  value,
  onChange,
  label,
  getTimeLabel,
}: {
  value: TimeOption;
  onChange: (t: TimeOption) => void;
  label: string;
  getTimeLabel: (minutes: TimeOption) => string;
}) {
  return (
    <div className="space-y-3">
      <div className="text-xs font-black uppercase tracking-[0.22em] text-neutral-500">{label}</div>

      {/* Mobile: horizontal chip row */}
      <div className="flex gap-2 sm:hidden">
        {TIME_OPTIONS.map((time) => (
          <button
            key={time}
            type="button"
            onClick={() => onChange(time)}
            className={clsx(
              "flex flex-1 flex-col items-center gap-2 rounded-2xl border py-3 transition-all duration-200",
              value === time
                ? "border-[var(--primary)]/50 bg-[var(--primary)]/10 text-white"
                : "border-white/10 bg-black/20 text-neutral-400 active:bg-black/30",
            )}
          >
            <div className={clsx(
              "flex h-8 w-8 items-center justify-center rounded-xl border border-white/10",
              value === time ? "bg-white/10" : "bg-white/5",
            )}>
              <Clock3 className="h-3.5 w-3.5 text-amber-300" />
            </div>
            <span className="text-[11px] font-bold leading-tight">{getTimeLabel(time)}</span>
            {value === time && (
              <span className="h-1 w-4 rounded-full bg-[var(--primary)]" />
            )}
          </button>
        ))}
      </div>

      {/* Tablet/Desktop: card grid */}
      <div className="hidden grid-cols-3 gap-3 sm:grid">
        {TIME_OPTIONS.map((time) => (
          <button
            key={time}
            type="button"
            onClick={() => onChange(time)}
            className={clsx(
              "rounded-2xl border p-4 text-left transition-all duration-200",
              value === time
                ? "border-[var(--primary)]/50 bg-[var(--primary)]/10 text-white"
                : "border-white/10 bg-black/20 text-neutral-300 hover:border-white/15 hover:bg-black/30",
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5">
                <Clock3 className="h-4 w-4 text-amber-300" />
              </div>
              <div className="rounded-full bg-white/5 px-2 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-neutral-500">
                {getTimeLabel(time)}
              </div>
            </div>
            <div className="mt-4 text-sm font-black">
              {getTimeLabel(time)}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function LocalTab() {
  const t = useTranslations("setupFriend");
  const router = useRouter();
  const { locale } = useParams<{ locale: string }>();
  const [color, setColor] = useState<ColorChoice>("WHITE");
  const [time, setTime] = useState<TimeOption>(10);
  const [passDevice, setPassDevice] = useState(true);

  const handlePlay = () => {
    const timeSeconds = time * 60;
    router.push(
      `/${locale}/game/local-pvp?color=${color}&time=${timeSeconds}&passDevice=${passDevice ? "1" : "0"}`,
    );
  };

  return (
    <div className="flex flex-col gap-5 sm:gap-6">
      <div className="rounded-2xl border border-white/10 bg-black/20 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-orange-400/20 bg-orange-400/10 text-orange-300 sm:h-11 sm:w-11">
            <Monitor className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
          <div>
            <div className="text-base font-black text-white sm:text-lg">{t("local.bannerTitle")}</div>
            <p className="mt-1.5 text-sm leading-6 text-neutral-300 sm:mt-2">{t("local.bannerDesc")}</p>
          </div>
        </div>
      </div>

      <ColorPicker
        value={color}
        onChange={setColor}
        label={t("local.playerOneColor")}
        whiteLabel={t("colors.white")}
        randomLabel={t("colors.random")}
        blackLabel={t("colors.black")}
        selectedLabel={locale === "sw" ? "Imechaguliwa" : "Selected"}
      />

      <TimePicker
        value={time}
        onChange={setTime}
        label={t("timeControl")}
        getTimeLabel={(minutes) => t("minutes", { minutes })}
      />

      <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-black/20 px-4 py-4">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-black text-white">{t("local.passDeviceTitle")}</div>
          <div className="mt-1 text-xs leading-5 text-neutral-400 sm:text-sm">{t("local.passDeviceDesc")}</div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={passDevice}
          onClick={() => setPassDevice((value) => !value)}
          className={clsx(
            "relative h-6 w-11 shrink-0 rounded-full border transition-colors duration-200",
            passDevice
              ? "border-[var(--primary)] bg-[var(--primary)]"
              : "border-neutral-600 bg-neutral-700",
          )}
        >
          <span
            className={clsx(
              "absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200",
              passDevice ? "translate-x-5" : "translate-x-0",
            )}
          />
        </button>
      </div>

      <Button onClick={handlePlay} size="lg" className="w-full text-base font-black">
        {t("local.playNow")}
      </Button>
    </div>
  );
}

function OnlineTab() {
  const t = useTranslations("setupFriend");
  const locale = useLocale();
  const router = useRouter();
  const { locale: routeLocale } = useParams<{ locale: string }>();
  const { isAuthenticated } = useAuthStore();
  const [view, setView] = useState<OnlineView>("choose");
  const [color, setColor] = useState<ColorChoice>("WHITE");
  const [time, setTime] = useState<TimeOption>(10);
  const [inviteCode, setInviteCode] = useState("");
  const [gameId, setGameId] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [ensuringGuest, setEnsuringGuest] = useState(false);

  const isSw = locale === "sw";
  const shareUrl = useMemo(
    () =>
      `${typeof window !== "undefined" ? window.location.origin : ""}/${routeLocale}/game/${gameId}?code=${inviteCode}`,
    [routeLocale, gameId, inviteCode],
  );

  const ensureGuestSession = async () => {
    if (isAuthenticated) return true;
    setEnsuringGuest(true);
    try {
      await authClient.createGuest();
      return true;
    } catch {
      setError(t("online.guestCreateFailed"));
      return false;
    } finally {
      setEnsuringGuest(false);
    }
  };

  const handleCreate = async () => {
    setError("");
    const ready = await ensureGuestSession();
    if (!ready) return;
    setView("creating");
    try {
      const timeMs = time * 60 * 1000;
      const res = await gameService.createInvite({ color, timeMs });
      setGameId(res.data.gameId);
      setInviteCode(res.data.inviteCode);
      setView("created");
    } catch {
      setError(t("online.createFailed"));
      setView("choose");
    }
  };

  const handleJoin = async () => {
    if (joinCode.trim().length < 4) {
      setError(t("online.invalidCodeInput"));
      return;
    }
    setError("");
    const ready = await ensureGuestSession();
    if (!ready) return;
    setView("joining-loading");
    try {
      const res = await gameService.joinInvite(joinCode.trim().toUpperCase());
      router.push(`/${routeLocale}/game/${res.data.gameId}`);
    } catch {
      setError(t("online.invalidOrExpiredCode"));
      setView("joining");
    }
  };

  const handleGoToGame = () => {
    router.push(`/${routeLocale}/game/${gameId}`);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (view === "creating") {
    return (
      <div className="flex flex-col items-center gap-5 rounded-2xl border border-white/10 bg-black/20 px-5 py-10 text-center">
        <Loader2 className="h-10 w-10 animate-spin text-[var(--primary)]" />
        <div className="text-base font-black text-white">{t("online.creatingGame")}</div>
      </div>
    );
  }

  if (view === "created") {
    return (
      <div className="flex flex-col gap-3 sm:gap-4">
        {/* Success banner */}
        <div className="flex items-center gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-300 sm:px-4 sm:py-3 sm:text-sm">
          <Check className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
          {t("online.gameCreated")}
        </div>

        {/* ── MOBILE: one unified card ── */}
        <div className="rounded-2xl border border-white/10 bg-black/20 sm:hidden">
          {/* Code row — code + tap-to-copy */}
          <button
            type="button"
            onClick={copyLink}
            className="flex w-full items-center justify-between gap-3 border-b border-white/10 px-4 py-3 transition active:bg-white/5"
          >
            <div className="text-left">
              <div className="mb-0.5 text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500">
                {t("online.inviteCode")}
              </div>
              <span className="font-mono text-lg font-black tracking-[0.18em] text-white">
                {inviteCode}
              </span>
            </div>
            <div className="flex shrink-0 items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-neutral-300">
              {copied ? (
                <><Check className="h-3.5 w-3.5 text-emerald-400" /><span className="text-emerald-400">Copied</span></>
              ) : (
                <><Copy className="h-3.5 w-3.5" /><span>Copy</span></>
              )}
            </div>
          </button>

          {/* QR + WhatsApp in a column */}
          <div className="flex flex-col items-center gap-3 p-4">
            <div className="rounded-xl border border-neutral-200 bg-white p-2">
              <QRCode value={shareUrl} size={96} />
            </div>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(`Join my Tanzania Drafti game!\n\nCode: ${inviteCode}\n${shareUrl}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-600/40 bg-emerald-600/10 px-3 py-2.5 text-sm font-bold text-emerald-300 transition active:bg-emerald-600/20"
            >
              <Smartphone className="h-4 w-4" />
              {isSw ? "Shirikisha kwa WhatsApp" : "Share via WhatsApp"}
            </a>
          </div>
        </div>

        {/* ── TABLET+: separate cards ── */}
        <div className="hidden sm:block">
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="text-xs font-black uppercase tracking-[0.22em] text-neutral-500">
              {t("online.inviteCode")}
            </div>
            <div className="mt-3 font-mono text-3xl font-black tracking-[0.28em] text-white">
              {inviteCode}
            </div>
          </div>
        </div>

        <div className="hidden gap-4 sm:grid sm:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white p-3">
            <div className="mb-2.5 flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-neutral-700">
              <QrCode className="h-3.5 w-3.5" />
              {t("online.scanToJoin")}
            </div>
            <div className="flex justify-center">
              <QRCode value={shareUrl} size={104} />
            </div>
          </div>

          <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-black/20 p-4">
            <div className="text-xs font-black uppercase tracking-[0.22em] text-neutral-500">
              {t("online.orCopyLink")}
            </div>
            <button
              type="button"
              onClick={copyLink}
              className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left transition hover:bg-white/10"
            >
              <span className="flex-1 truncate text-sm text-neutral-300">{shareUrl}</span>
              {copied ? (
                <Check className="h-4 w-4 shrink-0 text-emerald-400" />
              ) : (
                <Copy className="h-4 w-4 shrink-0 text-neutral-500" />
              )}
            </button>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(`Join my Tanzania Drafti game!\n\nCode: ${inviteCode}\n${shareUrl}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-emerald-600/40 bg-emerald-600/10 px-4 py-3 text-sm font-semibold text-emerald-300 transition hover:bg-emerald-600/20"
            >
              <Smartphone className="h-4 w-4" />
              {isSw ? "Shirikisha kwa WhatsApp" : "Share on WhatsApp"}
            </a>
          </div>
        </div>

        <Button onClick={handleGoToGame} size="lg" className="w-full text-sm font-black sm:text-base">
          {t("online.goToBoard")}
        </Button>
        <button
          type="button"
          onClick={() => {
            setView("choose");
            setInviteCode("");
            setGameId("");
            setCopied(false);
          }}
          className="text-xs text-neutral-500 transition hover:text-neutral-300 sm:text-sm"
        >
          {"<-"} {t("online.startOver")}
        </button>
      </div>
    );
  }

  if (view === "joining" || view === "joining-loading") {
    return (
      <div className="flex flex-col gap-5">
        <button
          type="button"
          onClick={() => {
            setView("choose");
            setError("");
          }}
          className="text-left text-sm text-neutral-500 transition hover:text-neutral-300"
        >
          {"<-"} {t("online.back")}
        </button>

        {error && (
          <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
            {error}
          </div>
        )}

        <div className="rounded-2xl border border-white/10 bg-black/20 p-4 sm:p-5">
          <div className="text-xs font-black uppercase tracking-[0.22em] text-neutral-500">
            {t("online.enterInviteCode")}
          </div>
          <input
            type="text"
            maxLength={6}
            value={joinCode}
            onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
            placeholder="ABC123"
            className="mt-4 w-full rounded-2xl border border-white/10 bg-neutral-950 px-4 py-4 text-center font-mono text-2xl tracking-[0.28em] text-white placeholder:text-neutral-600 focus:border-[var(--primary)] focus:outline-none"
          />
        </div>

        <Button
          onClick={handleJoin}
          disabled={view === "joining-loading" || ensuringGuest}
          size="lg"
          className="w-full text-base font-black"
        >
          {view === "joining-loading" || ensuringGuest ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            t("online.joinGame")
          )}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 sm:gap-6">
      <div className="rounded-2xl border border-white/10 bg-black/20 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-sky-400/20 bg-sky-400/10 text-sky-300 sm:h-11 sm:w-11">
            <Wifi className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
          <div>
            <div className="text-base font-black text-white sm:text-lg">{t("online.bannerTitle")}</div>
            <p className="mt-1.5 text-sm leading-6 text-neutral-300 sm:mt-2">{t("online.bannerDesc")}</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
          {error}
        </div>
      )}

      <ColorPicker
        value={color}
        onChange={setColor}
        label={t("online.yourColor")}
        whiteLabel={t("colors.white")}
        randomLabel={t("colors.random")}
        blackLabel={t("colors.black")}
        selectedLabel={locale === "sw" ? "Imechaguliwa" : "Selected"}
      />

      <TimePicker
        value={time}
        onChange={setTime}
        label={t("timeControl")}
        getTimeLabel={(minutes) => t("minutes", { minutes })}
      />

      <div className="grid gap-2.5 sm:gap-3">
        <Button
          onClick={handleCreate}
          disabled={ensuringGuest}
          size="lg"
          className="w-full text-base font-black"
        >
          <span className="inline-flex items-center justify-center gap-2">
            {ensuringGuest && <Loader2 className="h-5 w-5 animate-spin" />}
            <span>{t("online.createGame")}</span>
          </span>
        </Button>
        <button
          type="button"
          onClick={() => setView("joining")}
          className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-neutral-200 transition hover:bg-white/10 hover:text-white"
        >
          {t("online.joinWithCode")}
        </button>
      </div>
    </div>
  );
}

export default function SetupFriendPage() {
  const t = useTranslations("setupFriend");
  const locale = useLocale();
  const [activeTab, setActiveTab] = useState<Tab>("online");
  const isSw = locale === "sw";

  const tabs = [
    { value: "online" as const, icon: <Globe className="h-4 w-4" />, label: t("tabs.online") },
    { value: "local" as const, icon: <Monitor className="h-4 w-4" />, label: t("tabs.local") },
  ];

  const sectionCards = [
    {
      title: isSw ? "Mtandaoni binafsi" : "Private online",
      body: isSw
        ? "Unda mechi, tuma mwaliko, na muingie moja kwa moja bila queue ya random."
        : "Create a match, share the invite, and jump in directly without random queue.",
      icon: <Wifi className="h-4 w-4" />,
    },
    {
      title: isSw ? "Ana kwa ana" : "Face-to-face",
      body: isSw
        ? "Kama mpo pamoja, local mode inafanya kifaa kimoja kitumike na wachezaji wote wawili."
        : "If you are together, local mode lets both players use the same device.",
      icon: <Monitor className="h-4 w-4" />,
    },
    {
      title: isSw ? "Code au QR" : "Code or QR",
      body: isSw
        ? "Baada ya kuunda mechi, tumia code, link, au QR ili mwenzako ajiunge kwa haraka."
        : "After creating a match, use the code, link, or QR so your friend can join quickly.",
      icon: <QrCode className="h-4 w-4" />,
    },
  ];

  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-8 text-[var(--foreground)] sm:px-6 sm:py-10 lg:px-8 lg:py-14">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 lg:gap-8">

        {/* Hero */}
        <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] px-5 py-5 shadow-[0_24px_80px_rgba(0,0,0,0.28)] sm:px-6 sm:py-6 lg:px-8 lg:py-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(249,115,22,0.16),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(56,189,248,0.10),transparent_24%)]" />
          <div className="relative grid gap-6 lg:grid-cols-[1.08fr_0.92fr] lg:items-end">
            <div className="space-y-4 sm:space-y-5">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.22em] text-neutral-300">
                <Users className="h-3.5 w-3.5 text-[var(--primary)]" />
                {isSw ? "Cheza na rafiki" : "Play with a friend"}
              </div>
              <div className="space-y-2">
                <h1 className="text-3xl font-black leading-tight text-white sm:text-4xl lg:text-5xl">
                  {t("title")}
                </h1>
                <p className="hidden max-w-2xl text-base leading-7 text-neutral-300 sm:block sm:text-lg">
                  {t("subtitle")}
                </p>
              </div>
              <div className="hidden flex-wrap gap-3 lg:flex">
                <div className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-neutral-200">
                  <Globe className="h-4 w-4 text-sky-300" />
                  {isSw ? "Tuma link au code kwa mechi ya mtandaoni" : "Send a link or code for an online private match"}
                </div>
                <div className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-neutral-200">
                  <Monitor className="h-4 w-4 text-orange-300" />
                  {isSw ? "Au tumieni kifaa kimoja kucheza ana kwa ana" : "Or share one device for local face-to-face play"}
                </div>
              </div>
            </div>

            <div className="hidden gap-3 sm:grid-cols-3 lg:grid">
              <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4">
                <div className="text-2xl font-black text-white">2</div>
                <div className="mt-1 text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">
                  {isSw ? "Njia za kucheza" : "Play routes"}
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4">
                <div className="text-2xl font-black text-white">1v1</div>
                <div className="mt-1 text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">
                  {isSw ? "Aina ya mechi" : "Match format"}
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4">
                <div className="text-2xl font-black text-white">{TIME_OPTIONS.length}</div>
                <div className="mt-1 text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">
                  {isSw ? "Muda wa kawaida" : "Clock presets"}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Main content */}
        <section className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr] lg:gap-6">

          {/* Tab card */}
          <div className="rounded-[2rem] border border-white/10 bg-[var(--secondary)]/55 p-5 shadow-[0_18px_50px_rgba(0,0,0,0.2)] sm:p-7">
            <div className="mb-5 flex gap-1 rounded-2xl border border-white/10 bg-black/20 p-1.5 sm:mb-6">
              {tabs.map(({ value, icon, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setActiveTab(value)}
                  className={clsx(
                    "flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-semibold transition-all",
                    activeTab === value
                      ? "bg-[var(--primary)] text-white shadow"
                      : "text-neutral-400 hover:text-neutral-200",
                  )}
                >
                  {icon}
                  {label}
                </button>
              ))}
            </div>

            {activeTab === "local" ? <LocalTab /> : <OnlineTab />}
          </div>

          {/* Side info — desktop only */}
          <div className="hidden space-y-4 lg:block">
            {sectionCards.map((card) => (
              <SectionCard key={card.title} {...card} />
            ))}
          </div>
        </section>

        {/* Info cards — mobile/tablet only, shown below the main card */}
        <section className="grid gap-3 sm:grid-cols-3 lg:hidden">
          {sectionCards.map((card) => (
            <SectionCard key={card.title} {...card} />
          ))}
        </section>

      </div>
    </main>
  );
}
