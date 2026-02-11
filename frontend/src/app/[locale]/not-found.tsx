import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/Button";

export default async function NotFound() {
  const t = await getTranslations("notFound");

  return (
    <main className="min-h-screen bg-[var(--background)] flex items-center justify-center p-6">
      <div className="relative w-full max-w-3xl">
        <div className="absolute inset-0 bg-orange-500/10 blur-[120px] rounded-full pointer-events-none" />
        <div className="relative rounded-2xl border border-neutral-800 bg-neutral-900/40 p-8 shadow-2xl">
          <div className="text-xs font-bold uppercase tracking-[0.2em] text-neutral-500">
            {t("code")}
          </div>
          <h1 className="mt-3 text-4xl sm:text-5xl font-black text-neutral-100 tracking-tight">
            {t("title")}
          </h1>
          <p className="mt-3 text-lg text-neutral-400 leading-relaxed">
            {t("subtitle")}
          </p>

          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <Link href="/" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto">
                {t("actions.home")}
              </Button>
            </Link>
            <Link href="/play" className="w-full sm:w-auto">
              <Button variant="secondary" size="lg" className="w-full sm:w-auto">
                {t("actions.play")}
              </Button>
            </Link>
            <Link href="/rules" className="w-full sm:w-auto">
              <Button variant="outline" size="lg" className="w-full sm:w-auto">
                {t("actions.rules")}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

