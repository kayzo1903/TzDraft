"use client";

import { useState, useEffect, useCallback } from "react";
import { historyService } from "@/services/history.service";
import { CakeEngine } from "@tzdraft/cake-engine";
import { PlayerColor } from "@tzdraft/cake-engine";

export interface ReplayMove {
  id: string;
  moveNumber: number;
  player: "WHITE" | "BLACK";
  fromSquare: number;
  toSquare: number;
  capturedSquares: number[];
  isPromotion: boolean;
  notation: string;
  createdAt: string;
}

export interface ReplayState {
  boardState: ReturnType<typeof CakeEngine.createInitialState>;
  currentPlayer: "WHITE" | "BLACK";
  stepIndex: number; // -1 = initial position
}

export function useGameReplay(gameId: string) {
  const [moves, setMoves] = useState<ReplayMove[]>([]);
  const [gameInfo, setGameInfo] = useState<any>(null);
  const [players, setPlayers] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Board states at each step (index 0 = after move 0, etc.)
  const [boardStates, setBoardStates] = useState<
    ReturnType<typeof CakeEngine.createInitialState>[]
  >([]);

  const [stepIndex, setStepIndex] = useState(-1); // -1 = initial position

  useEffect(() => {
    setLoading(true);
    historyService
      .getReplay(gameId)
      .then(({ game, moves: rawMoves, players: rawPlayers }) => {
        setGameInfo(game);
        setPlayers(rawPlayers);

        const sortedMoves: ReplayMove[] = [...rawMoves].sort(
          (a: ReplayMove, b: ReplayMove) => a.moveNumber - b.moveNumber,
        );
        setMoves(sortedMoves);

        // Pre-compute board state after each move
        const states: ReturnType<typeof CakeEngine.createInitialState>[] = [];
        let board = CakeEngine.createInitialState();

        for (const m of sortedMoves) {
          const from = CakeEngine.createPosition(m.fromSquare);
          const to = CakeEngine.createPosition(m.toSquare);
          const captured = m.capturedSquares.map((sq: number) =>
            CakeEngine.createPosition(sq),
          );
          const move = CakeEngine.createMove(
            m.id,
            gameId,
            m.moveNumber,
            m.player as PlayerColor,
            from,
            to,
            captured,
            m.isPromotion,
          );
          board = CakeEngine.applyMove(board, move);
          states.push(board);
        }

        setBoardStates(states);
        setStepIndex(-1);
      })
      .catch(() => setError("Failed to load game replay"))
      .finally(() => setLoading(false));
  }, [gameId]);

  const currentBoard =
    stepIndex === -1
      ? CakeEngine.createInitialState()
      : boardStates[stepIndex] ?? CakeEngine.createInitialState();

  const currentPlayer: "WHITE" | "BLACK" =
    stepIndex === -1
      ? "WHITE"
      : stepIndex % 2 === 0
      ? "BLACK"
      : "WHITE";

  const goTo = useCallback(
    (index: number) => {
      const clamped = Math.max(-1, Math.min(index, moves.length - 1));
      setStepIndex(clamped);
    },
    [moves.length],
  );

  const next = useCallback(() => goTo(stepIndex + 1), [goTo, stepIndex]);
  const prev = useCallback(() => goTo(stepIndex - 1), [goTo, stepIndex]);
  const goToStart = useCallback(() => goTo(-1), [goTo]);
  const goToEnd = useCallback(() => goTo(moves.length - 1), [goTo, moves.length]);

  return {
    moves,
    gameInfo,
    players,
    loading,
    error,
    currentBoard,
    currentPlayer,
    stepIndex,
    totalMoves: moves.length,
    goTo,
    next,
    prev,
    goToStart,
    goToEnd,
  };
}
