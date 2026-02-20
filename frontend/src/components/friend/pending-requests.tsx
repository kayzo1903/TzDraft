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
      setRequests(data);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load friend requests");
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
      setRequests(requests.filter((r) => r.requester.id !== requesterId));
      onActionComplete?.();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to accept request");
    } finally {
      setResponding(null);
    }
  };

  const handleReject = async (requesterId: string) => {
    try {
      setResponding(requesterId);
      await friendService.rejectFriendRequest(requesterId);
      setRequests(requests.filter((r) => r.requester.id !== requesterId));
      onActionComplete?.();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to reject request");
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
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-6 shadow-2xl">
      <h2 className="text-xl font-bold text-neutral-100 mb-4">Friend Requests ({requests.length})</h2>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-300 px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      <div className="space-y-3">
        {requests.map((request) => (
          <div
            key={request.id}
            className="flex items-center justify-between p-4 rounded-lg border border-neutral-800/50 bg-blue-500/10"
          >
            <div className="flex items-center gap-3 flex-1">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--primary)] to-amber-300 flex items-center justify-center text-black font-semibold text-sm">
                {request.requester.displayName.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="font-semibold text-neutral-100">
                  {request.requester.displayName}
                </h3>
                <p className="text-sm text-neutral-400">@{request.requester.username}</p>
                {request.requester.rating && (
                  <p className="text-xs text-neutral-500 mt-1">
                    Rating: <span className="font-semibold text-neutral-300">{request.requester.rating}</span>
                  </p>
                )}
              </div>
            </div>
            <div className="flex gap-2 ml-4">
              <button
                onClick={() => handleAccept(request.requester.id)}
                disabled={responding === request.requester.id}
                className="p-2 bg-green-500/20 hover:bg-green-500/30 disabled:bg-neutral-700 text-green-400 rounded-lg transition flex items-center gap-1 border border-green-500/30"
                title="Accept request"
              >
                {responding === request.requester.id ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Check size={18} />
                )}
              </button>
              <button
                onClick={() => handleReject(request.requester.id)}
                disabled={responding === request.requester.id}
                className="p-2 bg-red-500/20 hover:bg-red-500/30 disabled:bg-neutral-700 text-red-400 rounded-lg transition flex items-center gap-1 border border-red-500/30"
                title="Reject request"
              >
                {responding === request.requester.id ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <X size={18} />
                )}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
