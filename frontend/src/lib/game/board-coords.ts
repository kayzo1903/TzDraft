"use client";

import { Position } from "@tzdraft/cake-engine";

export type PlayerSide = "WHITE" | "BLACK";

// Backend uses CAKE-style 1–32 numbering (top-left). To render like chess.com
// (White pieces on ranks 1–3, Black on 6–8), mirror positions in the UI.
export const serverPosToUiPos = (serverPos: number): number => 33 - serverPos;
export const uiPosToServerPos = (uiPos: number): number => 33 - uiPos;

export const isDarkSquare = (boardIndex: number): boolean => {
  const row = Math.floor(boardIndex / 8);
  const col = boardIndex % 8;
  return (row + col) % 2 !== 0;
};

export const displayIndexToBoardIndex = (
  displayIndex: number,
  flipped: boolean,
): number => (flipped ? 63 - displayIndex : displayIndex);

export const boardIndexToDisplayIndex = (
  boardIndex: number,
  flipped: boolean,
): number => (flipped ? 63 - boardIndex : boardIndex);

export const positionToBoardIndex = (pos: number): number => {
  const { row, col } = new Position(pos).toRowCol();
  return row * 8 + col;
};

export const boardIndexToPosition = (boardIndex: number): number | null => {
  const row = Math.floor(boardIndex / 8);
  const col = boardIndex % 8;
  try {
    return Position.fromRowCol(row, col).value;
  } catch {
    return null;
  }
};
