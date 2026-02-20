"use client";

import { useEffect, useState } from "react";
import { friendService } from "@/services/friend.service";
import { UserMinus, Loader2, Clock, CheckCircle } from "lucide-react";
import { useAuthStore } from "@/lib/auth/auth-store";

interface FriendRequest {
    id: string;
    requestee: {
        id: string;
        username: string;
        displayName: string;
        rating?: any;
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
    const { user } = useAuthStore();

    const fetchRequests = async () => {
        try {
            const data = await friendService.getSentRequests();
            setRequests(data);
        } catch (error) {
            console.error("Failed to fetch sent requests:", error);
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
        } catch (error) {
            console.error("Failed to cancel request:", error);
        } finally {
            setCancelingId(null);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center py-8">
                <Loader2 className="animate-spin text-neutral-500" size={24} />
            </div>
        );
    }

    if (requests.length === 0) {
        return (
            <div className="text-center py-8 text-neutral-500">
                <Clock size={32} className="mx-auto mb-2 opacity-50" />
                <p>No pending sent requests</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <h3 className="text-lg font-semibold text-neutral-200 mb-4 px-2">Sent Requests</h3>
            {requests.map((request) => (
                <div
                    key={request.id}
                    className="flex items-center justify-between p-3 rounded-xl border border-neutral-800/50 bg-neutral-800/20 hover:bg-neutral-800/40 transition"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-neutral-700 to-neutral-600 flex items-center justify-center text-white font-bold shadow-inner">
                            {request.requestee.displayName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <p className="font-semibold text-neutral-200">
                                {request.requestee.displayName}
                            </p>
                            <p className="text-xs text-neutral-500">@{request.requestee.username}</p>
                            {request.requestee.rating && (
                                <p className="text-xs text-neutral-500 mt-1">
                                    Rating: <span className="font-semibold text-neutral-300">{(request.requestee.rating as any).rating || request.requestee.rating}</span>
                                </p>
                            )}
                        </div>
                    </div>
                    <button
                        onClick={() => handleCancel(request.requestee.id)}
                        disabled={cancelingId === request.requestee.id}
                        className="px-4 py-2 bg-neutral-700/50 hover:bg-red-500/20 text-neutral-400 hover:text-red-400 rounded-lg transition flex items-center gap-2 text-sm font-medium"
                        title="Cancel Request"
                    >
                        {cancelingId === request.requestee.id ? (
                            <Loader2 size={16} className="animate-spin" />
                        ) : (
                            <UserMinus size={16} />
                        )}
                        Cancel
                    </button>
                </div>
            ))}
        </div>
    );
}
