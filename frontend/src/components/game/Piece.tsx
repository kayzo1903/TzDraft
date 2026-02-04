import React from 'react';
import clsx from 'clsx';

interface PieceProps {
    color: 'WHITE' | 'BLACK';
    isKing?: boolean;
    isSelected?: boolean;
}

export const Piece: React.FC<PieceProps> = ({ color, isKing, isSelected }) => {
    return (
        <div
            className={clsx(
                'w-[80%] h-[80%] rounded-full shadow-md transition-transform duration-200',
                color === 'WHITE'
                    ? 'bg-neutral-100 border-2 border-neutral-300'
                    : 'bg-neutral-800 border-2 border-neutral-600',
                isSelected && 'ring-4 ring-yellow-400 scale-110',
                'flex items-center justify-center relative'
            )}
        >
            {/* Inner detailing for 3D effect */}
            <div
                className={clsx(
                    'w-[70%] h-[70%] rounded-full border',
                    color === 'WHITE' ? 'border-neutral-200' : 'border-neutral-700'
                )}
            />

            {/* King Indicator */}
            {isKing && (
                <div className="absolute inset-0 flex items-center justify-center text-2xl">
                    👑
                </div>
            )}
        </div>
    );
};
