"use client";

import React, { useState } from "react";
import { Clock, Search, X } from "lucide-react";
import clsx from "clsx";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useAuthStore } from "@/lib/auth/auth-store";
import { Button } from "@/components/ui/Button";
import {
  useMatchmaking,
  QUEUE_TIME_OPTIONS,
  type QueueTimeMs,
} from "@/hooks/useMatchmaking";

export default function SetupOnlinePage() {
  const t = useTranslations("setupOnline");
  const { state, error, joinQueue, cancelQueue } = useMatchmaking();
  const { isAuthenticated } = useAuthStore();
  const [selectedTime, setSelectedTime] = useState<QueueTimeMs>(300000);

  return (
    <main className="min-h-screen flex flex-col items-center justify-start px-4 py-8 sm:py-12">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="flex flex-col items-center gap-3 mb-8">
          <div className="w-14 h-14 rounded-2xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center">
            <Search className="w-7 h-7 text-purple-400" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-black text-white">{t("title")}</h1>
            <p className="text-sm text-neutral-500 mt-1">{t("subtitle")}</p>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-neutral-700/50 bg-neutral-900/60 p-5">
          {!isAuthenticated ? (
            <div className="flex flex-col gap-4">
              <div className="flex items-start gap-3 rounded-xl border border-neutral-700/50 bg-neutral-800/30 p-4">
                <Search className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
                <div className="text-sm text-neutral-300">
                  <span className="font-semibold text-white">{t("bannerTitle")}</span>{" "}
                  — {t("bannerDescShort")}
                </div>
              </div>
              <Link
                href="/auth/signin"
                className="block rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300 hover:border-amber-400/50 hover:text-amber-200 transition-colors"
              >
                {t("authRequired")}
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              <div className="flex items-start gap-3 rounded-xl border border-neutral-700/50 bg-neutral-800/30 p-4">
                <Search className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
                <div className="text-sm text-neutral-300">
                  <span className="font-semibold text-white">{t("bannerTitle")}</span>{" "}
                  — {t("bannerDesc")}
                </div>
              </div>

              {error && (
                <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
                  {error}
                </div>
              )}

              {state !== "searching" && (
                <>
                  <div>
                    <div className="text-xs uppercase tracking-widest text-neutral-500 font-semibold mb-2">
                      {t("timeControl")}
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {QUEUE_TIME_OPTIONS.map((opt) => (
                        <button
                          key={opt.ms}
                          type="button"
                          onClick={() => setSelectedTime(opt.ms)}
                          className={clsx(
                            "flex flex-col items-center gap-1 rounded-xl border py-3 text-xs font-semibold transition-all",
                            selectedTime === opt.ms
                              ? "border-[var(--primary)] bg-[var(--primary)]/10 text-white"
                              : "border-neutral-700 bg-neutral-800/40 text-neutral-400 hover:border-neutral-600 hover:text-neutral-200",
                          )}
                        >
                          <Clock className="w-3.5 h-3.5 opacity-70" />
                          <span>{opt.label}</span>
                          <span className="text-[10px] opacity-60">{opt.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <Button
                    onClick={() => joinQueue(selectedTime)}
                    className="w-full py-3 text-base font-bold"
                  >
                    {t("findOpponent")}
                  </Button>
                </>
              )}

              {state === "searching" && (
                <div className="flex flex-col items-center gap-5 py-6">
                  <div className="relative flex items-center justify-center w-16 h-16">
                    <div className="absolute inset-0 rounded-full border-2 border-purple-500/30 animate-ping" />
                    <Search className="w-7 h-7 text-purple-400" />
                  </div>
                  <div className="text-center">
                    <div className="text-white font-semibold">{t("searching")}</div>
                    <div className="text-xs text-neutral-500 mt-1">
                      {QUEUE_TIME_OPTIONS.find((o) => o.ms === selectedTime)?.name} ·{" "}
                      {QUEUE_TIME_OPTIONS.find((o) => o.ms === selectedTime)?.label}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={cancelQueue}
                    className="flex items-center gap-2 rounded-xl border border-neutral-700 bg-neutral-800/40 px-5 py-2.5 text-sm font-semibold text-neutral-300 hover:bg-neutral-800 hover:text-white transition"
                  >
                    <X className="w-4 h-4" />
                    {t("cancel")}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
