"use client";

import { useEffect, useState } from "react";
import { friendService } from "@/services/friend.service";
import { Loader2, Check, X } from "lucide-react";

interface PendingRequest {
  id: string;
  requester: {
    id: string;
    username: string;
    displayName: string;
    rating?: number;
  };
  createdAt: string;
}

interface PendingRequestsProps {
  refreshTrigger?: number;
  onActionComplete?: () => void;
}

export function PendingRequests({ refreshTrigger, onActionComplete }: PendingRequestsProps) {
  const [requests, setRequests] = useState<PendingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [responding, setResponding] = useState<string | null>(null);

  const loadRequests = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await friendService.getPendingRequests();
      setRequests(data || []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load friend requests";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, [refreshTrigger]);

  const handleAccept = async (requesterId: string) => {
    try {
      setResponding(requesterId);
      await friendService.acceptFriendRequest(requesterId);
      setRequests((prev) => prev.filter((r) => r.requester.id !== requesterId));
      onActionComplete?.();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to accept request";
      setError(message);
    } finally {
      setResponding(null);
    }
  };

  const handleReject = async (requesterId: string) => {
    try {
      setResponding(requesterId);
      await friendService.rejectFriendRequest(requesterId);
      setRequests((prev) => prev.filter((r) => r.requester.id !== requesterId));
      onActionComplete?.();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to reject request";
      setError(message);
    } finally {
      setResponding(null);
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-6 shadow-2xl flex items-center justify-center py-8">
        <Loader2 className="animate-spin text-[var(--primary)]" size={24} />
      </div>
    );
  }

  if (requests.length === 0) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-6 shadow-2xl overflow-hidden relative">
      {/* Accent gradient line */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500 opacity-50" />

      <h2 className="text-xl font-bold text-neutral-100 mb-4 flex items-center gap-2">
        Friend Requests
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-[10px] font-bold text-white">
          {requests.length}
        </span>
      </h2>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-300 px-4 py-3 rounded-xl mb-4 text-sm">
          {error}
        </div>
      )}

      <div className="space-y-3">
        {requests.map((request) => (
          <div
            key={request.id}
            className="flex items-center justify-between p-4 rounded-xl border border-neutral-800/50 bg-blue-500/5 transition hover:bg-blue-500/10"
          >
            <div className="flex items-center gap-3 flex-1">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white font-bold text-sm shadow-inner">
                {request.requester.displayName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-neutral-100 truncate">
                  {request.requester.displayName}
                </h3>
                <p className="text-xs text-neutral-500">@{request.requester.username}</p>
                {request.requester.rating && (
                  <p className="text-[10px] font-bold text-neutral-600 mt-1">
                    RATING: <span className="text-blue-400/80">{request.requester.rating}</span>
                  </p>
                )}
              </div>
            </div>
            <div className="flex gap-2 ml-4">
              <button
                onClick={() => handleReject(request.requester.id)}
                disabled={responding === request.requester.id}
                className="p-2.5 bg-neutral-800 hover:bg-neutral-800 hover:text-red-400 text-neutral-500 rounded-xl transition-all border border-neutral-700 disabled:opacity-50"
                title="Reject request"
              >
                {responding === request.requester.id ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <X size={18} />
                )}
              </button>
              <button
                onClick={() => handleAccept(request.requester.id)}
                disabled={responding === request.requester.id}
                className="p-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-500/20 transition-all hover:scale-[1.05] active:scale-[0.95] disabled:opacity-50"
                title="Accept request"
              >
                {responding === request.requester.id ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Check size={18} />
                )}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
