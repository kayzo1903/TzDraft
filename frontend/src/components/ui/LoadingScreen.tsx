import React from 'react';

export const LoadingScreen: React.FC = () => {
    return (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#1E1E1E] text-white">
            <div className="relative flex flex-col items-center gap-6">

                {/* Logo or Icon Animation */}
                <div className="relative w-24 h-24 flex items-center justify-center">
                    {/* Pulsing Glow */}
                    <div className="absolute inset-0 bg-orange-500/20 rounded-full blur-xl animate-pulse" />

                    {/* Checker Piece Animation */}
                    <div className="w-16 h-16 bg-[#262522] border-4 border-[#3d3d3d] rounded-full shadow-2xl animate-bounce flex items-center justify-center relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
                        <div className="w-10 h-10 border-2 border-[#555] rounded-full opacity-50" />
                    </div>
                </div>

                {/* Text Animation */}
                <div className="space-y-2 text-center">
                    <h1 className="text-2xl font-black tracking-tight animate-pulse">
                        TzDraft
                    </h1>
                    <div className="flex items-center gap-1 justify-center">
                        <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                        <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                        <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" />
                    </div>
                </div>
            </div>
        </div>
    );
};
