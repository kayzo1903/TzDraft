"use client";

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useSocket } from '@/hooks/useSocket';
import { Board } from '@/components/game/Board';
import { gameService } from '@/services/game.service';
import { getBotByLevel } from '@/lib/game/bots';
import { Loader2, User } from 'lucide-react';
import Image from 'next/image';

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
};

type GameResponse = {
    whitePlayerId: string;
    blackPlayerId: string;
    aiLevel?: number;
    clockInfo?: ClockInfo;
};

export default function GamePage() {
    const { id: gameId } = useParams<{ id: string }>();
    const socket = useSocket();
    const [game, setGame] = useState<GameResponse | null>(null);
    const [players, setPlayers] = useState<PlayersResponse | null>(null);
    const [loading, setLoading] = useState(true);

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
        if (!socket) return;

        socket.on('gameStateUpdated', (data: unknown) => {
            console.log('Game state updated:', data);
            // Update board state here
        });

        return () => {
            socket.off('gameStateUpdated');
        };
    }, [socket]);

    const handleMove = (from: number, to: number) => {
        console.log(`Move attempt: ${from} -> ${to}`);
        if (socket) {
            socket.emit('makeMove', { gameId, from, to });
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
        return <div>Game not found</div>;
    }

    // Helper to get player info
    const getPlayerInfo = (color: 'WHITE' | 'BLACK') => {
        const isWhite = color === 'WHITE';
        const playerId = isWhite ? game.whitePlayerId : game.blackPlayerId;
        const player = isWhite ? players?.white : players?.black;

        if (playerId === 'AI') {
            const bot = getBotByLevel(game.aiLevel || 1);
            return {
                name: bot.name,
                rating: bot.elo,
                avatarSrc: bot.avatarSrc,
                isAi: true
            };
        }

        return {
            name: player?.username || 'Unknown',
            rating:
                typeof player?.rating === 'number'
                    ? player.rating
                    : typeof player?.rating === 'object' && player.rating
                        ? player.rating.rating
                        : 1200,
            avatarSrc: undefined, // User avatar logic here if needed
            isAi: false
        };
    };

    const whiteInfo = getPlayerInfo('WHITE');
    const blackInfo = getPlayerInfo('BLACK');

    // Assume current user is viewing. For now, we don't know who "You" are without auth context here,
    // but the request asked to show user names.
    // We can just show White vs Black for now, or use auth store if needed.
    // Let's stick to showing White (Bottom) vs Black (Top) or standard orientation.
    // Usually, if user is playing, they are at bottom.
    // For this task, let's just display the info in the placeholder slots.

    // Top is Opponent (Black usually, unless we rotate)
    const topPlayer = blackInfo;
    const bottomPlayer = whiteInfo;

    const formatTime = (ms: number) => {
        const totalSeconds = Math.floor(ms / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    };

    const getPlayerTime = (color: 'WHITE' | 'BLACK') => {
        if (!game?.clockInfo) return "10:00"; // Fallback
        const ms = color === 'WHITE' ? game.clockInfo.whiteTimeMs : game.clockInfo.blackTimeMs;
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
                            <div className="font-bold text-neutral-200">{topPlayer.name}</div>
                            <div className="text-xs text-neutral-500">Rating: {topPlayer.rating}</div>
                        </div>
                    </div>
                    <div className="bg-neutral-900 rounded p-2 text-center font-mono text-xl text-neutral-400">
                        {getPlayerTime('BLACK')}
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
                                <div className="font-semibold text-neutral-200 truncate">{topPlayer.name}</div>
                                <div className="text-xs text-neutral-500">{topPlayer.rating}</div>
                            </div>
                        </div>
                        <div className="shrink-0 bg-neutral-950/60 rounded-md px-2 py-1 text-center font-mono text-base text-neutral-100 border border-neutral-700/60">
                            {getPlayerTime('BLACK')}
                        </div>
                    </div>

                    <Board onMove={handleMove} />

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
                                <div className="font-semibold text-neutral-200 truncate">{bottomPlayer.name}</div>
                                <div className="text-xs text-neutral-500">{bottomPlayer.rating}</div>
                            </div>
                        </div>
                        <div className="shrink-0 bg-neutral-950/60 rounded-md px-2 py-1 text-center font-mono text-base text-neutral-100 border border-neutral-700/60">
                            {getPlayerTime('WHITE')}
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
                            <div className="font-bold text-neutral-200">{bottomPlayer.name}</div>
                            <div className="text-xs text-neutral-500">Rating: {bottomPlayer.rating}</div>
                        </div>
                    </div>
                    <div className="bg-neutral-800 rounded p-2 text-center font-mono text-xl text-white border border-neutral-600">
                        {getPlayerTime('WHITE')}
                    </div>
                </div>
            </div>
        </main>
    );
}
