"use client";

import React, { useState } from "react";
import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/Button";
import { GoogleAuthButton } from "@/components/auth/GoogleAuthButton";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { signIn } from "@/lib/auth-client";

export default function LoginPage() {
  const t = useTranslations("auth");
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const { error: authError } = await signIn.email(
        {
          email,
          password,
          rememberMe,
          callbackURL: "/",
        },
        {
          onSuccess: () => {
            router.push("/");
          },
          onError: (ctx) => {
            setError(ctx.error.message || t("errors.invalidCredentials"));
          },
        },
      );

      if (authError) {
        setError(authError.message || t("errors.invalidCredentials"));
      }
    } catch {
      setError(t("errors.unexpected"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await signIn.social({
        provider: "google",
        callbackURL: window.location.origin,
      });
    } catch {
      setError(t("errors.googleFailed"));
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center md:text-left space-y-2">
        <h1 className="text-3xl font-black text-white">{t("login.title")}</h1>
        <p className="text-[#999999]">{t("login.subtitle")}</p>
      </div>

      <div className="space-y-4">
        <GoogleAuthButton
          label={t("google")}
          onClick={handleGoogleSignIn}
          disabled={isLoading}
        />

        <div className="relative flex items-center py-2">
          <div className="flex-grow border-t border-[#3d3d3d]" />
          <span className="flex-shrink-0 mx-4 text-[#666666] text-sm font-medium">
            {t("or")}
          </span>
          <div className="flex-grow border-t border-[#3d3d3d]" />
        </div>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-500 text-sm">
            {error}
          </div>
        )}

        <form className="space-y-4" onSubmit={handleEmailSignIn}>
          <div className="space-y-2">
            <input
              type="email"
              placeholder={t("placeholders.email")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 bg-[#3d3d3d] border border-transparent rounded-lg focus:border-[#81b64c] focus:ring-2 focus:ring-[#81b64c]/50 text-white placeholder-[#888888] outline-none transition-all"
            />
          </div>
          <div className="space-y-2">
            <input
              type="password"
              placeholder={t("placeholders.password")}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 bg-[#3d3d3d] border border-transparent rounded-lg focus:border-[#81b64c] focus:ring-2 focus:ring-[#81b64c]/50 text-white placeholder-[#888888] outline-none transition-all"
            />
          </div>

          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center gap-2 text-[#999999] cursor-pointer hover:text-white">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="rounded border-gray-600 bg-[#3d3d3d] text-[#81b64c] focus:ring-[#81b64c]"
              />
              {t("login.rememberMe")}
            </label>
            <Link
              href="/auth/forgot-password"
              className="text-[#999999] hover:text-white hover:underline"
            >
              {t("login.forgotPassword")}
            </Link>
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full py-4 text-lg"
          >
            {isLoading ? t("loading") : t("login.button")}
          </Button>
        </form>
      </div>

      <div className="text-center text-[#999999] text-sm">
        {t("login.noAccount")}{" "}
        <Link
          href="/auth/signup"
          className="text-[#81b64c] hover:underline font-bold"
        >
          {t("login.signupLink")}
        </Link>
      </div>
    </div>
  );
}

