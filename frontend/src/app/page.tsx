import React from 'react';
import Link from 'next/link';
import { Board } from '@/components/game/Board';
import { Button } from '@/components/ui/Button';

export default function Home() {
  return (
    <main className="min-h-screen bg-[#2B2B2B] flex flex-col items-center justify-center p-6">
      <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

        {/* Left Column: Visual Board */}
        <div className="relative order-2 lg:order-1 flex justify-center">
          {/* Decorative Glare */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-orange-500/10 blur-[100px] rounded-full point-events-none" />

          <div className="relative w-full max-w-[500px] transform lg:rotate-[-2deg] transition-transform hover:scale-[1.02] duration-500">
            <div className="absolute inset-0 bg-black/40 blur-xl rounded-2xl transform translate-y-8" />
            <Board />
          </div>
        </div>

        {/* Right Column: Actions */}
        <div className="flex flex-col gap-8 text-center lg:text-left order-1 lg:order-2">

          <div className="space-y-4">
            <h1 className="text-5xl lg:text-7xl font-black text-[#EDEDED] leading-tight">
              Play <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-yellow-200">
                TzDraft
              </span>
            </h1>
            <p className="text-xl text-neutral-400 max-w-lg mx-auto lg:mx-0 leading-relaxed">
              The #1 platform for competitive Tanzania Drafti.
              Real-time multiplayer, analysis, and tournaments.
            </p>
          </div>

          <div className="flex flex-col gap-4 max-w-md mx-auto lg:mx-0 w-full">
            <Link href="/game/new-game" className="w-full">
              <Button size="lg" className="w-full gap-3">
                <span className="text-2xl">♟️</span>
                <div className="flex flex-col items-start leading-none">
                  <span className="font-bold">Play Online</span>
                  <span className="text-xs font-normal opacity-80">Play with friends or randoms</span>
                </div>
              </Button>
            </Link>

            <Link href="/game/bot" className="w-full">
              <Button variant="secondary" size="lg" className="w-full gap-3">
                <span className="text-2xl">🤖</span>
                <div className="flex flex-col items-start leading-none">
                  <span className="font-bold">Play Computer</span>
                  <span className="text-xs font-normal opacity-80">Challenge Stockfish (Cake)</span>
                </div>
              </Button>
            </Link>
          </div>

          <div className="flex items-center justify-center lg:justify-start gap-8 text-neutral-500 text-sm font-medium pt-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span>124 Players Online</span>
            </div>
            <div>•</div>
            <div>542 Games Today</div>
          </div>

        </div>

      </div>
    </main>
  );
}
