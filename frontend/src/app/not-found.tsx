"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

export default function NotFound() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-[var(--background)] flex items-center justify-center p-6">
      <div className="relative w-full max-w-3xl">
        <div className="absolute inset-0 bg-orange-500/10 blur-[120px] rounded-full pointer-events-none" />
        <div className="relative rounded-2xl border border-neutral-800 bg-neutral-900/40 p-8 shadow-2xl">
          <div className="text-xs font-bold uppercase tracking-[0.2em] text-neutral-500">
            404
          </div>
          <h1 className="mt-3 text-4xl sm:text-5xl font-black text-neutral-100 tracking-tight">
            Page not found
          </h1>
          <p className="mt-3 text-lg text-neutral-400 leading-relaxed">
            The page you are looking for does not exist (or it moved).
          </p>

          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <a href="/sw" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto">
                Go Home
              </Button>
            </a>
            <Button
              type="button"
              size="lg"
              variant="secondary"
              className="w-full sm:w-auto"
              onClick={() => router.back()}
            >
              Go Back
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}
