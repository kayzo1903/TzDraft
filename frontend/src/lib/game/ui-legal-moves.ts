"use client";

import {
  BoardState,
  CakeEngine,
  Piece,
  PieceType,
  PlayerColor,
  Position,
} from "@tzdraft/cake-engine";
import {
  boardIndexToDisplayIndex,
  positionToBoardIndex,
  serverPosToUiPos,
  type PlayerSide,
} from "./board-coords";

export type BackendPiece = {
  type?: "MAN" | "KING";
  color: "WHITE" | "BLACK";
  isKing?: boolean;
};

export type UiLegalMovesResult = {
  legalMoves: Record<number, number[]> | undefined;
  forcedPieces: number[];
};

export const computeUiLegalMoves = (params: {
  piecesByPosition: Record<number, BackendPiece>;
  viewerColor: PlayerSide;
  canInteract: boolean;
  moveCount?: number;
  flipped?: boolean;
}): UiLegalMovesResult => {
  const {
    piecesByPosition,
    viewerColor,
    canInteract,
    moveCount = 0,
    flipped = false,
  } = params;
  if (!canInteract) return { legalMoves: undefined, forcedPieces: [] };

  try {
    const enginePieces: Piece[] = [];
    for (const [key, piece] of Object.entries(piecesByPosition)) {
      const pos = Number(key);
      if (!Number.isFinite(pos)) continue;
      const engineColor =
        piece.color === "BLACK" ? PlayerColor.BLACK : PlayerColor.WHITE;
      const engineType =
        piece.type === "KING" || piece.isKing ? PieceType.KING : PieceType.MAN;
      enginePieces.push(
        new Piece(engineType, engineColor, new Position(pos)),
      );
    }

    const board = new BoardState(enginePieces);
    const player =
      viewerColor === "BLACK" ? PlayerColor.BLACK : PlayerColor.WHITE;
    const moves = CakeEngine.generateLegalMoves(board, player, moveCount);

    const toDisplayIndex = (pos: number) =>
      boardIndexToDisplayIndex(
        positionToBoardIndex(serverPosToUiPos(pos)),
        flipped,
      );

    const hasCaptures = moves.some((m) => m.capturedSquares.length > 0);
    const filtered = hasCaptures
      ? moves.filter((m) => m.capturedSquares.length > 0)
      : moves;

    const legalMoves: Record<number, number[]> = {};
    const forced = new Set<number>();

    for (const move of filtered) {
      const fromDisplay = toDisplayIndex(move.from.value);
      const toDisplay = toDisplayIndex(move.to.value);
      if (!legalMoves[fromDisplay]) legalMoves[fromDisplay] = [];
      legalMoves[fromDisplay].push(toDisplay);
      if (hasCaptures) forced.add(fromDisplay);
    }

    for (const [from, targets] of Object.entries(legalMoves)) {
      legalMoves[Number(from)] = Array.from(new Set(targets));
    }

    return { legalMoves, forcedPieces: Array.from(forced) };
  } catch (error) {
    console.warn("Failed to compute legal moves:", error);
    return { legalMoves: undefined, forcedPieces: [] };
  }
};
