"use client";

import React, { useState } from "react";
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

  const isDarkSquare = (index: number) => {
    const row = Math.floor(index / 8);
    const col = index % 8;
    return (row + col) % 2 !== 0;
  };

  const getPiece = (index: number): PieceState | null => {
    if (externalPieces) {
      return externalPieces[index] || null;
    }

    if (!isDarkSquare(index)) return null;
    const row = Math.floor(index / 8);
    if (row < 3) return { color: "BLACK" };
    if (row > 4) return { color: "WHITE" };
    return null;
  };

  const handleSquareClick = (index: number) => {
    if (readOnly || !isDarkSquare(index)) return;

    if (selectedSquare === index) {
      setSelectedSquare(null);
      return;
    }

    if (selectedSquare !== null) {
      const legalTargets = legalMoves?.[selectedSquare];
      if (legalTargets && !legalTargets.includes(index)) {
        onInvalidSelect?.();
        setIsShaking(true);
        return;
      }

      onMove?.(selectedSquare, index);
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
      selectedSquare !== null && isDark && (legalMoves?.[selectedSquare]?.includes(index) ?? false);
    const isLastMoveSquare = Boolean(lastMove && (lastMove.from === index || lastMove.to === index));
    const isLastMoveToSquare = Boolean(lastMove && lastMove.to === index);

    return (
      <div
        key={index}
        onClick={() => handleSquareClick(index)}
        className={clsx(
          "w-full h-full aspect-square flex items-center justify-center relative select-none touch-manipulation",
          isDark ? "bg-[var(--board-dark)] text-white" : "bg-[var(--board-light)]",
        )}
      >
        {isSelected && isDark && (
          <div className="absolute inset-0 bg-yellow-400/45 pointer-events-none" />
        )}

        {isLegalTarget && (
          <div className="absolute inset-0 bg-emerald-400/35 ring-2 ring-emerald-300 pointer-events-none" />
        )}

        {isLastMoveSquare && isDark && (
          <div
            className={clsx(
              "absolute inset-0 pointer-events-none",
              isLastMoveToSquare
                ? "bg-emerald-300/25 ring-2 ring-emerald-200/70"
                : "bg-orange-300/20 ring-1 ring-orange-200/60",
            )}
          />
        )}

        {piece && isForcedPiece && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-[80%] h-[80%] rounded-full ring-2 ring-orange-300/80 shadow-[0_0_12px_rgba(251,146,60,0.65)] animate-pulse" />
          </div>
        )}

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

  const files = ["A", "B", "C", "D", "E", "F", "G", "H"];
  const ranks = ["8", "7", "6", "5", "4", "3", "2", "1"];

  return (
    <div
      className={clsx(
        "w-full max-w-[min(94vw,600px)] mx-auto bg-[#2B2B2B] p-1.5 sm:p-2 rounded-lg sm:rounded-xl shadow-xl ring-1 ring-white/10 touch-manipulation",
        isShaking && "board-shake",
        className,
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
            {Array.from({ length: 64 }).map((_, index) => renderSquare(index))}
          </div>

          {externalPieces && (
            <div className="absolute inset-0 pointer-events-none">
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
                    <Piece
                      color={ghost.piece.color}
                      isKing={ghost.piece.isKing}
                    />
                  </div>
                );
              })}

              {Object.entries(externalPieces).map(([key, piece]) => {
                const index = Number(key);
                const row = Math.floor(index / 8);
                const col = index % 8;
                return (
                  <div
                    key={key}
                    className="absolute flex items-center justify-center transition-all duration-200 [transition-timing-function:cubic-bezier(0.22,1,0.36,1)] will-change-transform"
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
