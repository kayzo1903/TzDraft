"use client";

import React from "react";
import { Board, type BoardState } from "@/components/game/Board";

interface PieceSnapshot {
  type: "MAN" | "KING";
  color: "WHITE" | "BLACK";
  position: number;
}

interface PuzzleThumbnailProps {
  pieces: PieceSnapshot[];
  sideToMove: "WHITE" | "BLACK";
}

function pdnToGrid(sq: number, flip = false): number {
  const idx = sq - 1;
  const row = Math.floor(idx / 4);
  const posInRow = idx % 4;
  const col = row % 2 === 0 ? posInRow * 2 + 1 : posInRow * 2;
  if (!flip) return row * 8 + col;
  return (7 - row) * 8 + (7 - col);
}

function toBoard(pieces: PieceSnapshot[], flip: boolean): BoardState {
  return Object.fromEntries(
    pieces.map((p) => [
      pdnToGrid(p.position, flip),
      { color: p.color, isKing: p.type === "KING" },
    ])
  );
}

export function PuzzleThumbnail({ sideToMove }: { pieces?: any[], sideToMove: "WHITE" | "BLACK" }) {
  const flip = sideToMove === "WHITE";
  
  // Hardcoded 6 vs 6 piece setup for aesthetic thumbnail
  const demoPieces: PieceSnapshot[] = [
    // Black pieces (top)
    { type: "MAN", color: "BLACK", position: 1 },
    { type: "MAN", color: "BLACK", position: 2 },
    { type: "MAN", color: "BLACK", position: 3 },
    { type: "MAN", color: "BLACK", position: 5 },
    { type: "MAN", color: "BLACK", position: 6 },
    { type: "MAN", color: "BLACK", position: 7 },
    // White pieces (bottom)
    { type: "MAN", color: "WHITE", position: 26 },
    { type: "MAN", color: "WHITE", position: 27 },
    { type: "MAN", color: "WHITE", position: 28 },
    { type: "MAN", color: "WHITE", position: 30 },
    { type: "MAN", color: "WHITE", position: 31 },
    { type: "MAN", color: "WHITE", position: 32 },
  ];

  const boardData = toBoard(demoPieces, flip);

  return (
    <div className="w-full aspect-square pointer-events-none scale-[0.8] origin-center opacity-80">
      <Board 
        pieces={boardData} 
        readOnly={true} 
        flipped={flip} 
        className="shadow-none ring-0 p-0"
      />
    </div>
  );
}
