"use client";

import { useEffect, useState } from "react";
import { friendService } from "@/services/friend.service";
import { UserMinus, Loader2, Clock } from "lucide-react";

interface FriendRequest {
    id: string;
    requestee: {
        id: string;
        username: string;
        displayName: string;
        rating?: number;
    };
    createdAt: string;
}

interface SentRequestsProps {
    refreshTrigger?: number;
    onActionComplete?: () => void;
}

export function SentRequests({ refreshTrigger, onActionComplete }: SentRequestsProps) {
    const [requests, setRequests] = useState<FriendRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [cancelingId, setCancelingId] = useState<string | null>(null);

    const fetchRequests = async () => {
        try {
            setLoading(true);
            const data = await friendService.getSentRequests();
            setRequests(data || []);
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Failed to fetch sent requests";
            console.error("Failed to fetch sent requests:", message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRequests();
    }, [refreshTrigger]);

    const handleCancel = async (requesteeId: string) => {
        try {
            setCancelingId(requesteeId);
            await friendService.cancelFriendRequest(requesteeId);
            setRequests((prev) => prev.filter((req) => req.requestee.id !== requesteeId));
            onActionComplete?.();
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Failed to cancel request";
            console.error("Failed to cancel request:", message);
        } finally {
            setCancelingId(null);
        }
    };

    if (loading) {
        return (
            <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-6 shadow-2xl flex items-center justify-center py-8">
                <Loader2 className="animate-spin text-neutral-500" size={24} />
            </div>
        );
    }

    if (requests.length === 0) {
        return null;
    }

    return (
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-6 shadow-2xl overflow-hidden relative">
            {/* Accent gradient line */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-neutral-500 to-neutral-700 opacity-50" />

            <h2 className="text-xl font-bold text-neutral-100 mb-4 flex items-center gap-2">
                Sent Invitations
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-neutral-700 text-[10px] font-bold text-white">
                    {requests.length}
                </span>
            </h2>

            <div className="space-y-3">
                {requests.map((request) => (
                    <div
                        key={request.id}
                        className="flex items-center justify-between p-4 rounded-xl border border-neutral-800/50 bg-neutral-800/10 transition hover:bg-neutral-800/30"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-neutral-600 to-neutral-800 flex items-center justify-center text-neutral-400 font-bold text-sm shadow-inner border border-neutral-700">
                                {request.requestee.displayName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <h3 className="font-bold text-neutral-100">
                                    {request.requestee.displayName}
                                </h3>
                                <p className="text-xs text-neutral-500">@{request.requestee.username}</p>
                                <div className="flex items-center gap-2 mt-1">
                                    <Clock size={10} className="text-neutral-600" />
                                    <p className="text-[10px] font-bold text-neutral-600 uppercase tracking-tight">Pending Response</p>
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={() => handleCancel(request.requestee.id)}
                            disabled={cancelingId === request.requestee.id}
                            className="inline-flex items-center gap-2 rounded-lg border border-neutral-700 bg-neutral-800/50 px-3 py-2 text-xs font-semibold text-neutral-400 hover:bg-neutral-800 hover:text-red-400 transition-all disabled:opacity-50"
                            title="Cancel Request"
                        >
                            {cancelingId === request.requestee.id ? (
                                <Loader2 size={14} className="animate-spin" />
                            ) : (
                                <UserMinus size={14} />
                            )}
                            Cancel
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
