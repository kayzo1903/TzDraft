"use client";
import React, { useEffect, useRef, useState } from "react";
import { Board, BoardState as UiBoardState } from "@/components/game/Board";
import {
  BoardState as EngineBoardState,
  MkaguziEngine,
  PlayerColor,
} from "@tzdraft/mkaguzi-engine";
import { getBestMove } from "@/lib/ai/bot";

const FULL_MOVE_LIMIT = 5;
const AI_LEVEL = 2; // ~1000 ELO equivalent for this lightweight bot

// --- Timing constants for smooth animation ---
const TIMING = {
  MOVE_DURATION: 600,      // Piece movement animation
  MOVE_DELAY: 1200,        // Pause between moves
  CAPTURE_FADE: 300,       // Captured piece fade-out
  RESET_PAUSE: 2500,       // Pause before loop restart
  INITIAL_DELAY: 800,      // Delay before first move
} as const;

// --- Helpers ---
const createInitialBoard = (): EngineBoardState =>
  MkaguziEngine.createInitialState();

const toUiPieces = (board: EngineBoardState): UiBoardState => {
  const pieces: UiBoardState = {};
  for (const piece of board.getAllPieces()) {
    const { row, col } = piece.position.toRowCol();
    const index = row * 8 + col;
    pieces[index] = { color: piece.color, isKing: piece.isKing() };
  }
  return pieces;
};

export const HeroBoard: React.FC = () => {
  const [pieces, setPieces] = useState<UiBoardState>({});
  const [isAnimating, setIsAnimating] = useState(false);
  const boardRef = useRef<EngineBoardState>(createInitialBoard());
  const currentPlayerRef = useRef<PlayerColor>(PlayerColor.WHITE);
  const moveCountRef = useRef(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup helper
  const clearTimers = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const resetBoard = () => {
    boardRef.current = createInitialBoard();
    currentPlayerRef.current = PlayerColor.WHITE;
    moveCountRef.current = 0;
    setPieces(toUiPieces(boardRef.current));
  };

  // Main animation loop
  const playSequence = async () => {
    const currentPlayer = currentPlayerRef.current;
    const move = await getBestMove(boardRef.current, currentPlayer, AI_LEVEL);

    if (!move) {
      timeoutRef.current = setTimeout(() => {
        resetBoard();
        timeoutRef.current = setTimeout(playSequence, 0);
      }, TIMING.RESET_PAUSE);
      return;
    }

    setIsAnimating(true);
    const nextBoard = MkaguziEngine.applyMove(boardRef.current, move);
    boardRef.current = nextBoard;
    setPieces(toUiPieces(nextBoard));
    currentPlayerRef.current =
      currentPlayer === PlayerColor.WHITE
        ? PlayerColor.BLACK
        : PlayerColor.WHITE;
    moveCountRef.current += 1;

    setTimeout(() => {
      setIsAnimating(false);
    }, TIMING.MOVE_DURATION);

    if (moveCountRef.current >= FULL_MOVE_LIMIT * 2) {
      timeoutRef.current = setTimeout(() => {
        resetBoard();
        timeoutRef.current = setTimeout(playSequence, 0);
      }, TIMING.RESET_PAUSE);
      return;
    }

    const nextDelay = TIMING.MOVE_DURATION + TIMING.MOVE_DELAY;
    timeoutRef.current = setTimeout(playSequence, nextDelay);
  };

  // Initialize and start animation loop
  useEffect(() => {
    resetBoard();

    // Start animation sequence after initial delay
    timeoutRef.current = setTimeout(playSequence, TIMING.INITIAL_DELAY);

    // Cleanup on unmount
    return () => {
      clearTimers();
    };
  }, []);

  return (
    <div className="relative">
      <Board 
        pieces={pieces}
        className="transition-opacity duration-300"
        style={{
          opacity: isAnimating ? 0.95 : 1,
        }}
      />
      
      {/* Optional: Add subtle visual indicator during animations */}
      {isAnimating && (
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-br from-transparent via-transparent to-blue-500/5 rounded-lg" />
      )}
    </div>
  );
};
