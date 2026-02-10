"use client";

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useSocket } from '@/hooks/useSocket';
import { Board } from '@/components/game/Board';
import { gameService } from '@/services/game.service';
import { getBotByLevel } from '@/lib/game/bots';
import { Loader2 } from 'lucide-react';

export default function GamePage() {
    const { id: gameId } = useParams();
    const socket = useSocket();
    const [isConnected, setIsConnected] = useState(false);
    const [game, setGame] = useState<any>(null);
    const [players, setPlayers] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchGame = async () => {
            try {
                const data = await gameService.getGame(gameId as string);
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

        setIsConnected(socket.connected);

        const onConnect = () => setIsConnected(true);
        const onDisconnect = () => setIsConnected(false);

        socket.on('connect', onConnect);
        socket.on('disconnect', onDisconnect);

        return () => {
            socket.off('connect', onConnect);
            socket.off('disconnect', onDisconnect);
        };
    }, [socket]);

    const status = isConnected ? 'Connected' : 'Connecting...';

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
                avatar: bot.avatar,
                isAi: true
            };
        }

        return {
            name: player?.username || 'Unknown',
            rating: typeof player?.rating === 'object' ? player.rating.rating : (player?.rating || 1200),
            avatar: undefined, // User avatar logic here if needed
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
        <main className="min-h-screen flex flex-col items-center justify-center p-4 gap-8">
            {/* Header / Status */}
            <div className="w-full max-w-4xl flex items-center justify-between bg-neutral-800 p-4 rounded-xl shadow-lg border border-neutral-700">
                <div className="flex items-center gap-4">
                    <div className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-orange-400 to-yellow-200">
                        TzDraft
                    </div>
                    <div className="h-6 w-px bg-neutral-600"></div>
                    <div className="text-neutral-400 text-sm">Game ID: <span className="font-mono text-neutral-200">{gameId}</span></div>
                </div>

                <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-red-500'}`}></div>
                    <span className="text-sm font-medium text-neutral-300">{status}</span>
                </div>
            </div>

            <div className="flex flex-col md:flex-row gap-8 w-full max-w-6xl items-start justify-center">
                {/* Top Player (Black) */}
                <div className="hidden md:flex flex-col gap-4 w-64 bg-neutral-800/50 p-4 rounded-xl border border-neutral-700/50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-neutral-600 flex items-center justify-center text-2xl">
                            {topPlayer.isAi ? topPlayer.avatar : '👤'}
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
                <div className="flex-1 max-w-[650px]">
                    <Board onMove={handleMove} />
                </div>

                {/* Bottom Player (White) */}
                <div className="hidden md:flex flex-col gap-4 w-64 bg-neutral-800/50 p-4 rounded-xl border border-neutral-700/50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center text-2xl">
                            {bottomPlayer.isAi ? bottomPlayer.avatar : '👤'}
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
