"use client";

import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { useSocket } from '@/hooks/useSocket';
import { Board } from '@/components/game/Board';
import { gameService } from '@/services/game.service';
import { getBotByLevel } from '@/lib/game/bots';
import { Loader2, User } from 'lucide-react';
import Image from 'next/image';
import { useAuthStore } from '@/lib/auth/auth-store';
import { useRouter } from '@/i18n/routing';
import { GameNotFound } from '@/components/game/GameNotFound';

type Rating = number | { rating: number };

type PlayerRecord = {
    username?: string;
    rating?: Rating;
};

type PlayersResponse = {
    white?: PlayerRecord;
    black?: PlayerRecord;
};

type ClockInfo = {
    whiteTimeMs: number;
    blackTimeMs: number;
    lastMoveAt?: string;
};

type GameResponse = {
    status?: 'WAITING' | 'ACTIVE' | 'FINISHED' | 'ABORTED';
    whitePlayerId: string | null;
    blackPlayerId: string | null;
    whiteGuestName?: string;
    blackGuestName?: string;
    currentTurn?: 'WHITE' | 'BLACK';
    gameType: 'RANKED' | 'CASUAL' | 'AI';
    aiLevel?: number;
    clockInfo?: ClockInfo;
};

function ColorBadge({ color }: { color: 'WHITE' | 'BLACK' }) {
    const isWhite = color === 'WHITE';
    return (
        <span className="inline-flex items-center gap-1 rounded-full border border-neutral-700 bg-neutral-900/70 px-2 py-0.5 text-[10px] uppercase tracking-wide text-neutral-300">
            <span
                className={
                    isWhite
                        ? "h-2.5 w-2.5 rounded-full border border-neutral-300 bg-neutral-100"
                        : "h-2.5 w-2.5 rounded-full border border-neutral-500 bg-neutral-800"
                }
            />
            {isWhite ? "White" : "Black"}
        </span>
    );
}

