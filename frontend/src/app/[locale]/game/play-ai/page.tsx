"use client";

import { useEffect } from "react";
import { useRouter } from "@/i18n/routing";
import { getSavedGameInfo } from "@/hooks/useLocalGame";
import { isMobileApp } from "@/lib/game/platform";

/**
 * Smart entry point for "Play with AI".
 * - If there is an in-progress game in localStorage, jump straight into it.
 * - Otherwise land on the bot-selection page.
 *
 * Uses router.replace so this redirect page never appears in the browser
 * history stack — pressing back from the game goes home, not here.
 */
export default function PlayAiRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    // Resume logic only applies to the mobile app experience.
    // On desktop, we always go to the setup page first.
    if (isMobileApp()) {
      const saved = getSavedGameInfo();
      if (saved) {
        const { level, playerColor, timeSeconds } = saved;
        const color = playerColor === "WHITE" ? "WHITE" : "BLACK";
        router.replace(`/game/local?level=${level}&color=${color}&time=${timeSeconds}`);
        return;
      }
    }
    
    router.replace("/game/setup-ai");
  }, [router]);

  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="w-7 h-7 rounded-full border-2 border-neutral-400/30 border-t-neutral-300 animate-spin" />
    </main>
  );
}
