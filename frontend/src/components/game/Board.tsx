"use client";

import React, { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { Piece } from "./Piece";

export type PieceState = { color: "WHITE" | "BLACK"; isKing?: boolean };
export type BoardState = Record<number, PieceState>;
export type LastMoveState = { from: number; to: number } | null;
export type CaptureGhost = { id: number; index: number; piece: PieceState };

interface BoardProps extends React.HTMLAttributes<HTMLDivElement> {
  pieces?: BoardState;
  onMove?: (from: number, to: number) => void;
  readOnly?: boolean;
  legalMoves?: Record<number, number[]>;
  forcedPieces?: number[];
  onInvalidSelect?: () => void;
  lastMove?: LastMoveState;
  capturedGhosts?: CaptureGhost[];
}

/**
 * Track which piece index is currently animating (just landed).
 * We set this for ~350ms after a move so the piece can play its "land" scale-down.
 */
function usePieceLanding() {
  const [landingIndex, setLandingIndex] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerLanding = (index: number) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setLandingIndex(index);
    timerRef.current = setTimeout(() => {
      setLandingIndex(null);
      timerRef.current = null;
    }, 400);
  };

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);
  return { landingIndex, triggerLanding };
}

export const Board: React.FC<BoardProps> = ({
  pieces: externalPieces,
  onMove,
  readOnly = false,
  legalMoves,
  forcedPieces = [],
  onInvalidSelect,
  lastMove = null,
  capturedGhosts = [],
  className,
  ...props
}) => {
  const [selectedSquare, setSelectedSquare] = useState<number | null>(null);
  const [isShaking, setIsShaking] = useState(false);
  const { landingIndex, triggerLanding } = usePieceLanding();

  const isDarkSquare = (index: number) => {
    const row = Math.floor(index / 8);
    const col = index % 8;
    return (row + col) % 2 !== 0;
  };

  const getPiece = (index: number): PieceState | null => {
    if (externalPieces) return externalPieces[index] ?? null;
    if (!isDarkSquare(index)) return null;
    const row = Math.floor(index / 8);
    if (row < 3) return { color: "BLACK" };
    if (row > 4) return { color: "WHITE" };
    return null;
  };

  const handleSquareClick = (index: number) => {
    if (readOnly || !isDarkSquare(index)) return;

    if (selectedSquare === index) { setSelectedSquare(null); return; }

    if (selectedSquare !== null) {
      const legalTargets = legalMoves?.[selectedSquare];
      if (legalTargets && !legalTargets.includes(index)) {
        onInvalidSelect?.();
        setIsShaking(true);
        return;
      }
      onMove?.(selectedSquare, index);
      triggerLanding(index);
      setSelectedSquare(null);
      return;
    }

    const piece = getPiece(index);
    if (!piece) return;

    if (forcedPieces.length > 0 && !forcedPieces.includes(index)) {
      onInvalidSelect?.();
      setIsShaking(true);
      return;
    }

    if (legalMoves && forcedPieces.length === 0 && !legalMoves[index]) {
      onInvalidSelect?.();
      setIsShaking(true);
      return;
    }

    setSelectedSquare(index);
  };

  const renderSquare = (index: number) => {
    const isDark = isDarkSquare(index);
    const piece = getPiece(index);
    const isSelected = selectedSquare === index;
    const isForcedPiece = forcedPieces.includes(index);
    const isLegalTarget =
      selectedSquare !== null &&
      isDark &&
      (legalMoves?.[selectedSquare]?.includes(index) ?? false);
    const isLastMoveSquare = Boolean(
      lastMove && (lastMove.from === index || lastMove.to === index)
    );
    const isLastMoveToSquare = Boolean(lastMove && lastMove.to === index);

    return (
      <div
        key={index}
        onClick={() => handleSquareClick(index)}
        className={clsx(
          "w-full h-full aspect-square flex items-center justify-center relative select-none touch-manipulation cursor-pointer",
          isDark
            ? "bg-[var(--board-dark)]"
            : "bg-[var(--board-light)]",
        )}
      >
        {/* Selected highlight */}
        {isSelected && isDark && (
          <div className="absolute inset-0 bg-yellow-400/40 pointer-events-none" />
        )}

        {/* Legal move dot */}
        {isLegalTarget && !piece && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-[30%] h-[30%] rounded-full bg-neutral-900/40 ring-0" />
          </div>
        )}
        {/* Legal capture ring */}
        {isLegalTarget && piece && (
          <div className="absolute inset-[3%] rounded-full ring-[3px] ring-emerald-400/70 pointer-events-none" />
        )}

        {/* Last-move tints */}
        {isLastMoveSquare && isDark && (
          <div
            className={clsx(
              "absolute inset-0 pointer-events-none",
              isLastMoveToSquare
                ? "bg-amber-400/20"
                : "bg-amber-300/12",
            )}
          />
        )}

        {/* Forced-piece pulse ring */}
        {piece && isForcedPiece && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-[84%] h-[84%] rounded-full ring-2 ring-orange-400/80 shadow-[0_0_14px_rgba(251,146,60,0.7)] animate-pulse" />
          </div>
        )}

        {/* Static piece (demo / no externalPieces) */}
        {piece && !externalPieces && (
          <Piece color={piece.color} isKing={piece.isKing} isSelected={isSelected} />
        )}
      </div>
    );
  };

  const files = ["A", "B", "C", "D", "E", "F", "G", "H"];
  const ranks = ["8", "7", "6", "5", "4", "3", "2", "1"];

  return (
    <div
      className={clsx(
        "w-full max-w-[min(94vw,600px)] mx-auto bg-[#1e1b18] p-1.5 sm:p-2 rounded-lg sm:rounded-xl shadow-2xl ring-1 ring-white/8 touch-manipulation",
        isShaking && "board-shake",
        className,
      )}
      onAnimationEnd={() => setIsShaking(false)}
      {...props}
    >
      <div className="grid grid-cols-1 grid-rows-1 gap-1 sm:grid-cols-[20px_1fr] sm:grid-rows-[1fr_20px]">
        {/* Rank labels */}
        <div className="hidden sm:grid sm:grid-rows-8">
          {ranks.map((rank) => (
            <div
              key={rank}
              className="flex items-center justify-center text-[10px] text-neutral-500 font-semibold"
            >
              {rank}
            </div>
          ))}
        </div>

        {/* Board squares */}
        <div className="w-full aspect-square relative border border-[#8B6914]/60 rounded-sm overflow-hidden">
          {/* Subtle inner vignette for depth */}
          <div className="absolute inset-0 z-10 pointer-events-none rounded-sm shadow-[inset_0_0_24px_rgba(0,0,0,0.45)]" />

          {/* Static square grid (backgrounds & overlays) */}
          <div className="absolute inset-0 grid grid-cols-8 grid-rows-8 z-0">
            {Array.from({ length: 64 }).map((_, index) => renderSquare(index))}
          </div>

          {/* Animated piece layer (only when externalPieces provided) */}
          {externalPieces && (
            <div className="absolute inset-0 pointer-events-none z-20">
              {/* Capture ghosts */}
              {capturedGhosts.map((ghost) => {
                const row = Math.floor(ghost.index / 8);
                const col = ghost.index % 8;
                return (
                  <div
                    key={ghost.id}
                    className="absolute flex items-center justify-center piece-capture-ghost"
                    style={{
                      left: `${col * 12.5}%`,
                      top: `${row * 12.5}%`,
                      width: "12.5%",
                      height: "12.5%",
                    }}
                  >
                    <Piece color={ghost.piece.color} isKing={ghost.piece.isKing} />
                  </div>
                );
              })}

              {/* Live pieces with arc-movement animation */}
              {Object.entries(externalPieces).map(([key, piece]) => {
                const index = Number(key);
                const row = Math.floor(index / 8);
                const col = index % 8;
                const isLanding = landingIndex === index;
                const isSelected = selectedSquare === index;
                return (
                  <div
                    key={key}
                    className="absolute flex items-center justify-center piece-move"
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
                      isSelected={isSelected}
                      isMoving={isLanding}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* File labels */}
        <div className="hidden sm:block" />
        <div className="hidden sm:grid sm:grid-cols-8">
          {files.map((file) => (
            <div
              key={file}
              className="flex items-center justify-center text-[10px] text-neutral-500 font-semibold"
            >
              {file}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
