"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { leagueService } from "@/services/league.service";
import { Trophy, AlertCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function CreateLeaguePage() {
  const router = useRouter();
  const { locale } = useParams<{ locale: string }>();
  const { user } = useAuth();

  const [name, setName] = useState("");
  const [duration, setDuration] = useState(7);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If we don't have a user, AuthInitializer naturally handles generic loading state, 
  // but let's just show access denied if no user anyway.

  if (user?.role !== "ADMIN") {
    return (
      <div className="mx-auto max-w-xl text-center py-20">
        <AlertCircle className="mx-auto h-12 w-12 text-rose-500 mb-4" />
        <h1 className="text-2xl font-bold text-white">Access Denied</h1>
        <p className="text-gray-400 mt-2">Only administrators can create leagues.</p>
        <Link href={`/${locale}/league`} className="mt-6 inline-block text-amber-500 hover:text-amber-400">
          Return to Leagues
        </Link>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const league = await leagueService.createLeague(name, duration);
      router.push(`/${locale}/league/${league.id}`);
    } catch (err: any) {
      setError(err.message || "Failed to create league");
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href={`/${locale}/league`}
        className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-gray-400 transition-colors hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Leagues
      </Link>

      <div className="rounded-2xl border border-gray-800 bg-gray-900/80 p-8 shadow-2xl backdrop-blur-xl">
        <div className="flex items-center gap-3 mb-8">
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3">
            <Trophy className="h-6 w-6 text-amber-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Create New League</h1>
            <p className="text-sm text-gray-400">Configure the next competitive season.</p>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              League Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-gray-700 bg-gray-800/50 px-4 py-3 text-white placeholder-gray-500 py-3 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-colors"
              placeholder="e.g. Tanzanian Masters 2026"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Round Duration (Days)
            </label>
            <input
              type="number"
              min={1}
              max={14}
              required
              value={duration}
              onChange={(e) => setDuration(parseInt(e.target.value))}
              className="w-full rounded-xl border border-gray-700 bg-gray-800/50 px-4 py-3 text-white placeholder-gray-500 py-3 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-colors"
            />
            <p className="mt-2 text-xs text-gray-500">
              Players have this many days to complete their 2 games against their opponent for each round.
            </p>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-amber-500 py-3.5 text-sm font-semibold text-gray-950 transition hover:bg-amber-400 disabled:opacity-50"
            >
              {loading ? "Creating..." : "Create League"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
