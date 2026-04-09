"use client";

import React from "react";
import { Link } from "@/i18n/routing";
import {
  Bug,
  ChevronDown,
  Clock3,
  Loader2,
  Mail,
  Send,
  ShieldAlert,
  UserRoundCog,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";

const SUPPORT_EMAIL = "support@tzdraft.com";

export default function SupportPageClient() {
  const t = useTranslations("support");
  const locale = useLocale();
  const [isLoading, setIsLoading] = React.useState(false);
  const [status, setStatus] = React.useState<{
    type: "success" | "error" | null;
    message: string;
  }>({ type: null, message: "" });

  const statItems = [
    { label: t("stats.response"), value: t("stats.responseValue"), icon: <Clock3 className="h-4 w-4" /> },
    { label: t("stats.topics"), value: t("stats.topicsValue"), icon: <Bug className="h-4 w-4" /> },
    { label: t("stats.languages"), value: t("stats.languagesValue"), icon: <Mail className="h-4 w-4" /> },
  ];

  const helpPaths = [
    {
      title: t("quickHelp.accountTitle"),
      body: t("quickHelp.accountBody"),
      icon: <UserRoundCog className="h-5 w-5" />,
    },
    {
      title: t("quickHelp.gameplayTitle"),
      body: t("quickHelp.gameplayBody"),
      icon: <Bug className="h-5 w-5" />,
    },
    {
      title: t("quickHelp.fairPlayTitle"),
      body: t("quickHelp.fairPlayBody"),
      icon: <ShieldAlert className="h-5 w-5" />,
    },
  ];

  const faqItems = [
    { question: t("faqs.q1"), answer: t("faqs.a1") },
    { question: t("faqs.q2"), answer: t("faqs.a2") },
    { question: t("faqs.q3"), answer: t("faqs.a3") },
    { question: t("faqs.q4"), answer: t("faqs.a4") },
  ];

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    setStatus({ type: null, message: "" });

    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name"),
      email: formData.get("email"),
      subject: formData.get("subject"),
      message: formData.get("message"),
    };

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/support`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error("Failed to send message");
      }

      setStatus({ type: "success", message: t("form.success") });
      (e.target as HTMLFormElement).reset();
    } catch {
      setStatus({ type: "error", message: t("form.error") });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-[var(--background)] text-[var(--foreground)]">
      <div className="relative isolate">
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px] bg-[radial-gradient(circle_at_top,rgba(245,158,11,0.16),transparent_55%)]" />
        <div className="pointer-events-none absolute right-0 top-24 -z-10 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />

        <div className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-4 pb-16 pt-8 sm:px-6 sm:pt-10 lg:gap-14 lg:px-8 lg:pb-20">
          <section className="rounded-[2rem] border border-white/10 bg-[linear-gradient(135deg,rgba(28,25,23,0.92),rgba(17,24,39,0.88))] px-5 py-7 shadow-[0_24px_80px_rgba(0,0,0,0.32)] sm:px-8 sm:py-10 lg:px-12">
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)] lg:items-end">
              <div className="space-y-5">
                <div className="inline-flex items-center rounded-full border border-orange-400/30 bg-orange-400/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.22em] text-orange-200">
                  {t("eyebrow")}
                </div>
                <div className="max-w-3xl space-y-3">
                  <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl lg:text-5xl">
                    {t("title")}
                  </h1>
                  <p className="max-w-2xl text-sm leading-7 text-neutral-300 sm:text-base">
                    {t("subtitle")}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-1">
                {statItems.map((item) => (
                  <div
                    key={item.label}
                    className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 backdrop-blur-sm"
                  >
                    <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-neutral-400">
                      <span className="text-[var(--primary)]">{item.icon}</span>
                      {item.label}
                    </div>
                    <div className="mt-2 text-sm font-bold text-white sm:text-base">{item.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.92fr)] lg:items-start">
            <div className="space-y-8">
              <section className="rounded-[1.75rem] border border-white/10 bg-black/20 p-5 sm:p-6 lg:p-7">
                <div className="mb-5 space-y-2">
                  <h2 className="text-2xl font-black text-white">{t("quickHelp.title")}</h2>
                  <p className="text-sm leading-6 text-neutral-400">{t("quickHelp.subtitle")}</p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {helpPaths.map((item) => (
                    <article
                      key={item.title}
                      className="rounded-2xl border border-white/10 bg-white/5 p-4 transition hover:border-white/20 hover:bg-white/7"
                    >
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-black/20 text-[var(--primary)]">
                        {item.icon}
                      </div>
                      <h3 className="mt-4 text-base font-black text-white">{item.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-neutral-400">{item.body}</p>
                    </article>
                  ))}
                </div>
              </section>

              <section className="rounded-[1.75rem] border border-white/10 bg-black/20 p-5 sm:p-6 lg:p-7">
                <div className="mb-5 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-2xl font-black text-white">{t("faq")}</h2>
                    <p className="mt-2 text-sm leading-6 text-neutral-400">{t("contactSubtitle")}</p>
                  </div>
                </div>
                <div className="space-y-3">
                  {faqItems.map((item, index) => (
                    <FAQItem
                      key={item.question}
                      question={item.question}
                      answer={item.answer}
                      defaultOpen={index === 0}
                    />
                  ))}
                </div>
              </section>
            </div>

            <aside className="space-y-5 lg:sticky lg:top-24">
              <section className="rounded-[1.75rem] border border-white/10 bg-[linear-gradient(180deg,rgba(28,25,23,0.92),rgba(17,24,39,0.92))] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.25)] sm:p-6 lg:p-7">
                <div className="space-y-2">
                  <h2 className="text-2xl font-black text-white">{t("contact")}</h2>
                  <p className="text-sm leading-6 text-neutral-400">{t("contactSubtitle")}</p>
                </div>

                <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
                  {status.message && (
                    <div
                      aria-live="polite"
                      className={`rounded-2xl border px-4 py-3 text-sm ${
                        status.type === "success"
                          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                          : "border-rose-500/30 bg-rose-500/10 text-rose-300"
                      }`}
                    >
                      {status.message}
                    </div>
                  )}

                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label={t("form.name")}>
                      <input
                        name="name"
                        type="text"
                        required
                        placeholder={t("form.namePlaceholder")}
                        className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-neutral-500 focus:border-[var(--primary)] focus:bg-white/8"
                      />
                    </Field>
                    <Field label={t("form.email")}>
                      <input
                        name="email"
                        type="email"
                        required
                        placeholder={t("form.emailPlaceholder")}
                        className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-neutral-500 focus:border-[var(--primary)] focus:bg-white/8"
                      />
                    </Field>
                  </div>

                  <Field label={t("form.subject")}>
                    <select
                      name="subject"
                      className="w-full rounded-2xl border border-white/10 bg-[rgb(28_25_23/0.92)] px-4 py-3 text-sm text-white outline-none transition focus:border-[var(--primary)] focus:bg-[rgb(36_31_28/0.96)]"
                      defaultValue="General Inquiry"
                    >
                      <option value="Bug Report" className="bg-stone-950 text-white">
                        {t("form.subjects.bug")}
                      </option>
                      <option value="Account Issue" className="bg-stone-950 text-white">
                        {t("form.subjects.account")}
                      </option>
                      <option value="General Inquiry" className="bg-stone-950 text-white">
                        {t("form.subjects.general")}
                      </option>
                      <option value="Feedback" className="bg-stone-950 text-white">
                        {t("form.subjects.feedback")}
                      </option>
                      <option value="Tournament Issue" className="bg-stone-950 text-white">
                        {t("form.subjects.tournament")}
                      </option>
                      <option value="Safety or Policy Report" className="bg-stone-950 text-white">
                        {t("form.subjects.safety")}
                      </option>
                    </select>
                  </Field>

                  <Field label={t("form.message")}>
                    <textarea
                      name="message"
                      required
                      rows={6}
                      placeholder={t("form.messagePlaceholder")}
                      className="w-full resize-none rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-neutral-500 focus:border-[var(--primary)] focus:bg-white/8"
                    />
                  </Field>

                  <p className="text-xs leading-5 text-neutral-500">{t("form.privacyNote")}</p>

                  <Button
                    size="lg"
                    className="w-full text-base font-black sm:text-lg"
                    disabled={isLoading}
                  >
                    <span className="inline-flex items-center justify-center gap-2">
                      {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-4 w-4" />}
                      <span>{isLoading ? `${t("form.sending")}...` : t("form.submit")}</span>
                    </span>
                  </Button>
                </form>
              </section>

              <section className="rounded-[1.75rem] border border-white/10 bg-black/20 p-5 sm:p-6">
                <h3 className="text-lg font-black text-white">{t("contactMethods.title")}</h3>
                <div className="mt-4 space-y-3">
                  <a
                    href={`mailto:${SUPPORT_EMAIL}`}
                    className="block rounded-2xl border border-white/10 bg-white/5 p-4 transition hover:border-white/20 hover:bg-white/8"
                  >
                    <div className="text-sm font-black text-white">{t("contactMethods.email")}</div>
                    <p className="mt-1 text-sm leading-6 text-neutral-400">{t("contactMethods.emailHint")}</p>
                    <div className="mt-3 text-sm font-semibold text-[var(--primary)]">{SUPPORT_EMAIL}</div>
                  </a>
                  <Link
                    href="/policy"
                    className="block rounded-2xl border border-white/10 bg-white/5 p-4 transition hover:border-white/20 hover:bg-white/8"
                  >
                    <div className="text-sm font-black text-white">{t("contactMethods.policy")}</div>
                    <p className="mt-1 text-sm leading-6 text-neutral-400">{t("contactMethods.policyHint")}</p>
                  </Link>
                </div>
              </section>
            </aside>
          </section>
        </div>
      </div>
    </main>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-semibold text-neutral-300">{label}</span>
      {children}
    </label>
  );
}

function FAQItem({
  question,
  answer,
  defaultOpen = false,
}: {
  question: string;
  answer: string;
  defaultOpen?: boolean;
}) {
  return (
    <details
      open={defaultOpen}
      className="group rounded-2xl border border-white/10 bg-white/5 px-4 py-4 transition open:border-white/20 open:bg-white/8"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left text-sm font-black text-white sm:text-base">
        <span>{question}</span>
        <ChevronDown className="h-4 w-4 shrink-0 text-neutral-500 transition group-open:rotate-180" />
      </summary>
      <p className="mt-3 pr-5 text-sm leading-6 text-neutral-400">{answer}</p>
    </details>
  );
}
