"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Check,
  Clock,
  Copy,
  Globe,
  Loader2,
  Monitor,
  Shuffle,
  Users,
  Wifi,
} from "lucide-react";
import clsx from "clsx";
import QRCode from "react-qr-code";
import { useTranslations } from "next-intl";
import { useAuthStore } from "@/lib/auth/auth-store";
import { authClient } from "@/lib/auth/auth-client";
import { Button } from "@/components/ui/Button";
import { gameService } from "@/services/game.service";

const TIME_OPTIONS = [5, 10, 15] as const;
type TimeOption = (typeof TIME_OPTIONS)[number];

type ColorChoice = "WHITE" | "BLACK" | "RANDOM";

function ColorPicker({
  value,
  onChange,
  label,
  whiteLabel,
  randomLabel,
  blackLabel,
}: {
  value: ColorChoice;
  onChange: (c: ColorChoice) => void;
  label: string;
  whiteLabel: string;
  randomLabel: string;
  blackLabel: string;
}) {
  const options: { value: ColorChoice; icon: React.ReactNode; label: string }[] = [
    {
      value: "WHITE",
      icon: (
        <div className="w-5 h-5 rounded-full bg-white border border-neutral-400 shadow-sm" />
      ),
      label: whiteLabel,
    },
    {
      value: "RANDOM",
      icon: <Shuffle className="w-4 h-4" />,
      label: randomLabel,
    },
    {
      value: "BLACK",
      icon: (
        <div className="w-5 h-5 rounded-full bg-neutral-900 border border-neutral-600 shadow-sm" />
      ),
      label: blackLabel,
    },
  ];

  return (
    <div>
      <div className="text-xs uppercase tracking-widest text-neutral-500 font-semibold mb-2">
        {label}
      </div>
      <div className="flex gap-2">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={clsx(
              "flex-1 flex flex-col items-center gap-1.5 rounded-xl border py-3 text-xs font-semibold transition-all",
              value === opt.value
                ? "border-[var(--primary)] bg-[var(--primary)]/10 text-white"
                : "border-neutral-700 bg-neutral-800/40 text-neutral-400 hover:border-neutral-600 hover:text-neutral-200",
            )}
          >
            <span
              className={
                value === opt.value ? "text-white" : "text-neutral-400"
              }
            >
              {opt.icon}
            </span>
            {opt.label}
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
    <div>
      <div className="text-xs uppercase tracking-widest text-neutral-500 font-semibold mb-2">
        {label}
      </div>
      <div className="flex gap-2">
        {TIME_OPTIONS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => onChange(t)}
            className={clsx(
              "flex-1 flex items-center justify-center gap-1.5 rounded-xl border py-2.5 text-sm font-semibold transition-all",
              value === t
                ? "border-[var(--primary)] bg-[var(--primary)]/10 text-white"
                : "border-neutral-700 bg-neutral-800/40 text-neutral-400 hover:border-neutral-600 hover:text-neutral-200",
            )}
          >
            <Clock className="w-3.5 h-3.5 opacity-70" />
            {getTimeLabel(t)}
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
    <div className="flex flex-col gap-6">
      <div className="flex items-start gap-3 rounded-xl border border-neutral-700/50 bg-neutral-800/30 p-4">
        <Monitor className="w-5 h-5 text-orange-400 shrink-0 mt-0.5" />
        <div className="text-sm text-neutral-300">
          <span className="font-semibold text-white">{t("local.bannerTitle")}</span>{" "}
          - {t("local.bannerDesc")}
        </div>
      </div>

      <ColorPicker
        value={color}
        onChange={setColor}
        label={t("local.playerOneColor")}
        whiteLabel={t("colors.white")}
        randomLabel={t("colors.random")}
        blackLabel={t("colors.black")}
      />
      <TimePicker
        value={time}
        onChange={setTime}
        label={t("timeControl")}
        getTimeLabel={(minutes) => t("minutes", { minutes })}
      />

      <div className="flex items-center justify-between rounded-xl border border-neutral-700/50 bg-neutral-800/30 px-4 py-3">
        <div>
          <div className="text-sm font-semibold text-neutral-200">
            {t("local.passDeviceTitle")}
          </div>
          <div className="text-xs text-neutral-500 mt-0.5">
            {t("local.passDeviceDesc")}
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={passDevice}
          onClick={() => setPassDevice((v) => !v)}
          className={clsx(
            "relative w-11 h-6 rounded-full border transition-colors duration-200",
            passDevice
              ? "bg-[var(--primary)] border-[var(--primary)]"
              : "bg-neutral-700 border-neutral-600",
          )}
        >
          <span
            className={clsx(
              "absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200",
              passDevice ? "translate-x-5" : "translate-x-0",
            )}
          />
        </button>
      </div>

      <Button onClick={handlePlay} className="w-full py-3 text-base font-bold">
        {t("local.playNow")}
      </Button>
    </div>
  );
}

