"use client";

import React from "react";
import { Link } from "@/i18n/routing";
import { HeroBoard } from "@/components/hero/HeroBoard";
import { Button } from "@/components/ui/Button";
import { useTranslations } from "next-intl";

export default function Home() {
  const t = useTranslations("hero");

  return (
    <main className="min-h-screen bg-[var(--background)] flex flex-col items-center justify-center px-4 py-6 sm:py-8">
      <div className="max-w-5xl w-full">
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10 items-center">
          <div className="relative order-2 lg:order-1 flex justify-center lg:justify-start">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[105%] h-[105%] bg-orange-500/10 blur-[80px] rounded-full pointer-events-none" />
            <div className="relative w-full max-w-[430px] transform lg:rotate-[-1deg] transition-transform duration-500 hover:scale-[1.01]">
              <div className="absolute inset-0 bg-black/35 blur-xl rounded-2xl transform translate-y-5" />
              <HeroBoard />
            </div>
          </div>

          <div className="flex flex-col gap-6 text-center lg:text-left order-1 lg:order-2">
            <div className="space-y-3">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-[#EDEDED] leading-[1.05]">
                {t("title")}
              </h1>
              <p className="text-base sm:text-lg text-neutral-400 max-w-md mx-auto lg:mx-0 leading-relaxed">
                {t("subtitle")}
              </p>
            </div>

            <div className="flex flex-col gap-3 max-w-sm mx-auto lg:mx-0 w-full">
              <Link href="/play" className="w-full">
                <Button size="lg" className="w-full gap-3">
                  <span className="text-xl">{t("landing.cta.playBadge")}</span>
                  <div className="flex flex-col items-start leading-none">
                    <span className="font-bold">{t("playOnline")}</span>
                    <span className="text-xs font-normal opacity-80">
                      {t("features.online")}
                    </span>
                  </div>
                </Button>
              </Link>

              <Link href="/game/setup-ai" className="w-full">
                <Button variant="secondary" size="lg" className="w-full gap-3">
                  <span className="text-xl">{t("landing.cta.aiBadge")}</span>
                  <div className="flex flex-col items-start leading-none">
                    <span className="font-bold">{t("playComputer")}</span>
                    <span className="text-xs font-normal opacity-80">
                      {t("landing.cta.aiSubtitle")}
                    </span>
                  </div>
                </Button>
              </Link>
            </div>

            <div className="flex items-center justify-center lg:justify-start gap-5 text-neutral-500 text-xs sm:text-sm font-medium pt-1">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span>{t("landing.stats.playersOnline")}</span>
              </div>
              <div>|</div>
              <div>{t("landing.stats.gamesToday")}</div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
