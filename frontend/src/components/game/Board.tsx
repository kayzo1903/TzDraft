"use client";

import React, { useState } from 'react';
import clsx from 'clsx';
import { Piece } from './Piece';

// Types for board state
export type PieceState = { color: 'WHITE' | 'BLACK', isKing?: boolean };
export type BoardState = Record<number, PieceState>;

interface BoardProps extends React.HTMLAttributes<HTMLDivElement> {
    pieces?: BoardState;
    onMove?: (from: number, to: number) => void;
    readOnly?: boolean;
    legalMoves?: Record<number, number[]>;
    forcedPieces?: number[];
    onInvalidSelect?: () => void;
}

export const Board: React.FC<BoardProps> = ({
    pieces: externalPieces,
    onMove,
    readOnly = false,
    legalMoves,
    forcedPieces = [],
    onInvalidSelect,
    className,
    ...props
}) => {
    // Temporary state for demonstration/MVP
    const [selectedSquare, setSelectedSquare] = useState<number | null>(null);
    const [isShaking, setIsShaking] = useState(false);

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
            // Attempt move only if it's a legal target (when provided)
            const legalTargets = legalMoves?.[selectedSquare];
            if (legalTargets && !legalTargets.includes(index)) {
                onInvalidSelect?.();
                setIsShaking(true);
                return;
            }

            onMove?.(selectedSquare, index);
            setSelectedSquare(null);
        } else {
            const piece = getPiece(index);
            if (!piece) {
                return;
            }

            // If mandatory capture is active, only allow selecting forced pieces.
            if (forcedPieces.length > 0 && !forcedPieces.includes(index)) {
                onInvalidSelect?.();
                setIsShaking(true);
                return;
            }

            // If legal moves are provided, only allow selecting pieces that can move.
            if (legalMoves && forcedPieces.length === 0 && !legalMoves[index]) {
                onInvalidSelect?.();
                setIsShaking(true);
                return;
            }
            setSelectedSquare(index);
        }
    };

    const renderSquare = (i: number) => {
        const isDark = isDarkSquare(i);
        const piece = getPiece(i);
        const isSelected = selectedSquare === i;
        const isForcedPiece = forcedPieces.includes(i);
        const isLegalTarget =
            selectedSquare !== null &&
            isDark &&
            (legalMoves?.[selectedSquare]?.includes(i) ?? false);

        return (
            <div
                key={i}
                onClick={() => handleSquareClick(i)}
                className={clsx(
                    'w-full h-full aspect-square flex items-center justify-center relative select-none touch-manipulation',
                    isDark ? 'bg-[var(--board-dark)] text-white' : 'bg-[var(--board-light)]',
                )}
            >
                {/* Highlight selected square */}
                {isSelected && isDark && (
                    <div className="absolute inset-0 bg-yellow-400/50 pointer-events-none" />
                )}

                {/* Highlight legal target squares */}
                {isLegalTarget && (
                    <div className="absolute inset-0 bg-emerald-400/40 ring-2 ring-emerald-300 pointer-events-none" />
                )}

                {/* Mandatory capture highlight */}
                {piece && isForcedPiece && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-[80%] h-[80%] rounded-full ring-2 ring-orange-300/80 shadow-[0_0_12px_rgba(251,146,60,0.65)] animate-pulse" />
                    </div>
                )}

                {/* When no external state is provided, render the fallback pieces inside the squares. */}
                {piece && !externalPieces && (
                    <Piece
                        color={piece.color}
                        isKing={piece.isKing}
                        isSelected={isSelected}
                    />
                )}
            </div>
        );
    };

    const files = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    const ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];

    return (
        <div
            className={clsx(
                "w-full max-w-[min(94vw,600px)] mx-auto bg-[#2B2B2B] p-1.5 sm:p-2 rounded-lg sm:rounded-xl shadow-xl ring-1 ring-white/10 touch-manipulation",
                isShaking && "board-shake",
                className
            )}
            onAnimationEnd={() => setIsShaking(false)}
            {...props}
        >
            <div className="grid grid-cols-1 grid-rows-1 gap-1 sm:grid-cols-[20px_1fr] sm:grid-rows-[1fr_20px]">
                <div className="hidden sm:grid sm:grid-rows-8">
                    {ranks.map((rank) => (
                        <div
                            key={rank}
                            className="flex items-center justify-center text-[10px] text-neutral-300 font-semibold"
                        >
                            {rank}
                        </div>
                    ))}
                </div>
                <div className="w-full aspect-square relative border-2 border-[#B58863]">
                    <div className="absolute inset-0 grid grid-cols-8 grid-rows-8">
                        {Array.from({ length: 64 }).map((_, i) => renderSquare(i))}
                    </div>
                    {externalPieces && (
                        <div className="absolute inset-0 pointer-events-none">
                            {Object.entries(externalPieces).map(([key, piece]) => {
                                const index = Number(key);
                                const row = Math.floor(index / 8);
                                const col = index % 8;
                                return (
                                    <div
                                        key={key}
                                        className="absolute flex items-center justify-center transition-all duration-300 ease-out"
                                        style={{
                                            left: `${col * 12.5}%`,
                                            top: `${row * 12.5}%`,
                                            width: "12.5%",
                                            height: "12.5%",
                                        }}
                                    >
                                        <Piece
                                            color={piece.color}
                                            isKing={piece.isKing}
                                            isSelected={selectedSquare === index}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
                <div className="hidden sm:block" />
                <div className="hidden sm:grid sm:grid-cols-8">
                    {files.map((file) => (
                        <div
                            key={file}
                            className="flex items-center justify-center text-[10px] text-neutral-300 font-semibold"
                        >
                            {file}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
