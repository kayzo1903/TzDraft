"use client";

import { useState } from "react";
import Link from "next/link";
import { Scale, X } from "lucide-react";
import { useAuthStore } from "@/lib/auth/auth-store";
import { authClient } from "@/lib/auth/auth-client";

// Users who registered before this date need to explicitly accept the new terms.
const TERMS_EFFECTIVE_DATE = new Date("2026-04-24T00:00:00Z");

export function TermsAcceptanceBanner() {
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [accepting, setAccepting] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Only show for authenticated, non-guest users who haven't accepted yet
  const needsAcceptance =
    isAuthenticated &&
    user?.accountType === "REGISTERED" &&
    !dismissed &&
    (!user.termsAcceptedAt ||
      new Date(user.termsAcceptedAt) < TERMS_EFFECTIVE_DATE);

  if (!needsAcceptance) return null;

  const handleAccept = async () => {
    setAccepting(true);
    try {
      await authClient.acceptTerms();
      setDismissed(true);
    } catch {
      setAccepting(false);
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 sm:p-6">
      <div className="max-w-2xl mx-auto bg-[#1c1917] border border-orange-500/30 rounded-2xl shadow-2xl shadow-black/60 p-5">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Scale className="w-5 h-5 text-orange-400" />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-white font-bold text-sm mb-1">
              Terms &amp; Privacy Policy Updated
            </p>
            <p className="text-stone-400 text-xs leading-relaxed mb-4">
              We&apos;ve updated our{" "}
              <Link href="/terms" className="text-orange-400 hover:underline font-medium">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="text-orange-400 hover:underline font-medium">
                Privacy Policy
              </Link>
              . Please review and accept to continue using TzDraft.
            </p>

            <div className="flex items-center gap-3 flex-wrap">
              <button
                onClick={handleAccept}
                disabled={accepting}
                className="px-5 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl transition-colors"
              >
                {accepting ? "Accepting…" : "I Accept"}
              </button>
              <Link
                href="/terms"
                className="px-5 py-2 border border-white/10 hover:border-white/20 text-stone-300 text-sm font-medium rounded-xl transition-colors"
              >
                Read Terms
              </Link>
            </div>
          </div>

          <button
            onClick={() => setDismissed(true)}
            className="text-stone-500 hover:text-stone-300 transition-colors flex-shrink-0"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
