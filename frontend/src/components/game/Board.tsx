"use client";

import React, { useState } from 'react';
import clsx from 'clsx';
import { Piece } from './Piece';

// Types for local state (will be replaced by shared types later)
type PlayerColor = 'WHITE' | 'BLACK';

interface BoardProps {
    // We'll accept the board state as a prop eventually
    // boardState: BoardState; 
    onMove?: (from: number, to: number) => void;
}

export const Board: React.FC<BoardProps> = ({ onMove }) => {
    // Temporary state for demonstration/MVP
    const [selectedSquare, setSelectedSquare] = useState<number | null>(null);

    // Helper to determine square color
    const isDarkSquare = (index: number) => {
        const row = Math.floor(index / 8);
        const col = index % 8;
        // In standard check/draughts, dark squares are where (row + col) is odd 
        // BUT typically A1 (bottom-left) is dark. 
        // Let's stick to standard integer 0-63 layout where 0 is top-left usually.
        return (row + col) % 2 !== 0;
    };

    // Mock initial pieces (standard 8x8 setup)
    // 0-63 indices. Dark squares only.
    // Rows 0-2: Black
    // Rows 5-7: White
    const getInitialPiece = (index: number): { color: PlayerColor } | null => {
        if (!isDarkSquare(index)) return null;
        const row = Math.floor(index / 8);
        if (row < 3) return { color: 'BLACK' };
        if (row > 4) return { color: 'WHITE' };
        return null;
    };

    const handleSquareClick = (index: number) => {
        if (!isDarkSquare(index)) return;

        if (selectedSquare === index) {
            setSelectedSquare(null);
            return;
        }

        if (selectedSquare !== null) {
            // Attempt move
            onMove?.(selectedSquare, index);
            setSelectedSquare(null);
        } else {
            // Select piece
            // In real app, check if square has a piece
            setSelectedSquare(index);
        }
    };

    const renderSquare = (i: number) => {
        const isDark = isDarkSquare(i);
        const piece = getInitialPiece(i); // This will come from props later
        const isSelected = selectedSquare === i;

        // Tailwind custom colors from globals.css
        // We use utility classes that map to the CSS variables if setup, 
        // or we can use arbitrary values referencing the variables.
        // Since we defined --board-light and --board-dark in :root, 
        // we can use `bg-[var(--board-light)]` style.

        return (
            <div
                key={i}
                onClick={() => handleSquareClick(i)}
                className={clsx(
                    'w-full h-full aspect-square flex items-center justify-center relative',
                    isDark ? 'bg-[var(--board-dark)] text-white' : 'bg-[var(--board-light)]',
                    // Show coordinates (optional, for dev)
                    'text-xs select-none'
                )}
            >
                {/* Rank/File Labels (simplified) */}
                {/* {i} */}

                {/* Highlight selected square */}
                {isSelected && isDark && (
                    <div className="absolute inset-0 bg-yellow-400/50 pointer-events-none" />
                )}

                {/* Piece */}
                {piece && (
                    <div className="w-full h-full p-1 cursor-pointer">
                        <Piece color={piece.color} isSelected={isSelected} />
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="w-full max-w-[600px] mx-auto aspect-square bg-[#2B2B2B] p-2 rounded-lg shadow-xl ring-1 ring-white/10">
            <div className="w-full h-full grid grid-cols-8 grid-rows-8 border-2 border-[#B58863]">
                {Array.from({ length: 64 }).map((_, i) => renderSquare(i))}
            </div>
        </div>
    );
};
