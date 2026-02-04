"use client";

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useSocket } from '@/hooks/useSocket';
import { Board } from '@/components/game/Board';

export default function GamePage() {
    const params = useParams();
    const gameId = params.id as string;
    const { socket, isConnected } = useSocket(gameId);

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
                {/* Opponent Panel (Placeholder) */}
                <div className="hidden md:flex flex-col gap-4 w-64 bg-neutral-800/50 p-4 rounded-xl border border-neutral-700/50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-neutral-600"></div>
                        <div>
                            <div className="font-bold text-neutral-200">Opponent</div>
                            <div className="text-xs text-neutral-500">Rating: 1200</div>
                        </div>
                    </div>
                    <div className="bg-neutral-900 rounded p-2 text-center font-mono text-xl text-neutral-400">
                        10:00
                    </div>
                </div>

                {/* Game Board */}
                <div className="flex-1 max-w-[650px]">
                    <Board onMove={handleMove} />
                </div>

                {/* Player Panel (Placeholder) */}
                <div className="hidden md:flex flex-col gap-4 w-64 bg-neutral-800/50 p-4 rounded-xl border border-neutral-700/50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-orange-500"></div>
                        <div>
                            <div className="font-bold text-neutral-200">You</div>
                            <div className="text-xs text-neutral-500">Rating: 1200</div>
                        </div>
                    </div>
                    <div className="bg-neutral-800 rounded p-2 text-center font-mono text-xl text-white border border-neutral-600">
                        10:00
                    </div>
                </div>
            </div>
        </main>
    );
}
