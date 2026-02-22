"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from '@/i18n/routing';
import { useSocket } from '@/hooks/useSocket';
import { PlayModeSelection } from '@/components/game/PlayModeSelection';
import { LoadingBoard } from '@/components/game/LoadingBoard';
import { Board } from '@/components/game/Board';
import { Loader2, Clock, XCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useAuthStore } from '@/lib/auth/auth-store';
import { nowFromServer, syncServerTime } from '@/lib/server-time';

export default function OnlineGamePage() {
    const t = useTranslations('play');
    const router = useRouter();
    const socket = useSocket();
    const { user } = useAuthStore();
    const [isSearching, setIsSearching] = useState(false);
    const [searchStatus, setSearchStatus] = useState('');
    const [searchMode, setSearchMode] = useState<'RANKED' | 'CASUAL' | null>(null);
    const [queueError, setQueueError] = useState<string | null>(null);
    const [autoJoin, setAutoJoin] = useState(true);
    const [searchDeadlineMs, setSearchDeadlineMs] = useState<number | null>(null);
    const [socketConnected, setSocketConnected] = useState(false);

    useEffect(() => {
        if (!socket) return;
        const onConnect = () => setSocketConnected(true);
        const onDisconnect = () => setSocketConnected(false);
        setSocketConnected(socket.connected);
        socket.on('connect', onConnect);
        socket.on('disconnect', onDisconnect);

        // Listen for game started event
        socket.on('gameStarted', (data: {
            gameId: string;
            playerColor?: 'WHITE' | 'BLACK';
            whiteId?: string | null;
            blackId?: string | null;
        }) => {
            console.log('Game started!', data);

            const inferredColor =
                data.playerColor ||
                (user?.id && data.whiteId === user.id
                    ? 'WHITE'
                    : user?.id && data.blackId === user.id
                        ? 'BLACK'
                        : undefined);

            if (inferredColor && typeof window !== 'undefined') {
                window.sessionStorage.setItem(
                    `tzdraft:game:${data.gameId}:color`,
                    inferredColor,
                );
            }

            setIsSearching(false);
            router.push(`/game/${data.gameId}`);
        });

        return () => {
            socket.off('gameStarted');
            socket.off('connect', onConnect);
            socket.off('disconnect', onDisconnect);
        };
    }, [socket, router, user?.id]);

    const [lastSearchTime, setLastSearchTime] = useState(0);
    const [timeLeft, setTimeLeft] = useState(60);

    useEffect(() => {
        syncServerTime().catch(() => { });
    }, []);

    // Matchmaking countdown
    useEffect(() => {
        let intervalId: NodeJS.Timeout;

        if (isSearching) {
            const shouldTimeout = searchMode === 'RANKED';
            const deadline = shouldTimeout
                ? (searchDeadlineMs ?? nowFromServer() + 60_000)
                : null;
            if (shouldTimeout && !searchDeadlineMs && deadline) {
                setSearchDeadlineMs(deadline);
            }
            intervalId = setInterval(() => {
                if (!deadline) {
                    return;
                }
                const remaining = Math.max(0, Math.ceil((deadline - nowFromServer()) / 1000));
                setTimeLeft(remaining);
                if (remaining <= 0) handleCancel(true);
            }, 1000);
        } else {
            setSearchDeadlineMs(null);
            setSearchMode(null);
            setTimeLeft(60);
        }

        return () => {
            if (intervalId) clearInterval(intervalId);
        };
    }, [isSearching, searchDeadlineMs, searchMode]);

    const handleSelectMode = async (mode: 'RANKED' | 'CASUAL', guestName?: string) => {
        if (!socket || !socket.connected) {
            console.error("Socket not connected");
            setQueueError("Socket not connected. Please try again.");
            setIsSearching(false);
            setAutoJoin(false);
            return;
        }

        // Rate limiting (2 seconds cooldown) using server time.
        await syncServerTime().catch(() => { });
        const now = nowFromServer();
        if (now - lastSearchTime < 2000) {
            return;
        }
        setLastSearchTime(now);

        setQueueError(null);
        setIsSearching(true);
        setSearchMode(mode);
        setSearchStatus(mode === 'RANKED' ? 'Searching for ranked match...' : 'Searching for opponent...');
        setSearchDeadlineMs(mode === 'RANKED' ? now + 60_000 : null);
        setTimeLeft(60);

        // Emit join event and handle server-side validation response.
        socket.emit('findMatch', { mode, guestName }, (response?: { status?: string; message?: string }) => {
            if (!response || response.status === 'success') {
                return;
            }

            setIsSearching(false);
            setAutoJoin(false);
            setQueueError(response.message || 'Unable to join matchmaking queue.');
            console.error('findMatch failed:', response);
        });
    };

    const handleCancel = (isTimeout = false) => {
        if (socket) {
            socket.emit('cancelMatch');
        }
        setIsSearching(false);
        setSearchMode(null);
        setSearchDeadlineMs(null);
        setTimeLeft(60);
        setQueueError(isTimeout ? '__MATCHMAKING_TIMEOUT__' : '__MANUALLY_CANCELLED__');
        setAutoJoin(false); // Disable auto-join so user isn't immediately re-queued
    };

    const content = isSearching ? (
        <div className="flex flex-col items-center justify-center gap-8 animate-in fade-in zoom-in duration-300">
            <div className="bg-black/60 backdrop-blur-sm p-8 rounded-2xl flex flex-col items-center shadow-2xl border border-white/10">
                <div className="relative">
                    <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse" />
                    <Loader2 className="w-12 h-12 text-primary animate-spin relative z-10" />
                </div>
                <p className="text-xl font-medium text-white tracking-wide mt-6">{searchStatus}</p>
                <div className="flex flex-col items-center gap-2">
                    {searchMode === 'RANKED' && (
                        <span className="text-xs text-neutral-400 font-mono">
                            Timeout in {timeLeft}s
                        </span>
                    )}
                    <div className="mt-4">
                        <button
                            onClick={() => handleCancel()}
                            className="px-6 py-2.5 rounded-full border border-white/20 text-white/80 hover:bg-white/10 hover:text-white transition-all text-sm uppercase tracking-wider font-medium"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </div>
    ) : (queueError === '__MATCHMAKING_TIMEOUT__' || queueError === '__MANUALLY_CANCELLED__') ? (
        <div className="flex flex-col items-center justify-center gap-8 animate-in fade-in zoom-in duration-300">
            <div className="bg-black/60 backdrop-blur-sm p-8 rounded-2xl flex flex-col items-center shadow-2xl border border-white/10 w-full max-w-sm text-center">
                {queueError === '__MATCHMAKING_TIMEOUT__' ? (
                    <>
                        <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-6 border border-red-500/20">
                            <Clock className="w-8 h-8 text-red-500" />
                        </div>
                        <h2 className="text-xl font-bold text-white mb-2 tracking-wide">No Opponent Found</h2>
                        <p className="text-neutral-400 text-sm mb-8 leading-relaxed">
                            We couldn&apos;t find a match within the time limit.<br />
                            Try searching again or choose another mode.
                        </p>
                    </>
                ) : (
                    <>
                        <div className="w-16 h-16 rounded-full bg-neutral-500/10 flex items-center justify-center mb-6 border border-neutral-500/20">
                            <XCircle className="w-8 h-8 text-neutral-400" />
                        </div>
                        <h2 className="text-xl font-bold text-white mb-2 tracking-wide">Search Cancelled</h2>
                        <p className="text-neutral-400 text-sm mb-8 leading-relaxed">
                            You stopped searching for an opponent.<br />
                            What would you like to do next?
                        </p>
                    </>
                )}

                <div className="flex flex-col gap-3 w-full">
                    <button
                        onClick={() => {
                            setQueueError(null);
                            setAutoJoin(true);
                        }}
                        className="w-full px-4 py-3 rounded-xl bg-orange-500 text-white font-medium hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/20 active:scale-[0.98]"
                    >
                        Try Again
                    </button>
                    <button
                        onClick={() => router.push('/play/friend')}
                        className="w-full px-4 py-3 rounded-xl bg-white/5 text-white font-medium hover:bg-white/10 transition-all border border-white/10 active:scale-[0.98]"
                    >
                        Play with Friend
                    </button>
                    <button
                        onClick={() => router.push('/game/setup-ai')}
                        className="w-full px-4 py-3 rounded-xl bg-white/5 text-white font-medium hover:bg-white/10 transition-all border border-white/10 active:scale-[0.98]"
                    >
                        Play vs AI
                    </button>
                    <button
                        onClick={() => router.push('/')}
                        className="w-full px-4 py-3 rounded-xl text-neutral-400 hover:text-white transition-all text-sm font-medium hover:bg-white/5"
                    >
                        Back to Home
                    </button>
                </div>
            </div>
        </div>
    ) : (
        <div className="space-y-3">
            {queueError && (
                <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                    {queueError}
                </div>
            )}
            <PlayModeSelection onSelectMode={handleSelectMode} socketReady={socketConnected} autoJoin={autoJoin} />
        </div>
    );

    return (
        <div className="min-h-screen bg-stone-900 flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background Board */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-full max-w-lg opacity-20 blur-[2px]">
                    <Board
                        pieces={{}}
                        readOnly={true}
                        className="grayscale-[0.5]"
                    />
                </div>
            </div>

            {/* Main Content */}
            <div className="w-full max-w-md relative z-10">
                {content}
            </div>
        </div>
    );
}
