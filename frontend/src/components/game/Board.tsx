"use client";

import React, { useState } from 'react';
import clsx from 'clsx';
import { Piece } from './Piece';

// Types for board state
export type PieceState = { color: 'WHITE' | 'BLACK', isKing?: boolean };
export type BoardState = Record<number, PieceState>;

interface BoardProps {
    pieces?: BoardState;
    onMove?: (from: number, to: number) => void;
    readOnly?: boolean;
}

export const Board: React.FC<BoardProps> = ({ pieces: externalPieces, onMove, readOnly = false }) => {
    // Temporary state for demonstration/MVP
    const [selectedSquare, setSelectedSquare] = useState<number | null>(null);

    // Helper to determine square color
    const isDarkSquare = (index: number) => {
        const row = Math.floor(index / 8);
        const col = index % 8;
        return (row + col) % 2 !== 0;
    };

    // Internal initial setup (fallback if no pieces prop provided)
    const getPiece = (index: number): PieceState | null => {
        // If external pieces are provided, use them
        if (externalPieces) {
            return externalPieces[index] || null;
        }

        // Fallback to initial setup
        if (!isDarkSquare(index)) return null;
        const row = Math.floor(index / 8);
        if (row < 3) return { color: 'BLACK' };
        if (row > 4) return { color: 'WHITE' };
        return null;
    };

    const handleSquareClick = (index: number) => {
        if (readOnly || !isDarkSquare(index)) return;

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
        const piece = getPiece(i);
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
