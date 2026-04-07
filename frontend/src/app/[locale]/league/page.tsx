"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { PlusCircle, Trophy, Users } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

// In a real app we'd fetch the list of leagues from the backend
// Since we didn't explicitly write `GET /leagues` in backend, we'll placeholder it for now,
// or we can add it to the backend controller shortly.

export default function LeagueListPage() {
  const { locale } = useParams<{ locale: string }>();
  const { user } = useAuth();
  
  // mock for now
  const activeLeagues = [];

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            TzDraft Leagues
          </h1>
          <p className="mt-2 text-gray-400">
            Compete in round-robin seasons. 12 players, 11 rounds.
          </p>
        </div>
        {user?.role === "ADMIN" && (
          <Link
            href={`/${locale}/league/create`}
            className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-semibold text-gray-950 transition-all hover:bg-amber-400 hover:shadow-lg hover:shadow-amber-500/20"
          >
            <PlusCircle className="h-5 w-5" />
            Create League
          </Link>
        )}
      </div>

      <div className="mt-8 rounded-2xl border border-gray-800 bg-gray-900/50 backdrop-blur-xl p-8 text-center ring-1 ring-white/10">
        <Trophy className="mx-auto h-12 w-12 text-gray-700" />
        <h3 className="mt-4 text-lg font-medium text-white">No active leagues</h3>
        <p className="mt-2 text-sm text-gray-400">
          We are currently in the off-season. Check back later for new league openings.
        </p>
      </div>
    </div>
  );
}
