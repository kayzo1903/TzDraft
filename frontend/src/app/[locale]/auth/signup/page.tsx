"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslations } from "next-intl";
import { useAuth } from "@/hooks/useAuth";
import { PhoneInput } from "@/components/auth/phone-input";
import { PasswordInput } from "@/components/auth/password-input";
import { authClient } from "@/lib/auth/auth-client";
import GoogleSignInButton from "@/components/auth/GoogleSignInButton";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { HeroBoard } from "@/components/hero/HeroBoard";
import {
  Loader2,
  CheckCircle2,
  ArrowRight,
  Smartphone,
  UserCircle,
  Lock,
} from "lucide-react";

const quickStats = [
  { labelKey: "signup.quickStats.liveTournaments", value: "12" },
  { labelKey: "signup.quickStats.playersOnline", value: "412" },
  { labelKey: "signup.quickStats.longestStreak", value: "15 wins" },
  { labelKey: "signup.quickStats.aiChallenges", value: "8" },
];

export default function SignupPage() {
  const t = useTranslations("auth");
  const router = useRouter();
  const { register } = useAuth();

  const [showHeroBoard, setShowHeroBoard] = useState(false);
  const [step, setStep] = useState<"phone" | "otp" | "details">("phone");
  const [formData, setFormData] = useState({
    phoneNumber: "",
    username: "",
    password: "",
    confirmPassword: "",
    displayName: "",
  });
  const [otpCode, setOtpCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await authClient.sendOTP(formData.phoneNumber, "signup");
      setStep("otp");
    } catch (err: any) {
      const message = err.response?.data?.message;
      if (message === "User with this phone number already exists") {
        setError(t("errors.phoneAlreadyRegistered"));
      } else {
        setError(message || t("errors.otpFailed"));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await authClient.verifyOTP(formData.phoneNumber, otpCode, "signup");
      setStep("details");
    } catch (err: any) {
      setError(err.response?.data?.message || t("errors.otpInvalid"));
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (formData.password.length < 8) {
      setError(t("errors.passwordTooShort"));
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError(t("errors.passwordMismatch"));
      return;
    }

    setLoading(true);

    try {
      await register(formData);
      router.push("/");
    } catch (err: any) {
      const backendMessage = err.response?.data?.message;
      let displayError = t("errors.registrationFailed");

      if (typeof backendMessage === "string") {
        if (backendMessage.includes("longer than or equal to 8 characters")) {
          displayError = t("errors.passwordTooShort");
        } else if (backendMessage.includes("already exists")) {
          displayError = t("errors.userAlreadyExists");
        } else {
          displayError = backendMessage;
        }
      } else if (Array.isArray(backendMessage)) {
        displayError = backendMessage
          .map((msg) => {
            if (msg.includes("longer than or equal to 8 characters")) return t("errors.passwordTooShort");
            if (msg.includes("already exists")) return t("errors.userAlreadyExists");
            return msg;
          })
          .join(", ");
      }

      setError(displayError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#030307] text-white">
      <div className="relative isolate overflow-hidden">
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top,_rgba(252,211,77,0.2),_transparent_55%)]" />
        <div className="absolute -top-16 left-1/4 h-72 w-72 rounded-full bg-[#f97316]/30 blur-[120px] pointer-events-none" />
        <div className="absolute -right-10 top-1/3 h-80 w-80 rounded-full bg-[#8b5cf6]/20 blur-[140px] pointer-events-none" />
        <div className="relative z-10 max-w-6xl mx-auto px-4 py-16 lg:py-20 space-y-10 lg:space-y-0 lg:flex lg:items-stretch lg:gap-10">
          <div className="lg:w-1/2 space-y-8">
            <div className="flex items-center justify-between text-xs uppercase tracking-[0.5em] text-neutral-500">
              <span>{t("signup.academy")}</span>
              <span>Chapter {step === "phone" ? "01" : step === "otp" ? "02" : "03"}</span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-5xl font-black leading-tight text-white">
              {t("signup.heroTitle")}
            </h1>
            <p className="text-base md:text-lg text-neutral-400 max-w-xl">
              {t("signup.heroDescription")}
            </p>
             <div className="rounded-3xl border border-white/10 bg-white/5 p-6 space-y-4 shadow-[0_40px_120px_rgba(0,0,0,0.35)]">
               <p className="text-sm uppercase tracking-[0.4em] text-neutral-500">{t("signup.liveFeed")}</p>
               <div className="grid grid-cols-2 gap-4">
                 {quickStats.map((stat) => (
                  <div key={stat.labelKey} className="rounded-2xl border border-white/10 bg-black/30 p-3 text-center">
                    <div className="text-2xl font-black">{stat.value}</div>
                    <div className="text-[10px] uppercase tracking-[0.8em] text-neutral-500 mt-1">
                      {t(stat.labelKey)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {showHeroBoard && (
              <div className="hidden lg:block relative rounded-[32px] border border-white/10 bg-black/30 shadow-[0_50px_100px_rgba(0,0,0,0.65)]">
                <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle,_rgba(249,115,22,0.4),_transparent_60%)] opacity-60" />
                <div className="relative isolate">
                  <HeroBoard />
                </div>
              </div>
            )}
          </div>
          <div className="lg:w-1/2">
            <div className="rounded-[36px] border border-white/10 bg-[#111111]/90 shadow-[0_40px_120px_rgba(0,0,0,0.65)] overflow-hidden">
              <div className="p-8 space-y-6">
                <div className="flex items-center justify-between text-xs uppercase tracking-[0.5em] text-neutral-500">
                  <span>{t("signup.verificationCircuit")}</span>
                  <span className="text-[#81b64c] font-semibold">
                    {t("signup.step")} {step === "phone" ? "01" : step === "otp" ? "02" : "03"}
                  </span>
                </div>
                <div className="space-y-2 text-center">
                  <div className="flex items-center justify-center w-16 h-16 mx-auto rounded-full border border-[#81b64c]/40 bg-[#81b64c]/10">
                    {step === "phone" && <Smartphone className="w-6 h-6 text-[#81b64c]" />}
                    {step === "otp" && <Lock className="w-6 h-6 text-[#81b64c]" />}
                    {step === "details" && <UserCircle className="w-6 h-6 text-[#81b64c]" />}
                  </div>
                  <h2 className="text-3xl font-black">
                    {step === "phone"
                      ? t("signup.steps.phone.title")
                      : step === "otp"
                      ? t("signup.steps.otp.title")
                      : t("signup.steps.details.title")}
                  </h2>
                  <p className="text-sm text-neutral-400">
                    {step === "phone" && t("signup.steps.phone.subtitle")}
                    {step === "otp" && t("signup.steps.otp.subtitle", { phone: formData.phoneNumber })}
                    {step === "details" && t("signup.steps.details.subtitle")}
                  </p>
                </div>
                {error && (
                  <div className="rounded-2xl bg-red-500/10 border border-red-500/50 p-3 text-sm text-red-400 text-center">
                    {error}
                  </div>
                )}
                {step === "phone" && (
                  <form className="space-y-5" onSubmit={handleSendOTP}>
                    <PhoneInput
                      value={formData.phoneNumber}
                      onChange={(value) => setFormData({ ...formData, phoneNumber: value })}
                      label={t("fields.phoneNumber")}
                      placeholder={t("fields.phonePlaceholder")}
                    />
                    <Button
                      type="submit"
                      className="w-full py-5 rounded-2xl bg-gradient-to-r from-[#f97316] to-[#e63946] text-white text-lg font-semibold"
                      disabled={loading || !formData.phoneNumber}
                    >
                      {loading ? (
                        <span className="flex items-center justify-center gap-2">
                          <Loader2 className="h-5 w-5 animate-spin" />
                          {t("signup.steps.phone.buttonLoading")}
                        </span>
                      ) : (
                        <span className="flex items-center justify-center gap-2">
                          {t("signup.steps.phone.button")}
                          <ArrowRight className="h-5 w-5" />
                        </span>
                      )}
                    </Button>
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-white/10" />
                      </div>
                      <div className="relative flex justify-center text-[10px] uppercase tracking-[0.7em] text-neutral-500">
                        <span className="bg-[#111111] px-3">or continue with</span>
                      </div>
                    </div>
                    <GoogleSignInButton />
                  </form>
                )}
                {step === "otp" && (
                  <form className="space-y-5" onSubmit={handleVerifyOTP}>
                    <div className="space-y-4">
                      <Label htmlFor="otp" className="text-xs uppercase tracking-[0.5em] text-neutral-500">
                        {t("signup.steps.otp.label")}
                      </Label>
                      <div className="flex justify-center">
                        <InputOTP maxLength={6} value={otpCode} onChange={setOtpCode}>
                          <InputOTPGroup>
                            {[0, 1, 2].map((index) => (
                              <InputOTPSlot key={index} index={index} className="w-12 h-12 text-xl border border-neutral-700 bg-[#111]" />
                            ))}
                          </InputOTPGroup>
                          <InputOTPSeparator />
                          <InputOTPGroup>
                            {[3, 4, 5].map((index) => (
                              <InputOTPSlot key={index} index={index} className="w-12 h-12 text-xl border border-neutral-700 bg-[#111]" />
                            ))}
                          </InputOTPGroup>
                        </InputOTP>
                      </div>
                      <p className="text-xs text-neutral-500 text-center">{t("signup.steps.otp.hint")}</p>
                    </div>
                    <Button
                      type="submit"
                      className="w-full py-5 rounded-2xl bg-gradient-to-r from-[#6366f1] to-[#a855f7] text-white font-semibold"
                      disabled={loading || otpCode.length !== 6}
                    >
                      {loading ? (
                        <span className="flex items-center justify-center gap-2">
                          <Loader2 className="h-5 w-5 animate-spin" />
                          {t("signup.steps.otp.buttonLoading")}
                        </span>
                      ) : (
                        <span className="flex items-center justify-center gap-2">
                          {t("signup.steps.otp.button")}
                          <ArrowRight className="h-5 w-5" />
                        </span>
                      )}
                    </Button>
                    <button
                      type="button"
                      className="w-full py-3 rounded-2xl border border-white/10 text-sm text-neutral-300"
                      onClick={() => setStep("phone")}
                    >
                      {t("signup.steps.otp.changePhone")}
                    </button>
                  </form>
                )}
                {step === "details" && (
                  <form className="space-y-5" onSubmit={handleRegister}>
                    <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-3">
                      <CheckCircle2 />
                      <span className="text-sm text-emerald-200 font-semibold">
                        {t("signup.steps.details.verified")}
                      </span>
                    </div>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="username" className="text-xs uppercase tracking-[0.5em] text-neutral-500">
                          {t("fields.username")} <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="username"
                          type="text"
                          value={formData.username}
                          onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                          placeholder={t("fields.usernamePlaceholder")}
                          required
                          minLength={3}
                          maxLength={20}
                          className="bg-[#111] border border-neutral-700 focus:border-[#81b64c]"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="displayName" className="text-xs uppercase tracking-[0.5em] text-neutral-500">
                          {t("fields.displayName")}
                        </Label>
                        <Input
                          id="displayName"
                          type="text"
                          value={formData.displayName}
                          onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                          placeholder={t("fields.displayNamePlaceholder")}
                          className="bg-[#111] border border-neutral-700 focus:border-[#81b64c]"
                        />
                      </div>
                      <PasswordInput
                        value={formData.password}
                        onChange={(value) => setFormData({ ...formData, password: value })}
                        label={t("fields.password")}
                        showStrength
                      />
                      <PasswordInput
                        value={formData.confirmPassword}
                        onChange={(value) => setFormData({ ...formData, confirmPassword: value })}
                        label={t("fields.confirmPassword")}
                      />
                    </div>
                    <Button
                      type="submit"
                      className="w-full py-5 rounded-2xl bg-gradient-to-r from-[#f97316] to-[#f43f5e] text-white font-semibold"
                      disabled={loading}
                    >
                      {loading ? (
                        <span className="flex items-center justify-center gap-2">
                          <Loader2 className="h-5 w-5 animate-spin" />
                          {t("signup.steps.details.buttonLoading")}
                        </span>
                      ) : (
                        <span className="flex items-center justify-center gap-2">
                          {t("signup.steps.details.button")}
                          <CheckCircle2 className="h-5 w-5" />
                        </span>
                      )}
                    </Button>
                  </form>
                )}
              </div>
            </div>
            <div className="text-center text-sm text-neutral-500 mt-6">
              {t("signup.haveAccount")}{" "}
              <Link href="/auth/login" className="text-[#81b64c] font-semibold">
                {t("signup.loginLink")}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
