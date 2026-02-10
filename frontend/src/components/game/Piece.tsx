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
            <div
                className={clsx(
                    'w-[70%] h-[70%] rounded-full border',
                    color === 'WHITE' ? 'border-neutral-200' : 'border-neutral-700'
                )}
            />

            {isKing && (
                <div className="absolute inset-0 flex items-center justify-center -translate-y-1.5">
                    <svg
                        viewBox="0 0 24 24"
                        className={clsx(
                            'w-10 h-10',
                            color === 'WHITE'
                                ? 'text-neutral-900'
                                : 'text-neutral-100'
                        )}
                        aria-hidden="true"
                    >
                        <path
                            d="M4 18h16l-1 3H5l-1-3zm1-8 3 4 4-6 4 6 3-4 1 7H4l1-7z"
                            fill="currentColor"
                        />
                    </svg>
                </div>
            )}
        </div>
    );
};
