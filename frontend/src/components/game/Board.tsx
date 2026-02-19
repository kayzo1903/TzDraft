"use client";

import React, { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { Piece } from './Piece';

// Types for board state
export type PieceState = { color: 'WHITE' | 'BLACK', isKing?: boolean };
export type BoardState = Record<number, PieceState>;
type AnimatedPiece = PieceState & { id: string; displayIndex: number };

interface BoardProps extends React.HTMLAttributes<HTMLDivElement> {
    pieces?: BoardState;
    onMove?: (from: number, to: number) => void;
    readOnly?: boolean;
    legalMoves?: Record<number, number[]>;
    forcedPieces?: number[];
    onInvalidSelect?: () => void;
    flipped?: boolean;
}

export const Board: React.FC<BoardProps> = ({
    pieces: externalPieces,
    onMove,
    readOnly = false,
    legalMoves,
    forcedPieces = [],
    onInvalidSelect,
    flipped = false,
    className,
    ...props
}) => {
    // Temporary state for demonstration/MVP
    const [selectedSquare, setSelectedSquare] = useState<number | null>(null);
    const [isShaking, setIsShaking] = useState(false);
    const pieceIdCounterRef = useRef(0);
    const [animatedPieces, setAnimatedPieces] = useState<AnimatedPiece[]>([]);

    // Helper to determine square color
    const isDarkSquare = (index: number) => {
        const row = Math.floor(index / 8);
        const col = index % 8;
        return (row + col) % 2 !== 0;
    };

    const toBoardIndex = (displayIndex: number) =>
        flipped ? 63 - displayIndex : displayIndex;

    const toDisplayIndex = (boardIndex: number) =>
        flipped ? 63 - boardIndex : boardIndex;

    const fileFor = (displayCol: number) => {
        const base = "a".charCodeAt(0);
        return String.fromCharCode(base + (flipped ? 7 - displayCol : displayCol));
    };

    const rankFor = (displayRow: number) => (flipped ? displayRow + 1 : 8 - displayRow);

    useEffect(() => {
        if (!externalPieces) {
            setAnimatedPieces([]);
            return;
        }

        const nextTargets = Object.entries(externalPieces).map(([key, piece]) => ({
            color: piece.color,
            isKing: piece.isKing,
            displayIndex: toDisplayIndex(Number(key)),
        }));

        setAnimatedPieces((prev) => {
            const usedPrevIds = new Set<string>();
            const next: AnimatedPiece[] = [];

            for (const target of nextTargets) {
                let bestMatch: AnimatedPiece | null = null;
                let bestDistance = Number.POSITIVE_INFINITY;

                for (const candidate of prev) {
                    if (usedPrevIds.has(candidate.id)) continue;
                    if (candidate.color !== target.color) continue;
                    if (Boolean(candidate.isKing) !== Boolean(target.isKing)) continue;

                    const fromRow = Math.floor(candidate.displayIndex / 8);
                    const fromCol = candidate.displayIndex % 8;
                    const toRow = Math.floor(target.displayIndex / 8);
                    const toCol = target.displayIndex % 8;
                    const distance = Math.abs(fromRow - toRow) + Math.abs(fromCol - toCol);

                    if (distance < bestDistance) {
                        bestDistance = distance;
                        bestMatch = candidate;
                    }
                }

                if (bestMatch) {
                    usedPrevIds.add(bestMatch.id);
                    next.push({
                        id: bestMatch.id,
                        color: target.color,
                        isKing: target.isKing,
                        displayIndex: target.displayIndex,
                    });
                } else {
                    const id = `p-${pieceIdCounterRef.current++}`;
                    next.push({
                        id,
                        color: target.color,
                        isKing: target.isKing,
                        displayIndex: target.displayIndex,
                    });
                }
            }

            return next;
        });
    }, [externalPieces, flipped]);

    // Internal initial setup (fallback if no pieces prop provided)
    const getPiece = (displayIndex: number): PieceState | null => {
        const boardIndex = toBoardIndex(displayIndex);
        // If external pieces are provided, use them
        if (externalPieces) {
            return externalPieces[boardIndex] || null;
        }

        // Fallback to initial setup
        if (!isDarkSquare(displayIndex)) return null;
        const row = Math.floor(boardIndex / 8);
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
        const displayRow = Math.floor(i / 8);
        const displayCol = i % 8;
        const showRank = displayCol === 0;
        const showFile = displayRow === 7;
        const coordTextClass = isDark ? "text-neutral-200/70" : "text-neutral-900/40";

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

                {/* Chess.com-style coordinates (a1-h8), rotate with perspective */}
                {(showRank || showFile) && (
                    <div className="absolute inset-0 pointer-events-none">
                        {showRank && (
                            <div className={clsx("absolute left-1 top-1 text-[10px] font-semibold", coordTextClass)}>
                                {rankFor(displayRow)}
                            </div>
                        )}
                        {showFile && (
                            <div className={clsx("absolute left-1 bottom-1 text-[10px] font-semibold lowercase", coordTextClass)}>
                                {fileFor(displayCol)}
                            </div>
                        )}
                    </div>
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

    return (
        <div
            className={clsx(
                "w-[600px] mx-auto bg-[#2B2B2B] p-1.5 sm:p-2 rounded-lg sm:rounded-xl shadow-xl ring-1 ring-white/10 touch-manipulation",
                isShaking && "board-shake",
                className
            )}
            onAnimationEnd={() => setIsShaking(false)}
            {...props}
        >
            <div className="w-full aspect-square relative border-2 border-[#B58863]">
                <div className="absolute inset-0 grid grid-cols-8 grid-rows-8">
                    {Array.from({ length: 64 }).map((_, i) => renderSquare(i))}
                </div>
                {externalPieces && (
                    <div className="absolute inset-0 pointer-events-none">
                        {animatedPieces.map((piece) => {
                            const displayIndex = piece.displayIndex;
                            const row = Math.floor(displayIndex / 8);
                            const col = displayIndex % 8;
                            return (
                                <div
                                    key={piece.id}
                                    className="absolute left-0 top-0 flex items-center justify-center transition-transform duration-200 sm:duration-[240ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
                                    style={{
                                        width: "12.5%",
                                        height: "12.5%",
                                        transform: `translate3d(${col * 100}%, ${row * 100}%, 0)`,
                                        willChange: "transform",
                                    }}
                                >
                                    <Piece
                                        color={piece.color}
                                        isKing={piece.isKing}
                                        isSelected={selectedSquare === displayIndex}
                                    />
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};
