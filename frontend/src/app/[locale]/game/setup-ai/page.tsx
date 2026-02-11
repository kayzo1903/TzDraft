"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";

import { useAuthStore } from "@/lib/auth/auth-store";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { BOTS } from "@/lib/game/bots";

export default function SetupAiPage() {
  const t = useTranslations("setupAi");
  const router = useRouter();
  const params = useParams<{ locale: string }>();
  const locale = typeof params?.locale === "string" ? params.locale : "en";
  const { user } = useAuthStore();

  const [selectedBot, setSelectedBot] = useState(BOTS[0]);
  const [selectedColor, setSelectedColor] = useState<
    "WHITE" | "BLACK" | "RANDOM"
  >("RANDOM");
  const [selectedTime, setSelectedTime] = useState<0 | 5 | 10 | 15>(0);
  const [loading, setLoading] = useState(false);

  const handleStartGame = async () => {
    setLoading(true);
    try {
      let finalColor = selectedColor;
      if (finalColor === "RANDOM") {
        finalColor = Math.random() < 0.5 ? "WHITE" : "BLACK";
      }

      const timeSeconds = selectedTime === 0 ? 0 : selectedTime * 60;
      router.push(
        `/${locale}/game/local?level=${selectedBot.level}&color=${finalColor}&time=${timeSeconds}`,
      );
    } catch (error) {
      console.error("Failed to create game:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--background)] flex flex-col items-center justify-center p-6 text-foreground">
      <div className="max-w-4xl w-full space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold">{t("title")}</h1>
          <p className="text-muted-foreground">{t("subtitle")}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">{t("selectOpponent")}</h2>
            <div className="grid grid-cols-1 gap-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
              {BOTS.map((bot) => (
                <Card
                  key={bot.level}
                  className={`p-4 cursor-pointer transition-all hover:bg-neutral-800 border-2 flex items-center gap-4 ${
                    selectedBot.level === bot.level
                      ? "border-orange-500 bg-neutral-800"
                      : "border-transparent bg-neutral-900"
                  }`}
                  onClick={() => setSelectedBot(bot)}
                >
                  <div className="relative w-12 h-12 rounded-full bg-neutral-950/40 border border-neutral-700 overflow-hidden shrink-0">
                    <Image
                      src={bot.avatarSrc}
                      alt={bot.name}
                      fill
                      sizes="48px"
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <div className="font-bold">{bot.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {bot.description}
                    </div>
                  </div>
                  <div className="font-mono text-sm font-bold text-orange-400">
                    {bot.elo}
                  </div>
                </Card>
              ))}
            </div>
          </div>

          <div className="space-y-8 flex flex-col h-full">
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">{t("selectTime")}</h2>
              <div className="flex gap-4">
                {[0, 5, 10, 15].map((time) => (
                  <button
                    key={time}
                    onClick={() => setSelectedTime(time as any)}
                    className={`
                      flex-1 py-3 px-4 rounded-xl border-2 transition-all duration-200
                      flex flex-col items-center justify-center gap-1
                      ${
                        selectedTime === time
                          ? "bg-orange-500 border-orange-500 text-white"
                          : "bg-neutral-900 border-neutral-700 text-neutral-400 hover:bg-neutral-800 hover:border-neutral-600"
                      }
                    `}
                  >
                    <span className="text-xl font-bold">
                      {time === 0
                        ? t("time.noTime")
                        : t("time.minutes", { minutes: time })}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <h2 className="text-xl font-semibold">{t("selectColor")}</h2>
              <div className="grid grid-cols-3 gap-4">
                <button
                  type="button"
                  onClick={() => setSelectedColor("WHITE")}
                  className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                    selectedColor === "WHITE"
                      ? "border-orange-500 bg-neutral-800"
                      : "border-neutral-700 bg-neutral-900 hover:bg-neutral-800"
                  }`}
                >
                  <div className="w-8 h-8 rounded-full bg-white border border-neutral-300" />
                  <span className="font-medium">{t("colors.white")}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedColor("RANDOM")}
                  className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                    selectedColor === "RANDOM"
                      ? "border-orange-500 bg-neutral-800"
                      : "border-neutral-700 bg-neutral-900 hover:bg-neutral-800"
                  }`}
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-white to-black border border-neutral-600" />
                  <span className="font-medium">{t("colors.random")}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedColor("BLACK")}
                  className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                    selectedColor === "BLACK"
                      ? "border-orange-500 bg-neutral-800"
                      : "border-neutral-700 bg-neutral-900 hover:bg-neutral-800"
                  }`}
                >
                  <div className="w-8 h-8 rounded-full bg-black border border-neutral-600" />
                  <span className="font-medium">{t("colors.black")}</span>
                </button>
              </div>
            </div>

            <div className="flex-1 bg-neutral-900 rounded-xl p-6 border border-neutral-800 flex flex-col items-center justify-center text-center gap-4 min-h-[200px]">
              <div className="text-muted-foreground uppercase text-xs tracking-wider font-bold">
                {t("preview.title")}
              </div>
              <div className="flex items-center gap-8">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-16 h-16 rounded-full bg-neutral-700 overflow-hidden flex items-center justify-center text-2xl">
                    {"\u{1F464}"}
                  </div>
                  <div className="font-bold">
                    {user?.username || t("preview.you")}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {typeof user?.rating === "object"
                      ? (user.rating as any).rating
                      : user?.rating || 1200}
                  </div>
                </div>
                <div className="text-2xl font-black text-orange-500">
                  {t("preview.vs")}
                </div>
                <div className="flex flex-col items-center gap-2">
                  <div className="w-16 h-16 rounded-full bg-neutral-700 overflow-hidden flex items-center justify-center text-3xl">
                    <div className="relative w-full h-full">
                      <Image
                        src={selectedBot.avatarSrc}
                        alt={selectedBot.name}
                        fill
                        sizes="64px"
                        className="object-cover"
                      />
                    </div>
                  </div>
                  <div className="font-bold">{selectedBot.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {selectedBot.elo}
                  </div>
                </div>
              </div>
              <div className="mt-2 text-sm text-neutral-500 font-mono">
                {t("preview.timeControl")}:{" "}
                {selectedTime === 0
                  ? t("time.noTime")
                  : t("time.minutes", { minutes: selectedTime })}
              </div>
            </div>

            <Button
              size="lg"
              className="w-full text-lg font-bold py-6"
              onClick={handleStartGame}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  {t("start.loading")}
                </>
              ) : (
                t("start.cta")
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