type OnlineView = "choose" | "creating" | "created" | "joining" | "joining-loading";

function OnlineTab() {
  const t = useTranslations("setupFriend");
  const router = useRouter();
  const { locale } = useParams<{ locale: string }>();
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

  const handleGoToGame = () => {
    router.push(`/${locale}/game/${gameId}`);
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
      router.push(`/${locale}/game/${res.data.gameId}`);
    } catch {
      setError(t("online.invalidOrExpiredCode"));
      setView("joining");
    }
  };

  const copyLink = () => {
    const url = `${window.location.origin}/${locale}/game/${gameId}?code=${inviteCode}`;
    navigator.clipboard.writeText(url).catch(() => { });
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (view === "choose") {
    return (
      <div className="flex flex-col gap-5">
        <div className="flex items-start gap-3 rounded-xl border border-neutral-700/50 bg-neutral-800/30 p-4">
          <Wifi className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
          <div className="text-sm text-neutral-300">
            <span className="font-semibold text-white">{t("online.bannerTitle")}</span>{" "}
            - {t("online.bannerDesc")}
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
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
        />
        <TimePicker
          value={time}
          onChange={setTime}
          label={t("timeControl")}
          getTimeLabel={(minutes) => t("minutes", { minutes })}
        />

        <div className="flex flex-col gap-2">
          <Button
            onClick={handleCreate}
            disabled={ensuringGuest}
            className="w-full py-3 text-base font-bold"
          >
            {ensuringGuest ? <Loader2 className="w-5 h-5 animate-spin" /> : t("online.createGame")}
          </Button>
          <button
            type="button"
            onClick={() => setView("joining")}
            className="w-full rounded-xl border border-neutral-700 bg-neutral-800/40 px-4 py-2.5 text-sm font-semibold text-neutral-300 hover:bg-neutral-800 hover:text-white transition"
          >
            {t("online.joinWithCode")}
          </button>
        </div>
      </div>
    );
  }

  if (view === "creating") {
    return (
      <div className="flex flex-col items-center gap-4 py-10">
        <Loader2 className="w-10 h-10 text-orange-400 animate-spin" />
        <div className="text-sm text-neutral-400">{t("online.creatingGame")}</div>
      </div>
    );
  }

  if (view === "created") {
    const shareUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/${locale}/game/${gameId}?code=${inviteCode}`;
    return (
      <div className="flex flex-col gap-5">
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300 flex items-center gap-2">
          <Check className="w-4 h-4 shrink-0" />
          {t("online.gameCreated")}
        </div>

        <div>
          <div className="text-xs uppercase tracking-widest text-neutral-500 font-semibold mb-2">
            {t("online.inviteCode")}
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-3">
            <span className="flex-1 font-mono text-2xl tracking-[0.3em] text-white font-bold">
              {inviteCode}
            </span>
          </div>
        </div>

        <div>
          <div className="text-xs uppercase tracking-widest text-neutral-500 font-semibold mb-2">
            {t("online.scanToJoin")}
          </div>
          <div className="flex justify-center rounded-xl border border-neutral-700 bg-white p-4">
            <QRCode value={shareUrl} size={160} />
          </div>
        </div>

        <div>
          <div className="text-xs uppercase tracking-widest text-neutral-500 font-semibold mb-2">
            {t("online.orCopyLink")}
          </div>
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={copyLink}
              className="w-full flex items-center gap-3 rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-3 text-left hover:border-neutral-600 transition"
            >
              <span className="flex-1 text-sm text-neutral-300 truncate">{shareUrl}</span>
              {copied ? (
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <Copy className="w-4 h-4 text-neutral-500 shrink-0" />
              )}
            </button>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(`🎮 Join my Tanzania Drafti game!\n\nCode: ${inviteCode}\n${shareUrl}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 rounded-xl border border-emerald-600/40 bg-emerald-600/10 px-4 py-3 text-sm font-semibold text-emerald-300 hover:bg-emerald-600/20 transition"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current shrink-0" aria-hidden>
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
              </svg>
              Share on WhatsApp
            </a>
          </div>
        </div>

        <Button onClick={handleGoToGame} className="w-full py-3 text-base font-bold">
          {t("online.goToBoard")}
        </Button>
        <button
          type="button"
          onClick={() => {
            setView("choose");
            setInviteCode("");
            setGameId("");
          }}
          className="w-full text-sm text-neutral-500 hover:text-neutral-300 transition py-1"
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
          className="text-sm text-neutral-500 hover:text-neutral-300 transition text-left"
        >
          {"<-"} {t("online.back")}
        </button>

        {error && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
            {error}
          </div>
        )}

        <div>
          <div className="text-xs uppercase tracking-widest text-neutral-500 font-semibold mb-2">
            {t("online.enterInviteCode")}
          </div>
          <input
            type="text"
            maxLength={6}
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            placeholder="ABC123"
            className="w-full rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-3 text-center font-mono text-2xl tracking-[0.3em] text-white placeholder:text-neutral-600 focus:outline-none focus:border-[var(--primary)]"
          />
        </div>

        <Button
          onClick={handleJoin}
          disabled={view === "joining-loading" || ensuringGuest}
          className="w-full py-3 text-base font-bold"
        >
          {view === "joining-loading" || ensuringGuest ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            t("online.joinGame")
          )}
        </Button>
      </div>
    );
  }

  return null;
}

