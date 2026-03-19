"use client";

import { Link } from "@/i18n/routing";
import { ArrowLeft } from "lucide-react";
import { useParams } from "next/navigation";

export default function ArticleError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  const params = useParams();
  const locale = typeof params?.locale === "string" ? params.locale : "en";

  // Log to Sentry / console so we can diagnose production failures
  if (typeof window !== "undefined") {
    console.error("[ArticleError]", error?.message, error?.digest);
  }

  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-md text-center space-y-6">
        <p className="text-5xl">📄</p>
        <h1 className="text-2xl font-black text-white">
          {locale === "sw" ? "Hitilafu imetokea" : "Something went wrong"}
        </h1>
        <p className="text-neutral-400 text-sm">
          {locale === "sw"
            ? "Makala hii haikuweza kupakia. Tafadhali jaribu tena baadaye."
            : "This article couldn't be loaded. Please try again later."}
        </p>
        {error?.digest && (
          <p className="text-xs text-neutral-600 font-mono">ref: {error.digest}</p>
        )}
        <Link
          href="/learn"
          className="inline-flex items-center gap-2 text-sm text-primary hover:opacity-80 transition-opacity"
        >
          <ArrowLeft className="w-4 h-4" />
          {locale === "sw" ? "Rudi kwenye Makala" : "Back to Articles"}
        </Link>
      </div>
    </main>
  );
}
