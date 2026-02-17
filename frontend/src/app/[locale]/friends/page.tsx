"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "@/i18n/routing";
import { FriendSearch, FriendList, PendingRequests } from "@/components/friend";
import { Users } from "lucide-react";

export default function FriendsPage() {
  const { isAuthenticated, isHydrated } = useAuth();
  const router = useRouter();
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    // Wait for store to hydrate before checking authentication
    if (!isHydrated) return;

    if (!isAuthenticated) {
      router.push("/auth/login");
    }
  }, [isHydrated, isAuthenticated, router]);

  // Show loading state while store is hydrating
  if (!isHydrated) {
    return (
      <div className="min-h-screen bg-[var(--background)] py-12 px-4 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin">
            <Users size={32} className="text-[var(--primary)]" />
          </div>
          <p className="mt-4 text-neutral-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const handleFriendAdded = () => {
    // Trigger refresh of friend list
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)] px-4 md:px-8 py-12">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <header className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-6 shadow-2xl">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-[var(--primary)] flex items-center justify-center">
              <Users size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-neutral-100 tracking-tight">Friends</h1>
              <p className="mt-1 text-neutral-400">
                Manage your friendships and connect with other players
              </p>
            </div>
          </div>
        </header>

        {/* Layout: Search on left, Pending Requests and Friends List on right */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Search */}
          <div className="lg:col-span-1">
            <FriendSearch onAdd={handleFriendAdded} />
          </div>

          {/* Right Column: Pending Requests and Friends List */}
          <div className="lg:col-span-2 space-y-6">
            <PendingRequests />
            <FriendList refreshTrigger={refreshTrigger} />
          </div>
        </div>
      </div>
    </main>
  );
}
