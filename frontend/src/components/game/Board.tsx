"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
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
  flipped?: boolean;
  hintSquares?: { from: number; to: number } | null;
}

/* ─── Drag state ─────────────────────────────────────────────────────────── */

interface DragState {
  fromIndex: number;
  startX: number;
  startY: number;
  offsetX: number; // pointer offset from the piece's top-left (board-relative px)
  offsetY: number;
  x: number;       // current pointer position (board-relative px)
  y: number;
}

/** Minimum pointer movement (px) before we treat the gesture as a drag */
const DRAG_THRESHOLD = 6;

/* ─── Landing animation ──────────────────────────────────────────────────── */

function usePieceLanding() {
  const [landingIndex, setLandingIndex] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerLanding = useCallback((index: number) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setLandingIndex(index);
    timerRef.current = setTimeout(() => {
      setLandingIndex(null);
      timerRef.current = null;
    }, 200);
  }, []);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  return { landingIndex, triggerLanding };
}

/* ─── Board component ────────────────────────────────────────────────────── */

export const Board: React.FC<BoardProps> = ({
  pieces: externalPieces,
  onMove,
  readOnly = false,
  legalMoves,
  forcedPieces = [],
  onInvalidSelect,
  lastMove = null,
  capturedGhosts = [],
  flipped = false,
  hintSquares = null,
  className,
  ...props
}) => {
  const boardRef = useRef<HTMLDivElement>(null);
  const [selectedSquare, setSelectedSquare] = useState<number | null>(null);
  const [isShaking, setIsShaking] = useState(false);
  const { landingIndex, triggerLanding } = usePieceLanding();

  const [drag, setDrag] = useState<DragState | null>(null);
  /** Set to true once pointer movement crosses DRAG_THRESHOLD */
  const hasDraggedRef = useRef(false);
  /** Suppresses the click event that always fires after a completed drag */
  const suppressNextClickRef = useRef(false);

  /* ── Pure helpers (no state deps) ──────────────────────────────────── */

  const isDarkSquare = (idx: number) => {
    const r = Math.floor(idx / 8), c = idx % 8;
    return (r + c) % 2 !== 0;
  };

  const getPiece = (idx: number): PieceState | null => {
    if (externalPieces) return externalPieces[idx] ?? null;
    if (!isDarkSquare(idx)) return null;
    const r = Math.floor(idx / 8);
    if (r < 3) return { color: "BLACK" };
    if (r > 4) return { color: "WHITE" };
    return null;
  };

  /** Board-relative pixel → square index (0-63), or null if outside */
  const pixelToIndex = (bx: number, by: number): number | null => {
    const board = boardRef.current;
    if (!board) return null;
    const rect = board.getBoundingClientRect();
    const col = Math.floor((bx / rect.width) * 8);
    const row = Math.floor((by / rect.height) * 8);
    if (col < 0 || col > 7 || row < 0 || row > 7) return null;
    return row * 8 + col;
  };

  const boardXY = (clientX: number, clientY: number) => {
    const rect = boardRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return { bx: clientX - rect.left, by: clientY - rect.top };
  };

  /* ── Click-to-move (all clicks go through here) ─────────────────────── */

  const handleSquareClick = useCallback(
    (index: number) => {
      if (readOnly || !isDarkSquare(index)) return;

      // Deselect
      if (selectedSquare === index) {
        setSelectedSquare(null);
        return;
      }

      // Complete a move
      if (selectedSquare !== null) {
        const targets = legalMoves?.[selectedSquare];

        if (targets?.includes(index)) {
          onMove?.(selectedSquare, index);
          triggerLanding(index);
          setSelectedSquare(null);
          return;
        }

        // Re-select another own piece
        const piece = getPiece(index);
        const canSelect =
          piece &&
          legalMoves?.[index] &&
          (forcedPieces.length === 0 || forcedPieces.includes(index));

        if (canSelect) {
          setSelectedSquare(index);
          return;
        }

        onInvalidSelect?.();
        setIsShaking(true);
        return;
      }

      // First select
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
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [readOnly, selectedSquare, legalMoves, forcedPieces, onMove, onInvalidSelect, triggerLanding],
  );

  /* ── Board-level pointer events (drag handling) ─────────────────────── */

  const handleBoardPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (readOnly || !externalPieces) return;

      const pos = boardXY(e.clientX, e.clientY);
      if (!pos) return;
      const index = pixelToIndex(pos.bx, pos.by);
      if (index === null) return;

      const piece = externalPieces[index];
      if (!piece) return; // only initiate drag on squares that have a piece

      // Piece must be selectable to start drag
      if (forcedPieces.length > 0 && !forcedPieces.includes(index)) return;
      if (legalMoves && forcedPieces.length === 0 && !legalMoves[index]) return;

      e.preventDefault();
      (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);

      const rect = boardRef.current!.getBoundingClientRect();
      const sqSize = rect.width / 8;
      const pCol = index % 8, pRow = Math.floor(index / 8);

      hasDraggedRef.current = false;
      setDrag({
        fromIndex: index,
        startX: pos.bx,
        startY: pos.by,
        offsetX: pos.bx - pCol * sqSize,
        offsetY: pos.by - pRow * sqSize,
        x: pos.bx,
        y: pos.by,
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [readOnly, externalPieces, forcedPieces, legalMoves],
  );

  const handleBoardPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!drag) return;
      const pos = boardXY(e.clientX, e.clientY);
      if (!pos) return;

      if (!hasDraggedRef.current) {
        const dx = pos.bx - drag.startX;
        const dy = pos.by - drag.startY;
        if (Math.hypot(dx, dy) > DRAG_THRESHOLD) {
          hasDraggedRef.current = true;
          setSelectedSquare(drag.fromIndex); // show selection while dragging
        }
      }

      if (hasDraggedRef.current) {
        setDrag((prev) => prev ? { ...prev, x: pos.bx, y: pos.by } : null);
      }
    },
    [drag],
  );

  const handleBoardPointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!drag) return;

      if (!hasDraggedRef.current) {
        // No real movement → treat as a click; let onClick handle it
        setDrag(null);
        return;
      }

      // Real drag: compute drop target
      suppressNextClickRef.current = true;
      const pos = boardXY(e.clientX, e.clientY);
      const toIndex = pos ? pixelToIndex(pos.bx, pos.by) : null;

      const from = drag.fromIndex;
      setDrag(null);
      setSelectedSquare(null);
      hasDraggedRef.current = false;

      if (
        toIndex !== null &&
        toIndex !== from &&
        isDarkSquare(toIndex) &&
        legalMoves?.[from]?.includes(toIndex)
      ) {
        onMove?.(from, toIndex);
        triggerLanding(toIndex);
      } else if (toIndex !== null && toIndex !== from) {
        onInvalidSelect?.();
        setIsShaking(true);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [drag, legalMoves, onMove, onInvalidSelect, triggerLanding],
  );

  /** Single click handler for the entire board surface */
  const handleBoardClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (suppressNextClickRef.current) {
        suppressNextClickRef.current = false;
        return;
      }
      const rect = boardRef.current?.getBoundingClientRect();
      if (!rect) return;
      const bx = e.clientX - rect.left;
      const by = e.clientY - rect.top;
      const index = pixelToIndex(bx, by);
      if (index !== null) handleSquareClick(index);
    },
    [handleSquareClick],
  );

  /* ── Board labels ───────────────────────────────────────────────────── */

  const ranks = flipped
    ? ["8", "7", "6", "5", "4", "3", "2", "1"]
    : ["1", "2", "3", "4", "5", "6", "7", "8"];
  const files = flipped
    ? ["A", "B", "C", "D", "E", "F", "G", "H"]
    : ["H", "G", "F", "E", "D", "C", "B", "A"];

  /* ── Square tiles (background + overlays only, no clicks) ───────────── */

  const isDraggingActive = drag !== null && hasDraggedRef.current;

  const renderSquare = (index: number) => {
    const isDark = isDarkSquare(index);
    const piece = getPiece(index);
    const isSelected = selectedSquare === index;
    const isForcedPiece = forcedPieces.includes(index);
    const isHintFrom = hintSquares !== null && hintSquares.from === index;
    const isHintTo = hintSquares !== null && hintSquares.to === index;
    const isLegalTarget =
      selectedSquare !== null &&
      isDark &&
      (legalMoves?.[selectedSquare]?.includes(index) ?? false);
    const isLastMoveSquare = Boolean(
      lastMove && (lastMove.from === index || lastMove.to === index),
    );
    const isLastMoveToSquare = Boolean(lastMove && lastMove.to === index);

    const row = Math.floor(index / 8);
    const col = index % 8;
    const labelColor = isDark ? "var(--board-light)" : "var(--board-dark)";

    return (
      <div
        key={index}
        className={clsx(
          "w-full h-full aspect-square relative select-none",
          isDark ? "bg-[var(--board-dark)]" : "bg-[var(--board-light)]",
        )}
      >
        {/* Rank/file labels */}
        {col === 0 && (
          <span
            className="absolute top-[2px] left-[2px] text-[9px] font-bold leading-none pointer-events-none z-[5] select-none"
            style={{ color: labelColor }}
          >
            {ranks[row]}
          </span>
        )}
        {row === 7 && (
          <span
            className="absolute bottom-[2px] right-[2px] text-[9px] font-bold leading-none pointer-events-none z-[5] select-none"
            style={{ color: labelColor }}
          >
            {files[col]}
          </span>
        )}

        {/* Selected highlight */}
        {isSelected && isDark && (
          <div className="absolute inset-0 bg-yellow-400/40 pointer-events-none" />
        )}

        {/* Legal move dot (empty square) */}
        {isLegalTarget && !piece && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-[30%] h-[30%] rounded-full bg-neutral-900/40" />
          </div>
        )}

        {/* Legal capture ring (occupied square) */}
        {isLegalTarget && piece && (
          <div className="absolute inset-[3%] rounded-full ring-[3px] ring-emerald-400/70 pointer-events-none" />
        )}

        {/* Last-move tint */}
        {isLastMoveSquare && isDark && (
          <div
            className={clsx(
              "absolute inset-0 pointer-events-none",
              isLastMoveToSquare ? "bg-amber-400/20" : "bg-amber-300/12",
            )}
          />
        )}

        {/* Hint from-square glow */}
        {isHintFrom && isDark && (
          <div className="absolute inset-0 bg-cyan-400/30 pointer-events-none animate-pulse" />
        )}

        {/* Hint to-square arrow/glow */}
        {isHintTo && isDark && (
          <div className="absolute inset-0 bg-cyan-400/50 pointer-events-none animate-pulse" />
        )}

        {/* Forced-piece pulse */}
        {piece && isForcedPiece && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-[84%] h-[84%] rounded-full ring-2 ring-orange-400/80 shadow-[0_0_14px_rgba(251,146,60,0.7)] animate-pulse" />
          </div>
        )}

        {/* Static piece for demo mode (no externalPieces) */}
        {piece && !externalPieces && (
          <Piece color={piece.color} isKing={piece.isKing} isSelected={isSelected} />
        )}
      </div>
    );
  };

  /* ── Render ──────────────────────────────────────────────────────────── */

  const sqPct = 12.5;

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
      {/* ── Interactive board surface ──────────────────────────────────── */}
      <div
        ref={boardRef}
        className={clsx(
          "w-full aspect-square relative border border-[#8B6914]/60 rounded-sm overflow-hidden",
          !readOnly && (isDraggingActive ? "cursor-grabbing" : "cursor-pointer"),
        )}
        onPointerDown={handleBoardPointerDown}
        onPointerMove={handleBoardPointerMove}
        onPointerUp={handleBoardPointerUp}
        onPointerCancel={() => { setDrag(null); hasDraggedRef.current = false; }}
        onClick={handleBoardClick}
      >
        {/* Vignette */}
        <div className="absolute inset-0 z-10 pointer-events-none rounded-sm shadow-[inset_0_0_24px_rgba(0,0,0,0.45)]" />

        {/* Square grid */}
        <div className="absolute inset-0 grid grid-cols-8 grid-rows-8 z-0 pointer-events-none">
          {Array.from({ length: 64 }).map((_, i) => renderSquare(i))}
        </div>

        {/* ── Animated piece layer ─────────────────────────────────────── */}
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
                    left: `${col * sqPct}%`,
                    top: `${row * sqPct}%`,
                    width: `${sqPct}%`,
                    height: `${sqPct}%`,
                  }}
                >
                  <Piece color={ghost.piece.color} isKing={ghost.piece.isKing} />
                </div>
              );
            })}

            {/* Live pieces — slide smoothly via CSS transition */}
            {Object.entries(externalPieces).map(([key, piece]) => {
              const index = Number(key);
              const row = Math.floor(index / 8);
              const col = index % 8;
              const isLanding = landingIndex === index;
              const isSelected = selectedSquare === index;
              const isDraggingThis = isDraggingActive && drag?.fromIndex === index;

              return (
                <div
                  key={key}
                  className={clsx(
                    "absolute flex items-center justify-center piece-move",
                    isDraggingThis && "is-dragging",
                  )}
                  style={{
                    left: `${col * sqPct}%`,
                    top: `${row * sqPct}%`,
                    width: `${sqPct}%`,
                    height: `${sqPct}%`,
                    // Hide grid-slot piece while dragging ghost is shown
                    opacity: isDraggingThis ? 0 : 1,
                  }}
                >
                  <Piece
                    color={piece.color}
                    isKing={piece.isKing}
                    isSelected={isSelected && !isDraggingThis}
                    isLanding={isLanding && !isDraggingThis}
                  />
                </div>
              );
            })}

            {/* Floating drag ghost — follows cursor exactly */}
            {isDraggingActive && drag && externalPieces[drag.fromIndex] && (() => {
              const rect = boardRef.current?.getBoundingClientRect();
              const sqW = rect ? rect.width / 8 : 0;
              const sqH = rect ? rect.height / 8 : 0;
              const p = externalPieces[drag.fromIndex];
              return (
                <div
                  className="absolute pointer-events-none"
                  style={{
                    left: drag.x - drag.offsetX,
                    top: drag.y - drag.offsetY,
                    width: sqW,
                    height: sqH,
                    zIndex: 60,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transform: "scale(1.18)",
                    transformOrigin: "center",
                    filter: "drop-shadow(0 10px 20px rgba(0,0,0,0.65))",
                    transition: "none",
                  }}
                >
                  <Piece color={p.color} isKing={p.isKing} isSelected />
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
};
