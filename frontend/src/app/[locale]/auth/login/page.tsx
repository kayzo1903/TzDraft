"use client";

import React, { useEffect, useState } from "react";
import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/Button";
import GoogleSignInButton from "@/components/auth/GoogleSignInButton";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth/auth-client";
import { HeroBoard } from "@/components/hero/HeroBoard";
import { PasswordInput } from "@/components/auth/password-input";
import { Loader2 } from "lucide-react";

const heroStats = [
  { labelKey: "heroStats.blitzGames", value: "83" },
  { labelKey: "heroStats.playersOnline", value: "412" },
  { labelKey: "heroStats.tournaments", value: "5" },
  { labelKey: "heroStats.topRating", value: "2098" },
];

export default function LoginPage() {
  const t = useTranslations("auth");
  const router = useRouter();

  const [showHeroBoard, setShowHeroBoard] = useState(false);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 1024px)");
    const update = () => setShowHeroBoard(mediaQuery.matches);
    update();

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", update);
      return () => mediaQuery.removeEventListener("change", update);
    }

    mediaQuery.addListener(update);
    return () => mediaQuery.removeListener(update);
  }, []);

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      await authClient.login({ identifier, password });
      router.push("/");
    } catch {
      setError(t("errors.unexpected"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#020205] text-white">
      <div className="relative isolate overflow-hidden">
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top,_rgba(249,115,22,0.3),_transparent_45%)]" />
        <div className="relative z-10 max-w-6xl mx-auto px-4 py-16 lg:py-20 space-y-10 lg:space-y-0 lg:flex lg:items-stretch lg:gap-10">
          <div className="lg:w-1/2 space-y-8">
            <div className="flex items-center justify-between text-xs uppercase tracking-[0.5em] text-neutral-500">
              <span>{t("login.station")}</span>
              <span>{t("login.chapter")}</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black leading-tight mt-4">{t("login.heroTitle")}</h1>
            <p className="mt-3 text-base text-neutral-400 max-w-2xl">
              {t("login.heroDescription")}
            </p>
             <div className="grid grid-cols-2 gap-4">
               {heroStats.map((stat) => (
                 <div key={stat.labelKey} className="rounded-2xl border border-white/5 bg-[#111] p-4">
                   <div className="text-3xl font-black">{stat.value}</div>
                   <div className="text-[10px] uppercase tracking-[0.6em] text-neutral-500 mt-1">{t(stat.labelKey)}</div>
                 </div>
               ))}
             </div>
             {showHeroBoard && (
               <div className="hidden lg:block relative rounded-[32px] border border-white/5 bg-black/40 p-6 overflow-hidden shadow-[0_45px_120px_rgba(0,0,0,0.55)]">
                 <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle,_rgba(37,99,235,0.25),_transparent_65%)]" />
                 <div className="relative">
                   <HeroBoard />
                 </div>
               </div>
             )}
           </div>
           <div className="lg:w-1/2">
             <div className="rounded-[32px] border border-white/10 bg-[#111111]/80 shadow-[0_40px_120px_rgba(0,0,0,0.65)]">
               <div className="p-8 space-y-6">
                <div className="text-xs uppercase tracking-[0.5em] text-neutral-500">{t("login.base")}</div>
                <div className="space-y-2">
                  <h2 className="text-3xl font-black">{t("login.title")}</h2>
                  <p className="text-sm text-neutral-400">{t("login.subtitle")}</p>
                </div>
                {error && (
                  <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-400">
                    {error}
                  </div>
                )}
                <form className="space-y-4" onSubmit={handleEmailSignIn}>
                  <div className="space-y-2">
                  <input
                    type="text"
                    placeholder={t("login.identifierPlaceholder")}
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    required
                    className="w-full px-4 py-3 bg-[#1a1a1a] border border-transparent rounded-2xl focus:border-[#81b64c] focus:ring-2 focus:ring-[#81b64c]/50 text-white placeholder:text-neutral-500 outline-none transition-all"
                  />
                  <p className="text-xs text-neutral-500">{t("login.identifierHint")}</p>
                </div>
                <div className="space-y-2">
                  <PasswordInput
                    value={password}
                    onChange={setPassword}
                    label=""
                    placeholder={t("fields.password")}
                  />
                </div>
                  <div className="flex items-center justify-between text-sm">
                    <label className="flex items-center gap-2 text-neutral-400 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="rounded border-neutral-600 bg-[#1a1a1a] text-[#81b64c] focus:ring-[#81b64c]"
                      />
                      {t("login.rememberMe")}
                    </label>
                    <Link href="/auth/forgot-password" className="text-xs uppercase tracking-[0.4em] text-neutral-500 hover:text-white">
                      {t("login.forgotPassword")}
                    </Link>
                  </div>
                  <Button type="submit" disabled={isLoading} className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#f97316] to-[#ea580c]">
                    {isLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        {t("login.buttonLoading")}
                      </span>
                    ) : (
                      t("login.button")
                    )}
                  </Button>
                </form>
                <div className="relative flex items-center my-4">
                  <span className="flex-grow border-t border-white/10" />
                  <span className="px-3 text-[10px] uppercase tracking-[0.6em] text-neutral-500">{t("or")}</span>
                  <span className="flex-grow border-t border-white/10" />
                </div>
                <GoogleSignInButton text={t("google")} />
                <p className="text-center text-sm text-neutral-500">
                  {t("login.noAccount")}{" "}
                  <Link href="/auth/signup" className="text-[#81b64c] font-bold">
                    {t("login.signupLink")}
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
