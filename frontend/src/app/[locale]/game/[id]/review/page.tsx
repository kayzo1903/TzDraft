'use client';

import React, { useMemo } from 'react';
import { useParams } from 'next/navigation';
import { Link } from '@/i18n/routing';
import { Board, BoardState as UiBoardState } from '@/components/game/Board';
import { Button } from '@/components/ui/Button';
import { useGameReplay } from '@/hooks/useGameReplay';
import { useAuth } from '@/hooks/useAuth';
import { PlayerColor, Position } from '@tzdraft/cake-engine';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Loader2,
} from 'lucide-react';

/** Convert a checkers position (1-32) to a board grid index (0-63), with optional flip */
function posToIndex(squareValue: number, flip = false): number {
  const pos = new Position(squareValue);
  const { row, col } = pos.toRowCol();
  return flip ? (7 - row) * 8 + (7 - col) : row * 8 + col;
}

/** Convert CAKE BoardState to the UI Board's pieces format, with optional flip */
function cakeBoardToUi(
  board: ReturnType<typeof import('@tzdraft/cake-engine').CakeEngine.createInitialState>,
  flip = false,
): UiBoardState {
  const pieces: UiBoardState = {};
  for (const piece of board.getAllPieces()) {
    const { row, col } = piece.position.toRowCol();
    const idx = flip ? (7 - row) * 8 + (7 - col) : row * 8 + col;
    pieces[idx] = {
      color: piece.color as 'WHITE' | 'BLACK',
      isKing: piece.isKing(),
    };
  }
  return pieces;
}

function PlayerBar({ name, elo, side }: { name: string; elo: number | null; side: 'WHITE' | 'BLACK' }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <div
        className={`h-5 w-5 rounded-sm border ${
          side === 'WHITE' ? 'bg-neutral-100 border-neutral-300' : 'bg-neutral-900 border-neutral-600'
        }`}
      />
      <span className="text-sm font-semibold text-neutral-200">{name}</span>
      {elo && <span className="text-xs text-neutral-500">({elo})</span>}
    </div>
  );
}

export default function GameReviewPage() {
  const params = useParams();
  const gameId = params.id as string;
  const { user } = useAuth();

  const {
    moves,
    gameInfo,
    players,
    loading,
    error,
    currentBoard,
    stepIndex,
    totalMoves,
    goTo,
    next,
    prev,
    goToStart,
    goToEnd,
  } = useGameReplay(gameId);

  // Flip the board when the current user played as BLACK so their pieces are always at the bottom
  const isFlipped = Boolean(user && players?.black && user.id === players.black.id);

  const uiPieces = useMemo(
    () => cakeBoardToUi(currentBoard, isFlipped),
    [currentBoard, isFlipped],
  );

  const lastMove = useMemo(() => {
    if (stepIndex < 0 || !moves[stepIndex]) return null;
    return {
      from: posToIndex(moves[stepIndex].fromSquare, isFlipped),
      to: posToIndex(moves[stepIndex].toSquare, isFlipped),
    };
  }, [stepIndex, moves, isFlipped]);

  const currentMoveNotation =
    stepIndex >= 0 && moves[stepIndex] ? moves[stepIndex].notation : null;

  if (loading) {
    return (
      <main className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-neutral-500" />
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-red-400">{error}</p>
          <Link href="/profile/history">
            <Button variant="secondary">Back to History</Button>
          </Link>
        </div>
      </main>
    );
  }

  const whitePlayer = players?.white;
  const blackPlayer = players?.black;
  const whiteName = whitePlayer?.displayName ?? 'White';
  const blackName = blackPlayer?.displayName ?? gameInfo?.aiLevel ? `AI (Lv.${gameInfo.aiLevel})` : 'Black';
  const whiteElo = gameInfo?.whiteElo ?? null;
  const blackElo = gameInfo?.blackElo ?? null;

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)] px-4 py-8">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/profile/history">
            <Button variant="secondary" size="sm" className="gap-1.5">
              <ArrowLeft className="h-4 w-4" />
              History
            </Button>
          </Link>
          <h1 className="text-2xl font-black text-neutral-100">
            Game Review
            {gameInfo?.gameType && (
              <span className="ml-3 text-sm font-normal text-neutral-500">{gameInfo.gameType}</span>
            )}
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Board Column */}
          <div className="lg:col-span-2 space-y-4">
            <PlayerBar
              name={isFlipped ? whiteName : blackName}
              elo={isFlipped ? whiteElo : blackElo}
              side={isFlipped ? 'WHITE' : 'BLACK'}
            />
            <Board
              pieces={uiPieces}
              readOnly
              lastMove={lastMove}
              flipped={isFlipped}
            />
            <PlayerBar
              name={isFlipped ? blackName : whiteName}
              elo={isFlipped ? blackElo : whiteElo}
              side={isFlipped ? 'BLACK' : 'WHITE'}
            />

            {/* Navigation Controls */}
            <div className="flex items-center justify-center gap-2 pt-2">
              <Button variant="secondary" size="sm" onClick={goToStart} disabled={stepIndex === -1} title="Start">
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button variant="secondary" size="sm" onClick={prev} disabled={stepIndex === -1} title="Previous">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="min-w-[80px] text-center text-sm text-neutral-400">
                {stepIndex === -1 ? 'Start' : `Move ${stepIndex + 1} / ${totalMoves}`}
              </span>
              <Button variant="secondary" size="sm" onClick={next} disabled={stepIndex >= totalMoves - 1} title="Next">
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button variant="secondary" size="sm" onClick={goToEnd} disabled={stepIndex >= totalMoves - 1} title="End">
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>

            {currentMoveNotation && (
              <div className="text-center text-sm text-[#81b64c] font-mono font-semibold">
                {currentMoveNotation}
              </div>
            )}
          </div>

          {/* Move List */}
          <div className="lg:col-span-1">
            <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 overflow-hidden h-full">
              <div className="px-4 py-3 border-b border-neutral-800">
                <h2 className="text-sm font-black text-neutral-300 uppercase tracking-[0.3em]">
                  Moves ({totalMoves})
                </h2>
              </div>
              <div className="overflow-y-auto max-h-[500px] divide-y divide-neutral-800/50">
                <button
                  onClick={() => goTo(-1)}
                  className={`w-full text-left px-4 py-2 text-xs text-neutral-500 hover:bg-neutral-800/30 transition-colors ${
                    stepIndex === -1 ? 'bg-[#81b64c]/10 text-[#81b64c]' : ''
                  }`}
                >
                  — Start Position —
                </button>
                {moves.map((m, i) => (
                  <button
                    key={m.id}
                    onClick={() => goTo(i)}
                    className={`w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-neutral-800/30 transition-colors ${
                      stepIndex === i ? 'bg-[#81b64c]/10 text-[#81b64c]' : 'text-neutral-300'
                    }`}
                  >
                    <span className="text-xs text-neutral-600 w-8 shrink-0">{i + 1}.</span>
                    <span
                      className={`h-2.5 w-2.5 rounded-full shrink-0 ${
                        m.player === 'WHITE' ? 'bg-neutral-100' : 'bg-neutral-700 border border-neutral-500'
                      }`}
                    />
                    <span className="font-mono">{m.notation}</span>
                    {m.isPromotion && (
                      <span className="text-xs text-amber-400 ml-auto">★</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
