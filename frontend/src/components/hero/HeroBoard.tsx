"use client";
import React, { useEffect, useRef, useState } from "react";
import { Board, BoardState } from "@/components/game/Board";

// --- Types ---
type Move = {
  from: number;
  to: number;
  capture?: number;
};

// --- Predefined 5-move script ---
const MOVES: Move[] = [
  { from: 42, to: 35 },
  { from: 17, to: 26 },
  { from: 35, to: 17, capture: 26 },
  { from: 10, to: 19 },
  { from: 49, to: 42 },
];

// --- Timing constants for smooth animation ---
const TIMING = {
  MOVE_DURATION: 600,      // Piece movement animation
  MOVE_DELAY: 1200,        // Pause between moves
  CAPTURE_FADE: 300,       // Captured piece fade-out
  RESET_PAUSE: 2500,       // Pause before loop restart
  INITIAL_DELAY: 800,      // Delay before first move
} as const;

// --- Helpers ---
const createInitialBoard = (): BoardState => {
  const pieces: BoardState = {};
  for (let i = 0; i < 64; i++) {
    const row = Math.floor(i / 8);
    const col = i % 8;
    if ((row + col) % 2 !== 0) {
      if (row < 3) pieces[i] = { color: "BLACK" };
      if (row > 4) pieces[i] = { color: "WHITE" };
    }
  }
  return pieces;
};

export const HeroBoard: React.FC = () => {
  const [pieces, setPieces] = useState<BoardState>({});
  const [isAnimating, setIsAnimating] = useState(false);
  const initialRef = useRef<BoardState>({});
  const moveIndexRef = useRef(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Cleanup helper
  const clearTimers = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  };

  // Execute a single move with smooth state transition
  const executeMove = (move: Move) => {
    setIsAnimating(true);
    
    setPieces(prev => {
      const next = { ...prev };
      const piece = next[move.from];
      
      if (!piece) return next;

      // Remove piece from origin
      delete next[move.from];

      // Handle capture with slight delay for visual effect
      if (move.capture !== undefined) {
        // Captured piece will be removed
        setTimeout(() => {
          setPieces(current => {
            const updated = { ...current };
            delete updated[move.capture!];
            return updated;
          });
        }, TIMING.CAPTURE_FADE);
      }

      // Place piece at destination
      next[move.to] = piece;
      
      return next;
    });

    // Mark animation complete after move duration
    setTimeout(() => {
      setIsAnimating(false);
    }, TIMING.MOVE_DURATION);
  };

  // Main animation loop
  const playSequence = () => {
    const currentMoveIndex = moveIndexRef.current;

    // Check if sequence is complete
    if (currentMoveIndex >= MOVES.length) {
      setIsAnimating(true);
      
      // Reset to initial state
      timeoutRef.current = setTimeout(() => {
        setPieces(initialRef.current);
        moveIndexRef.current = 0;
        setIsAnimating(false);
        
        // Restart sequence
        timeoutRef.current = setTimeout(() => {
          animationFrameRef.current = requestAnimationFrame(playSequence);
        }, TIMING.INITIAL_DELAY);
      }, TIMING.RESET_PAUSE);
      
      return;
    }

    // Execute current move
    const move = MOVES[currentMoveIndex];
    executeMove(move);
    
    // Advance to next move
    moveIndexRef.current += 1;
    
    // Schedule next move
    const nextDelay = TIMING.MOVE_DURATION + TIMING.MOVE_DELAY;
    timeoutRef.current = setTimeout(() => {
      animationFrameRef.current = requestAnimationFrame(playSequence);
    }, nextDelay);
  };

  // Initialize and start animation loop
  useEffect(() => {
    // Set up initial board state
    initialRef.current = createInitialBoard();
    setPieces(initialRef.current);
    moveIndexRef.current = 0;

    // Start animation sequence after initial delay
    timeoutRef.current = setTimeout(() => {
      animationFrameRef.current = requestAnimationFrame(playSequence);
    }, TIMING.INITIAL_DELAY);

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