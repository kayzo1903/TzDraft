"use client";

import { useState } from "react";
import { friendService } from "@/services/friend.service";
import { Search, UserPlus, Loader2, Users, AlertCircle } from "lucide-react";
import axiosInstance from "@/lib/axios";

interface SearchResult {
  id: string;
  username: string;
  displayName: string;
  rating?: number;
  matchScore?: number;
  isVerified?: boolean;
}

interface FriendSearchProps {
  onAdd?: (userId: string) => void;
}

export function FriendSearch({ onAdd }: FriendSearchProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [sendingUserId, setSendingUserId] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async () => {
    const term = searchTerm.trim();

    if (!term) {
      setError("Please enter a player name");
      return;
    }

    if (term.length > 50) {
      setError("Search term too long");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setHasSearched(true);

      const response = await axiosInstance.get("/users/search", {
        params: { q: term },
      });

      setResults(response.data || []);
    } catch (err: any) {
      setResults([]);

      // Better error handling
      if (err.response?.status === 400) {
        setError("Please enter a valid player name");
      } else if (err.response?.status === 401) {
        setError("Please log in to search for friends");
      } else if (err.response?.status === 404) {
        setError("Player not found. Try again with exact name");
      } else if (err.response?.status === 429) {
        setError("Too many searches. Please wait a moment");
      } else if (!err.response) {
        setError("Connection error. Please check your internet");
      } else {
        setError("Unable to search at this time. Please try again");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAddFriend = async (userId: string) => {
    try {
      setSendingUserId(userId);
      setError(null);
      await friendService.sendFriendRequest(userId);
      setSent(true);
      setSearchTerm("");
      setResults([]);
      setHasSearched(false);
      setTimeout(() => setSent(false), 3000);
      onAdd?.(userId);
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          "Could not send friend request. Please try again"
      );
      setSendingUserId(null);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-6 shadow-2xl">
      <h2 className="text-xl font-bold text-neutral-100 mb-4">Find Friends</h2>

      <div className="space-y-3 mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-3 text-neutral-500" size={20} />
          <input
            type="text"
            placeholder="Enter player name exactly..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setError(null);
            }}
            onKeyPress={handleKeyPress}
            maxLength={50}
            className="w-full pl-10 pr-4 py-2 bg-neutral-800/50 border border-neutral-700 rounded-lg text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
          />
        </div>

        <button
          onClick={handleSearch}
          disabled={loading || !searchTerm.trim()}
          className="w-full flex items-center justify-center gap-2 bg-[var(--primary)] hover:bg-[var(--primary)]/80 disabled:bg-neutral-700 text-white py-2 px-4 rounded-lg font-medium transition"
        >
          {loading ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Searching...
            </>
          ) : (
            <>
              <Search size={18} />
              Search
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-300 px-4 py-3 rounded-lg mb-4 flex items-start gap-2">
          <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {sent && (
        <div className="bg-green-500/10 border border-green-500/30 text-green-300 px-4 py-3 rounded-lg mb-4 flex items-start gap-2">
          <span className="text-sm">✓ Friend request sent successfully!</span>
        </div>
      )}

      {/* Search Results */}
      {results.length > 0 && (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {results.map((user) => (
            <div
              key={user.id}
              className="flex items-center justify-between p-3 rounded-lg border border-neutral-800/50 bg-neutral-800/20 hover:bg-neutral-800/40 transition"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--primary)] to-amber-300 flex items-center justify-center text-black font-semibold text-xs flex-shrink-0">
                  {user.displayName.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-neutral-100 truncate">
                      {user.displayName}
                    </h3>
                    {user.isVerified && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-300 border border-green-500/30 flex-shrink-0">
                        ✓
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-neutral-400">@{user.username}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-xs text-neutral-500">
                      Rating: {user.rating}
                    </span>
                    {user.matchScore === 100 && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-green-500/20 text-green-300 border border-green-500/30">
                        Exact match
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleAddFriend(user.id)}
                disabled={sendingUserId === user.id}
                className="ml-3 flex-shrink-0 p-2 bg-[var(--primary)] hover:bg-[var(--primary)]/80 disabled:bg-neutral-700 text-white rounded-lg transition flex items-center gap-1"
                title="Send friend request"
              >
                {sendingUserId === user.id ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <UserPlus size={16} />
                )}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* No Results State */}
      {!loading && hasSearched && results.length === 0 && !error && (
        <div className="text-center py-8">
          <Users size={32} className="mx-auto text-neutral-500 mb-2" />
          <p className="text-neutral-400 text-sm">Player not found</p>
          <p className="text-xs text-neutral-500 mt-2">
            Make sure you entered the exact player name
          </p>
        </div>
      )}

      {/* Empty State (no search) */}
      {!hasSearched && results.length === 0 && !searchTerm.trim() && (
        <div className="text-center py-8">
          <Search size={32} className="mx-auto text-neutral-500 mb-2" />
          <p className="text-neutral-400 text-sm">Find your friends</p>
          <p className="text-xs text-neutral-500 mt-2">
            Enter a player name and click Search
          </p>
        </div>
      )}
    </div>
  );
}