type Tab = "local" | "online";

export default function SetupFriendPage() {
  const t = useTranslations("setupFriend");
  const [activeTab, setActiveTab] = useState<Tab>("online");

  const tabs = [
    { value: "online" as const, icon: <Globe className="w-4 h-4" />, label: t("tabs.online") },
    { value: "local" as const, icon: <Monitor className="w-4 h-4" />, label: t("tabs.local") },
  ];

  return (
    <main className="min-h-screen flex flex-col items-center justify-start px-4 py-8 sm:py-12">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center gap-3 mb-8">
          <div className="w-14 h-14 rounded-2xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center">
            <Users className="w-7 h-7 text-orange-400" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-black text-white">{t("title")}</h1>
            <p className="text-sm text-neutral-500 mt-1">{t("subtitle")}</p>
          </div>
        </div>

        <div className="flex gap-1 rounded-xl border border-neutral-700/60 bg-neutral-800/40 p-1 mb-6">
          {tabs.map(({ value, icon, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setActiveTab(value)}
              className={clsx(
                "flex-1 flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition-all",
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

        <div className="rounded-2xl border border-neutral-700/50 bg-neutral-900/60 p-5">
          {activeTab === "local" && <LocalTab />}
          {activeTab === "online" && <OnlineTab />}
        </div>
      </div>
    </main>
  );
}
