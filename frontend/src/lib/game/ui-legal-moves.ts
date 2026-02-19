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

const toEngineBoard = (piecesByPosition: Record<number, BackendPiece>) => {
  const enginePieces: Piece[] = [];
  for (const [key, piece] of Object.entries(piecesByPosition)) {
    const pos = Number(key);
    if (!Number.isFinite(pos)) continue;
    const engineColor =
      piece.color === "BLACK" ? PlayerColor.BLACK : PlayerColor.WHITE;
    const engineType =
      piece.type === "KING" || piece.isKing ? PieceType.KING : PieceType.MAN;
    enginePieces.push(new Piece(engineType, engineColor, new Position(pos)));
  }
  return new BoardState(enginePieces);
};

const toBackendPieces = (
  board: BoardState,
): Record<number, BackendPiece> => {
  const result: Record<number, BackendPiece> = {};
  for (const piece of board.getAllPieces()) {
    result[piece.position.value] = {
      color: piece.color === PlayerColor.BLACK ? "BLACK" : "WHITE",
      type: piece.type === PieceType.KING ? "KING" : "MAN",
      isKing: piece.type === PieceType.KING,
    };
  }
  return result;
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
    const board = toEngineBoard(piecesByPosition);
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

export const applyOptimisticUiMove = (params: {
  piecesByPosition: Record<number, BackendPiece>;
  viewerColor: PlayerSide;
  fromDisplay: number;
  toDisplay: number;
  flipped?: boolean;
  moveCount?: number;
}): Record<number, BackendPiece> | null => {
  const {
    piecesByPosition,
    viewerColor,
    fromDisplay,
    toDisplay,
    flipped = false,
    moveCount = 0,
  } = params;

  try {
    const board = toEngineBoard(piecesByPosition);
    const player =
      viewerColor === "BLACK" ? PlayerColor.BLACK : PlayerColor.WHITE;
    const moves = CakeEngine.generateLegalMoves(board, player, moveCount);

    const toDisplayIndex = (pos: number) =>
      boardIndexToDisplayIndex(
        positionToBoardIndex(serverPosToUiPos(pos)),
        flipped,
      );

    const selectedMove = moves.find(
      (move) =>
        toDisplayIndex(move.from.value) === fromDisplay &&
        toDisplayIndex(move.to.value) === toDisplay,
    );

    if (!selectedMove) {
      return null;
    }

    const nextBoard = CakeEngine.applyMove(board, selectedMove);
    return toBackendPieces(nextBoard);
  } catch (error) {
    console.warn("Failed to apply optimistic move:", error);
    return null;
  }
};
