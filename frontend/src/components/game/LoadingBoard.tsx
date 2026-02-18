import React from 'react';
import { Board } from './Board';
import { Loader2 } from 'lucide-react';

interface LoadingBoardProps {
    message?: string;
}

export const LoadingBoard: React.FC<LoadingBoardProps> = ({ message = "Loading..." }) => {
    return (
        <div className="flex flex-col items-center justify-center w-[600px] mx-auto gap-6 relative">
            <div className="relative w-full">
                {/* Render an empty board */}
                <Board
                    pieces={{}}
                    readOnly={true}
                    className="opacity-50 pointer-events-none grayscale-[0.3]"
                />

                {/* Overlay */}
                <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
                    <div className="bg-black/60 backdrop-blur-sm p-6 rounded-xl flex flex-col items-center shadow-2xl border border-white/10">
                        <Loader2 className="w-10 h-10 text-primary animate-spin mb-3" />
                        <p className="text-lg font-medium text-white tracking-wide">{message}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};
