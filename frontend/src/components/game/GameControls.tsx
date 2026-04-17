"use client";

import React, { useEffect, useRef } from "react";
import { 
  ChevronLeft, 
  ChevronRight, 
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Move } from "@tzdraft/mkaguzi-engine";
import clsx from "clsx";

interface GameControlsProps {
  moves: Move[];
  viewingMoveIndex: number;
  canGoBack: boolean;
  canGoForward: boolean;
  onBack: () => void;
  onForward: () => void;
  onMoveClick: (index: number) => void;
  className?: string;
}

export const GameControls: React.FC<GameControlsProps> = ({
  moves,
  viewingMoveIndex,
  canGoBack,
  canGoForward,
  onBack,
  onForward,
  onMoveClick,
  className,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-centering active move
  useEffect(() => {
    if (scrollRef.current) {
      const activeElement = scrollRef.current.querySelector(".active-move-pill");
      if (activeElement) {
        activeElement.scrollIntoView({ 
          behavior: "smooth", 
          block: "nearest", 
          inline: "center" 
        });
      }
    }
  }, [viewingMoveIndex]);

  return (
    <div className={clsx(
      "w-full flex items-center bg-neutral-900/40 backdrop-blur rounded-xl border border-neutral-800 h-14 overflow-hidden px-1",
      className
    )}>
      {/* Back Arrow */}
      <button
        onClick={onBack}
        disabled={!canGoBack}
        className="h-full px-3 flex items-center justify-center text-neutral-400 hover:text-white disabled:opacity-20 transition-all active:scale-90"
      >
        <ChevronLeft className="w-6 h-6 stroke-[3]" />
      </button>

      {/* Move Strip */}
      <div 
        ref={scrollRef}
        className="flex-1 flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 scroll-smooth"
      >
        {/* Starting state */}
        <button
          onClick={() => onMoveClick(0)}
          className={clsx(
            "shrink-0 px-3 py-1.5 text-[11px] font-bold tracking-tight uppercase rounded-md transition-all",
            viewingMoveIndex === 0
              ? "bg-white text-black active-move-pill shadow-lg shadow-white/10 scale-105"
              : "text-neutral-500 hover:text-neutral-300"
          )}
        >
          Start
        </button>

        {moves.map((move, idx) => {
          const moveIndex = idx + 1;
          const isActive = viewingMoveIndex === moveIndex;
          const isWhite = idx % 2 === 0;
          const moveNumber = Math.floor(idx / 2) + 1;

          return (
            <React.Fragment key={idx}>
              {/* Optional: Separator or move number for odd indices */}
              {isWhite && (
                <span className="shrink-0 text-[10px] font-mono text-neutral-600 ml-1">
                  {moveNumber}.
                </span>
              )}

              <button
                onClick={() => onMoveClick(moveIndex)}
                className={clsx(
                  "shrink-0 px-3 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap",
                  isActive
                    ? "bg-white text-black active-move-pill shadow-lg shadow-white/10 scale-105"
                    : "text-neutral-300 hover:bg-neutral-800 hover:text-white"
                )}
              >
                {move.notation}
              </button>
            </React.Fragment>
          );
        })}

        {moves.length === 0 && (
          <span className="flex-1 text-center text-xs text-neutral-600 italic">
            Waiting for first move...
          </span>
        )}
      </div>

      {/* Forward Arrow */}
      <button
        onClick={onForward}
        disabled={!canGoForward}
        className="h-full px-3 flex items-center justify-center text-neutral-400 hover:text-white disabled:opacity-20 transition-all active:scale-90"
      >
        <ChevronRight className="w-6 h-6 stroke-[3]" />
      </button>
    </div>
  );
};
