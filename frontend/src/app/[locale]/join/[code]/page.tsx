"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useRouter } from "@/i18n/routing";

const APP_SCHEME = "tzdraft-mobile";

export default function JoinDeepLinkPage() {
  const { code } = useParams<{ code: string }>();
  const router = useRouter();
  const [appOpened, setAppOpened] = useState(false);

  useEffect(() => {
    if (!code) return;

    const upperCode = code.toUpperCase();

    // Try to open the native app via custom scheme
    const appUrl = `${APP_SCHEME}://join/${upperCode}`;
    window.location.href = appUrl;

    // If the app is not installed, the browser stays on this page.
    // After 1.5 s redirect to the web join UI with the code prefilled.
    const timer = setTimeout(() => {
      setAppOpened(false);
      router.replace(`/game/setup-friend?join=${upperCode}`);
    }, 1500);

    // If the page visibilityState changes (app took focus), cancel the redirect
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        clearTimeout(timer);
        setAppOpened(true);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [code, router]);

  if (appOpened) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#0a0a0a] px-6 text-center">
        <div className="text-4xl">✓</div>
        <p className="text-lg font-black text-white">Opening TzDraft…</p>
        <p className="text-sm text-neutral-400">Switch back to the app to join the game.</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#0a0a0a] px-6 text-center">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-neutral-700 border-t-orange-500" />
      <p className="text-lg font-black text-white">Opening TzDraft…</p>
      <p className="text-sm text-neutral-400">
        Code: <span className="font-mono font-bold tracking-widest text-white">{code?.toUpperCase()}</span>
      </p>
    </div>
  );
}