export default function GamePage() {
    const { id: gameId } = useParams<{ id: string }>();
    const router = useRouter();
    const socket = useSocket();
    const { user } = useAuthStore();
    const [game, setGame] = useState<GameResponse | null>(null);
    const [players, setPlayers] = useState<PlayersResponse | null>(null);
    const [viewerColor, setViewerColor] = useState<'WHITE' | 'BLACK'>('WHITE');
    const [actionLoading, setActionLoading] = useState<'resign' | 'abort' | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);
    const [confirmAction, setConfirmAction] = useState<'resign' | 'abort' | null>(null);
    const [resultCard, setResultCard] = useState<
        'resign' | 'abort' | 'opponent_resigned' | 'opponent_aborted' | 'timeout' | 'opponent_timeout' | null
    >(
        null,
    );
    const [loading, setLoading] = useState(true);
    const [displayClock, setDisplayClock] = useState<ClockInfo | null>(null);
    const [disconnectCountdown, setDisconnectCountdown] = useState<number | null>(null);
    const [selfDisconnectCountdown, setSelfDisconnectCountdown] = useState<number | null>(null);
    const gameIdRef = useRef(gameId);
    const viewerColorRef = useRef(viewerColor);

    useEffect(() => {
        const prevHtmlOverflowY = document.documentElement.style.overflowY;
        const prevBodyOverflowY = document.body.style.overflowY;
        const prevBodyOverscrollBehavior = document.body.style.overscrollBehavior;

        document.documentElement.style.overflowY = 'hidden';
        document.body.style.overflowY = 'hidden';
        document.body.style.overscrollBehavior = 'none';

        return () => {
            document.documentElement.style.overflowY = prevHtmlOverflowY;
            document.body.style.overflowY = prevBodyOverflowY;
            document.body.style.overscrollBehavior = prevBodyOverscrollBehavior;
        };
    }, []);

    useEffect(() => {
        const fetchGame = async () => {
            try {
                const data = await gameService.getGame(gameId);
                setGame(data.data.game);
                setPlayers(data.data.players);
            } catch (error) {
                console.error('Failed to fetch game:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchGame();
    }, [gameId]);

    useEffect(() => {
        if (!game) return;

        let resolvedColor: 'WHITE' | 'BLACK' | null = null;

        if (typeof window !== 'undefined') {
            const stored = window.sessionStorage.getItem(`tzdraft:game:${gameId}:color`);
            if (stored === 'WHITE' || stored === 'BLACK') {
                resolvedColor = stored;
            }
        }

        if (!resolvedColor && user?.id) {
            if (user.id === game.whitePlayerId) {
                resolvedColor = 'WHITE';
            } else if (user.id === game.blackPlayerId) {
                resolvedColor = 'BLACK';
            }
        }

        setViewerColor(resolvedColor || 'WHITE');
    }, [game, gameId, user?.id]);

    useEffect(() => {
        let active = true;
        let intervalId: number | null = null;

        const pullClock = async () => {
            try {
                const response = await gameService.getGameClock(gameId);
                if (!active) return;

                const serverGame = response?.data;
                if (!serverGame) return;

                setDisplayClock(serverGame.clockInfo || null);
                setGame((prev) =>
                    prev
                        ? {
                            ...prev,
                            status: serverGame.status ?? prev.status,
                            currentTurn: serverGame.currentTurn ?? prev.currentTurn,
                            clockInfo: serverGame.clockInfo ?? prev.clockInfo,
                        }
                        : prev,
                );
            } catch {
                // Keep last known clock if polling fails momentarily.
            }
        };

        pullClock();
        intervalId = window.setInterval(pullClock, 1000);

        return () => {
            active = false;
            if (intervalId) window.clearInterval(intervalId);
        };
    }, [gameId]);

    useEffect(() => {
        gameIdRef.current = gameId;
        viewerColorRef.current = viewerColor;
    }, [gameId, viewerColor]);

    const [pieces, setPieces] = useState<Record<number, { color: 'WHITE' | 'BLACK', isKing?: boolean }>>({});

    useEffect(() => {
        if (disconnectCountdown === null) return;
        const timer = window.setInterval(() => {
            setDisconnectCountdown((prev) => {
                if (prev === null) return null;
                if (prev <= 1) return null;
                return prev - 1;
            });
        }, 1000);
        return () => window.clearInterval(timer);
    }, [disconnectCountdown]);

    useEffect(() => {
        // Initialize pieces from initial game state
        if (game && (game as any).board) {
            setPieces((game as any).board);
        }
    }, [game]);

    useEffect(() => {
        if (!socket) return;

        socket.emit('joinGame', { gameId: gameIdRef.current });

        socket.on('gameStateUpdated', (data: any) => {
            console.log('Game state updated:', data);
            if (data.board) {
                setPieces(data.board);
            }
            // Also update other game state if needed (turn, status etc)
            setGame((prev) => {
                if (!prev) return null;
                return {
                    ...prev,
                    currentTurn: data.currentTurn,
                    status: data.status,
                    winner: data.winner,
                    endReason: data.endReason,
                    board: data.board // Keep generic cache updated
                } as any;
            });
        });

        socket.on('gameOver', (data: { winner?: 'WHITE' | 'BLACK' | 'DRAW' | null; reason?: string }) => {
            setDisconnectCountdown(null);
            setSelfDisconnectCountdown(null);
            if (data.reason === 'ABORTED') {
                setResultCard('opponent_aborted');
                return;
            }

            if (data.reason === 'RESIGN') {
                if (data.winner === viewerColorRef.current) {
                    setResultCard('opponent_resigned');
                } else {
                    setResultCard('resign');
                }
            }
            if (data.reason === 'DISCONNECT' && data.winner === viewerColorRef.current) {
                setResultCard('opponent_resigned');
            }

            if (data.reason === 'TIME') {
                if (data.winner === viewerColorRef.current) {
                    setResultCard('opponent_timeout');
                } else {
                    setResultCard('timeout');
                }
            }
        });

        socket.on('playerDisconnected', (data: { playerId?: string; timeoutSec?: number }) => {
            if (!user?.id || !data?.playerId) return;
            if (data.playerId === user.id) return;
            const total = Number(data.timeoutSec) || 60;
            setDisconnectCountdown(total);
        });

        socket.on('playerReconnected', (data: { playerId?: string }) => {
            if (!user?.id || !data?.playerId) return;
            if (data.playerId === user.id) return;
            setDisconnectCountdown(null);
        });

        socket.on('disconnect', () => {
            setSelfDisconnectCountdown(60);
        });

        socket.on('connect', () => {
            setSelfDisconnectCountdown(null);
        });

        return () => {
            socket.off('gameStateUpdated');
            socket.off('gameOver');
            socket.off('playerDisconnected');
            socket.off('playerReconnected');
            socket.off('disconnect');
            socket.off('connect');
        };
    }, [socket, user?.id]);

    useEffect(() => {
        if (selfDisconnectCountdown === null) return;
        const timer = window.setInterval(() => {
            setSelfDisconnectCountdown((prev) => {
                if (prev === null) return null;
                if (prev <= 1) return 0;
                return prev - 1;
            });
        }, 1000);
        return () => window.clearInterval(timer);
    }, [selfDisconnectCountdown]);

    const handleMove = (from: number, to: number) => {
        const normalizedFrom = viewerColor === 'BLACK' ? 63 - from : from;
        const normalizedTo = viewerColor === 'BLACK' ? 63 - to : to;
        console.log(`Move attempt: ${from} -> ${to}`);
        if (socket) {
            socket.emit('makeMove', { gameId, from: normalizedFrom, to: normalizedTo });
        }
    };

    const handleResign = async () => {
        if (!user) {
            setActionError('You must be logged in to resign.');
            return;
        }

        try {
            setActionLoading('resign');
            setActionError(null);
            await gameService.resignGame(gameId);
            setResultCard('resign');
        } catch (error: any) {
            setActionError(error?.response?.data?.message || 'Failed to resign game.');
        } finally {
            setActionLoading(null);
        }
    };

    const handleAbort = async () => {
        if (!user) {
            setActionError('You must be logged in to abort.');
            return;
        }

        try {
            setActionLoading('abort');
            setActionError(null);
            await gameService.abortGame(gameId);
            setResultCard('abort');
        } catch (error: any) {
            setActionError(error?.response?.data?.message || 'Failed to abort game.');
        } finally {
            setActionLoading(null);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="h-10 w-10 animate-spin text-orange-500" />
            </div>
        );
    }

    if (!game) {
        return <GameNotFound />;
    }

    // Helper to get player info
    const getPlayerInfo = (color: 'WHITE' | 'BLACK') => {
        const isWhite = color === 'WHITE';
        const playerId = isWhite ? game.whitePlayerId : game.blackPlayerId;
        const player = isWhite ? players?.white : players?.black;
        const guestName = isWhite ? game.whiteGuestName : game.blackGuestName;

        if (playerId === 'AI' || (!playerId && !guestName && game.gameType === 'AI')) {
            const bot = getBotByLevel(game.aiLevel || 1);
            return {
                name: bot.name,
                rating: bot.elo,
                avatarSrc: bot.avatarSrc,
                isAi: true
            };
        }

        return {
            name: player?.username || guestName || 'Guest',
            rating:
                typeof player?.rating === 'number'
                    ? player.rating
                    : typeof player?.rating === 'object' && player.rating
                        ? player.rating.rating
                        : (game.gameType === 'RANKED' ? 1200 : 'Unrated'),
            avatarSrc: undefined, // User avatar logic here if needed
            isAi: false
        };
    };

    const whiteInfo = getPlayerInfo('WHITE');
    const blackInfo = getPlayerInfo('BLACK');
    const topColor: 'WHITE' | 'BLACK' = viewerColor === 'WHITE' ? 'BLACK' : 'WHITE';
    const bottomColor: 'WHITE' | 'BLACK' = viewerColor;
    const topPlayer = topColor === 'WHITE' ? whiteInfo : blackInfo;
    const bottomPlayer = bottomColor === 'WHITE' ? whiteInfo : blackInfo;

    const formatTime = (ms: number) => {
        const totalSeconds = Math.floor(ms / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    };

    const getPlayerTime = (color: 'WHITE' | 'BLACK') => {
        if (!game?.clockInfo) return "10:00"; // Fallback
        const source = displayClock || game.clockInfo;
        const ms = color === 'WHITE' ? source.whiteTimeMs : source.blackTimeMs;
        return formatTime(ms);
    };

    return (
        <main className="min-h-[100svh] overflow-hidden overscroll-none flex flex-col items-center justify-start px-3 py-3 sm:p-4 gap-4 sm:gap-8">
            <div className="flex flex-col md:flex-row gap-4 sm:gap-8 w-full max-w-6xl items-stretch md:items-start justify-center">
                {/* Top Player (Black) */}
                <div className="hidden md:flex flex-col gap-4 w-64 bg-neutral-800/50 p-4 rounded-xl border border-neutral-700/50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-neutral-600 flex items-center justify-center text-2xl">
                            {topPlayer.isAi && topPlayer.avatarSrc ? (
                                <div className="relative w-full h-full">
                                    <Image
                                        src={topPlayer.avatarSrc}
                                        alt={topPlayer.name}
                                        fill
                                        sizes="40px"
                                        className="object-cover object-[50%_60%] rounded-full"
                                    />
                                </div>
                            ) : (
                                <User className="h-6 w-6 text-neutral-200" aria-hidden="true" />
                            )}
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <div className="font-bold text-neutral-200">{topPlayer.name}</div>
                                <ColorBadge color={topColor} />
                            </div>
                            <div className="text-xs text-neutral-500">
                                {game.gameType === 'RANKED' ? `Rating: ${topPlayer.rating}` : 'Casual'}
                            </div>
                        </div>
                    </div>
                    <div className="bg-neutral-900 rounded p-2 text-center font-mono text-xl text-neutral-400">
                        {getPlayerTime(topColor)}
                    </div>
                </div>

                {/* Game Board */}
                <div className="flex-1 max-w-[650px] w-full mx-auto">
                    <div className="md:hidden mb-2 rounded-xl border border-neutral-700/50 bg-neutral-900/40 backdrop-blur px-3 py-2 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-full bg-neutral-700 flex items-center justify-center overflow-hidden shrink-0">
                                {topPlayer.isAi && topPlayer.avatarSrc ? (
                                    <div className="relative w-full h-full">
                                        <Image
                                            src={topPlayer.avatarSrc}
                                            alt={topPlayer.name}
                                            fill
                                            sizes="36px"
                                            className="object-cover object-[50%_60%] rounded-full"
                                        />
                                    </div>
                                ) : (
                                    <User className="h-5 w-5 text-neutral-200" aria-hidden="true" />
                                )}
                            </div>
                            <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                    <div className="font-semibold text-neutral-200 truncate">{topPlayer.name}</div>
                                    <ColorBadge color={topColor} />
                                </div>
                                <div className="text-xs text-neutral-500">
                                    {game.gameType === 'RANKED' ? `Rating: ${topPlayer.rating}` : 'Casual'}
                                </div>
                            </div>
                        </div>
                        <div className="shrink-0 bg-neutral-950/60 rounded-md px-2 py-1 text-center font-mono text-base text-neutral-100 border border-neutral-700/60">
                            {getPlayerTime(topColor)}
                        </div>
                    </div>

                    <Board
                        pieces={pieces}
                        onMove={handleMove}
                        flipped={viewerColor === 'BLACK'}
                    />

                    <div className="mt-3 flex items-center justify-center gap-3">
                        <button
                            onClick={() => setConfirmAction('resign')}
                            disabled={actionLoading !== null}
                            className="rounded-lg border border-red-500/40 bg-red-500/15 px-4 py-2 text-sm font-semibold text-red-200 hover:bg-red-500/25 disabled:opacity-60"
                        >
                            {actionLoading === 'resign' ? 'Resigning...' : 'Resign'}
                        </button>
                        <button
                            onClick={() => setConfirmAction('abort')}
                            disabled={actionLoading !== null}
                            className="rounded-lg border border-amber-500/40 bg-amber-500/15 px-4 py-2 text-sm font-semibold text-amber-200 hover:bg-amber-500/25 disabled:opacity-60"
                        >
                            {actionLoading === 'abort' ? 'Aborting...' : 'Abort Game'}
                        </button>
                    </div>
                    {actionError && (
                        <div className="mt-2 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-center text-sm text-red-200">
                            {actionError}
                        </div>
                    )}
                    {disconnectCountdown !== null && (
                        <div className="mt-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-center text-sm text-amber-200">
                            Opponent disconnected. Auto-forfeit in {disconnectCountdown}s.
                        </div>
                    )}
                    {selfDisconnectCountdown !== null && (
                        <div className="mt-2 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-center text-sm text-red-200">
                            You are disconnected. Reconnect within {selfDisconnectCountdown}s to avoid forfeit.
                        </div>
                    )}

                    <div className="md:hidden mt-2 rounded-xl border border-neutral-700/50 bg-neutral-900/40 backdrop-blur px-3 py-2 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-full bg-orange-500 flex items-center justify-center overflow-hidden shrink-0">
                                {bottomPlayer.isAi && bottomPlayer.avatarSrc ? (
                                    <div className="relative w-full h-full">
                                        <Image
                                            src={bottomPlayer.avatarSrc}
                                            alt={bottomPlayer.name}
                                            fill
                                            sizes="36px"
                                            className="object-cover object-[50%_60%] rounded-full"
                                        />
                                    </div>
                                ) : (
                                    <User className="h-5 w-5 text-white" aria-hidden="true" />
                                )}
                            </div>
                            <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                    <div className="font-semibold text-neutral-200 truncate">{bottomPlayer.name}</div>
                                    <ColorBadge color={bottomColor} />
                                </div>
                                <div className="text-xs text-neutral-500">
                                    {game.gameType === 'RANKED' ? `Rating: ${bottomPlayer.rating}` : 'Casual'}
                                </div>
                            </div>
                        </div>
                        <div className="shrink-0 bg-neutral-950/60 rounded-md px-2 py-1 text-center font-mono text-base text-neutral-100 border border-neutral-700/60">
                            {getPlayerTime(bottomColor)}
                        </div>
                    </div>
                </div>

                {/* Bottom Player (White) */}
                <div className="hidden md:flex flex-col gap-4 w-64 bg-neutral-800/50 p-4 rounded-xl border border-neutral-700/50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center text-2xl">
                            {bottomPlayer.isAi && bottomPlayer.avatarSrc ? (
                                <div className="relative w-full h-full">
                                    <Image
                                        src={bottomPlayer.avatarSrc}
                                        alt={bottomPlayer.name}
                                        fill
                                        sizes="40px"
                                        className="object-cover object-[50%_60%] rounded-full"
                                    />
                                </div>
                            ) : (
                                <User className="h-6 w-6 text-white" aria-hidden="true" />
                            )}
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <div className="font-bold text-neutral-200">{bottomPlayer.name}</div>
                                <ColorBadge color={bottomColor} />
                            </div>
                            <div className="text-xs text-neutral-500">
                                {game.gameType === 'RANKED' ? `Rating: ${bottomPlayer.rating}` : 'Casual'}
                            </div>
                        </div>
                    </div>
                    <div className="bg-neutral-800 rounded p-2 text-center font-mono text-xl text-white border border-neutral-600">
                        {getPlayerTime(bottomColor)}
                    </div>
                </div>
            </div>

            {confirmAction && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="w-full max-w-sm mx-4 rounded-2xl border border-neutral-700 bg-neutral-900 shadow-2xl">
                        <div className="p-6 border-b border-neutral-800">
                            <div className="text-sm uppercase tracking-[0.2em] text-neutral-500">
                                Confirm Action
                            </div>
                            <div className="mt-2 text-xl font-bold text-neutral-100">
                                {confirmAction === 'resign'
                                    ? 'Are you sure you want to resign this game?'
                                    : 'Abort this game? This only works before any move is made.'}
                            </div>
                        </div>
                        <div className="p-6 flex flex-col gap-3">
                            <button
                                onClick={async () => {
                                    const action = confirmAction;
                                    setConfirmAction(null);
                                    if (action === 'resign') {
                                        await handleResign();
                                    } else {
                                        await handleAbort();
                                    }
                                }}
                                disabled={actionLoading !== null}
                                className="rounded-lg border border-neutral-600 bg-neutral-800 px-4 py-2 text-sm font-semibold text-neutral-100 hover:bg-neutral-700 disabled:opacity-60"
                            >
                                Confirm
                            </button>
                            <button
                                onClick={() => setConfirmAction(null)}
                                disabled={actionLoading !== null}
                                className="rounded-lg border border-neutral-700 bg-transparent px-4 py-2 text-sm font-semibold text-neutral-300 hover:bg-neutral-800 disabled:opacity-60"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {resultCard && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="w-full max-w-md mx-4 rounded-2xl border border-neutral-700 bg-neutral-900 shadow-2xl">
                        <div className="p-6 border-b border-neutral-800">
                            <div className="text-sm uppercase tracking-[0.2em] text-neutral-500">
                                Game Result
                            </div>
                            <div className="mt-2 text-2xl font-bold text-neutral-100">
                                {resultCard === 'abort' || resultCard === 'opponent_aborted'
                                    ? 'Game Aborted'
                                    : resultCard === 'opponent_resigned'
                                        ? 'Opponent Resigned'
                                        : resultCard === 'timeout'
                                            ? 'Time Out'
                                            : resultCard === 'opponent_timeout'
                                                ? 'Opponent Time Out'
                                                : 'You Resigned'}
                            </div>
                            <div className="mt-2 text-sm text-neutral-400">
                                {resultCard === 'abort' || resultCard === 'opponent_aborted'
                                    ? 'No rating change when the game is aborted before any move.'
                                    : resultCard === 'opponent_resigned'
                                        ? 'Opponent resigned. This game is over.'
                                        : resultCard === 'opponent_timeout'
                                            ? 'Opponent ran out of time. You win!'
                                            : resultCard === 'timeout'
                                                ? 'You ran out of time. You lose.'
                                                : 'This resignation has been recorded as a loss.'}
                            </div>
                        </div>
                        <div className="p-6 flex flex-col gap-3">
                            <button
                                onClick={() => router.push('/')}
                                className="rounded-lg border border-neutral-600 bg-neutral-800 px-4 py-2 text-sm font-semibold text-neutral-100 hover:bg-neutral-700"
                            >
                                Go Home
                            </button>
                            <button
                                onClick={() => router.push('/game/online')}
                                className="rounded-lg border border-amber-500/40 bg-amber-500/15 px-4 py-2 text-sm font-semibold text-amber-200 hover:bg-amber-500/25"
                            >
                                New Match Online
                            </button>
                            {/* Only show rematch if not aborted? Or maybe simplify */}
                            {!(resultCard === 'abort' || resultCard === 'opponent_aborted') && (
                                <button
                                    onClick={() => router.push('/game/online?rematch=1')}
                                    className="rounded-lg border border-neutral-600 bg-neutral-800 px-4 py-2 text-sm font-semibold text-neutral-100 hover:bg-neutral-700"
                                >
                                    Rematch
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}
