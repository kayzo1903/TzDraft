import React from 'react';
import { Board } from '@/components/game/Board';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="min-h-[calc(100vh-64px)] bg-[#312e2b] flex items-center justify-center p-4">
            <div className="w-full max-w-5xl bg-[#262521] rounded-lg shadow-2xl overflow-hidden flex flex-col md:flex-row">
                {/* Left: Login/Signup Form */}
                <div className="w-full md:w-1/2 p-8 md:p-12 flex flex-col justify-center">
                    {children}
                </div>

                {/* Right: Feature Graphic (Desktop only) */}
                <div className="hidden md:flex md:w-1/2 bg-[var(--secondary)] items-center justify-center relative overflow-hidden p-8">
                    <div className="absolute inset-0 opacity-20 bg-[url('/noise.png')]"></div>
                    <div className="relative transform scale-75 rotate-3 shadow-2xl rounded-lg">
                        <Board />
                    </div>
                </div>
            </div>
        </div>
    );
}
