"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BoardState,
  CakeEngine,
  CaptureFindingService,
  Move,
  PlayerColor,
  Position,
  Winner,
} from "@tzdraft/cake-engine";
import type {
  BoardState as UiBoardState,
  CaptureGhost,
  LastMoveState,
} from "@/components/game/Board";

export interface LocalPvpGameState {
  board: BoardState;
  currentPlayer: PlayerColor;
  moveCount: number;
  moves: Move[];
  result: { winner: Winner } | null;
  timeLeft: { WHITE: number; BLACK: number };
  endgameCountdown: { favored: PlayerColor | null; remaining: number } | null;
  mustContinueFrom: number | null;
  showPassOverlay: boolean;
}

const getOpponent = (player: PlayerColor): PlayerColor =>
  player === PlayerColor.WHITE ? PlayerColor.BLACK : PlayerColor.WHITE;

const toUiColor = (color: PlayerColor): "WHITE" | "BLACK" =>
  color === PlayerColor.WHITE ? "WHITE" : "BLACK";

const positionToIndex = (position: Position, flip: boolean): number => {
  const { row, col } = position.toRowCol();
  if (!flip) return row * 8 + col;
  return (7 - row) * 8 + (7 - col);
};

const indexToPosition = (index: number, flip: boolean): Position | null => {
  const row = Math.floor(index / 8);
  const col = index % 8;
  const mappedRow = flip ? 7 - row : row;
  const mappedCol = flip ? 7 - col : col;
  try {
    return Position.fromRowCol(mappedRow, mappedCol);
  } catch {
    return null;
  }
};

const boardToUiPieces = (board: BoardState, flip: boolean): UiBoardState => {
  const result: UiBoardState = {};
  for (const piece of board.getAllPieces()) {
    result[positionToIndex(piece.position, flip)] = {
      color: piece.color,
      isKing: piece.isKing(),
    };
  }
  return result;
};

export const useLocalPvpGame = (timeSeconds: number, passDevice: boolean) => {
  const [board, setBoard] = useState<BoardState>(() =>
    CakeEngine.createInitialState(),
  );
  const [currentPlayer, setCurrentPlayer] = useState<PlayerColor>(PlayerColor.WHITE);
  const [moveCount, setMoveCount] = useState(0);
  const [moves, setMoves] = useState<Move[]>([]);
  const [result, setResult] = useState<{ winner: Winner } | null>(null);
  const [timeLeft, setTimeLeft] = useState<{ WHITE: number; BLACK: number }>({
    WHITE: timeSeconds,
    BLACK: timeSeconds,
  });
  const [endgameCountdown, setEndgameCountdown] = useState<{
    favored: PlayerColor | null;
    remaining: number;
  } | null>(null);
  const [thirtyMoveCount, setThirtyMoveCount] = useState(0);
  const [mustContinueFrom, setMustContinueFrom] = useState<Position | null>(null);
  const [showPassOverlay, setShowPassOverlay] = useState(false);
  // Store last move in board coordinates so it re-maps correctly when board flips
  const [lastMovePositions, setLastMovePositions] = useState<{
    from: Position;
    to: Position;
  } | null>(null);
  const [capturedGhosts, setCapturedGhosts] = useState<CaptureGhost[]>([]);

  const captureCleanupTimeoutsRef = useRef<number[]>([]);
  const captureGhostIdRef = useRef(0);
  const initialBoardRef = useRef<BoardState>(CakeEngine.createInitialState());
  const moveAudioRef = useRef<HTMLAudioElement | null>(null);
  const startAudioRef = useRef<HTMLAudioElement | null>(null);
  const warningAudioRef = useRef<HTMLAudioElement | null>(null);
  const victoryAudioRef = useRef<HTMLAudioElement | null>(null);
  const prevResultRef = useRef<Winner | null>(null);
  const startedRef = useRef(false);

  // Board is always oriented so the current player's pieces are at the bottom
  const flipForCurrentPlayer = currentPlayer === PlayerColor.WHITE;

  const pieces = useMemo(
    () => boardToUiPieces(board, flipForCurrentPlayer),
    [board, flipForCurrentPlayer],
  );

  const legalMoves = useMemo(() => {
    const map: Record<number, number[]> = {};
    const allMoves = CakeEngine.generateLegalMoves(board, currentPlayer, moveCount);
    const filtered = mustContinueFrom
      ? allMoves.filter((m) => m.from.equals(mustContinueFrom))
      : allMoves;
    for (const move of filtered) {
      const fromIdx = positionToIndex(move.from, flipForCurrentPlayer);
      const toIdx = positionToIndex(move.to, flipForCurrentPlayer);
      if (!map[fromIdx]) map[fromIdx] = [];
      map[fromIdx].push(toIdx);
    }
    return map;
  }, [board, currentPlayer, moveCount, flipForCurrentPlayer, mustContinueFrom]);

  const forcedPieces = useMemo(() => {
    if (mustContinueFrom) {
      return [positionToIndex(mustContinueFrom, flipForCurrentPlayer)];
    }
    const allMoves = CakeEngine.generateLegalMoves(board, currentPlayer, moveCount);
    const captures = allMoves.filter((m) => m.capturedSquares.length > 0);
    if (captures.length === 0) return [];
    const set = new Set<number>();
    for (const move of captures) {
      set.add(positionToIndex(move.from, flipForCurrentPlayer));
    }
    return Array.from(set);
  }, [board, currentPlayer, moveCount, flipForCurrentPlayer, mustContinueFrom]);

  // Derive UI last-move indices from board-space positions so they update when board flips
  const lastMove: LastMoveState = useMemo(
    () =>
      lastMovePositions
        ? {
            from: positionToIndex(lastMovePositions.from, flipForCurrentPlayer),
            to: positionToIndex(lastMovePositions.to, flipForCurrentPlayer),
          }
        : null,
    [lastMovePositions, flipForCurrentPlayer],
  );

  const evaluateEndgameCountdown = useCallback(
    (nextBoard: BoardState, movePlayer: PlayerColor, hadCapture: boolean) => {
      const whitePieces = nextBoard.getPiecesByColor(PlayerColor.WHITE);
      const blackPieces = nextBoard.getPiecesByColor(PlayerColor.BLACK);
      const whiteKings = whitePieces.filter((p) => p.isKing()).length;
      const blackKings = blackPieces.filter((p) => p.isKing()).length;
      const whiteMen = whitePieces.length - whiteKings;
      const blackMen = blackPieces.length - blackKings;

      // Article 8.3 — 30-move rule: all kings, no captures → count; reset otherwise
      const allKings = whiteMen === 0 && blackMen === 0;
      setThirtyMoveCount((prev) => {
        if (!allKings || hadCapture) return 0;
        const next = prev + 1;
        if (next >= 30) setResult({ winner: Winner.DRAW });
        return next;
      });

      const whiteOnlyKing = whitePieces.length === 1 && whiteKings === 1;
      const blackOnlyKing = blackPieces.length === 1 && blackKings === 1;
      const whiteTwoKings = whitePieces.length === 2 && whiteKings === 2;
      const blackTwoKings = blackPieces.length === 2 && blackKings === 2;
      const whiteKingMan = whitePieces.length === 2 && whiteKings === 1 && whiteMen === 1;
      const blackKingMan = blackPieces.length === 2 && blackKings === 1 && blackMen === 1;
      const whiteThreePlusKings = whiteKings >= 3 && whiteMen === 0;
      const blackThreePlusKings = blackKings >= 3 && blackMen === 0;

      let favored: PlayerColor | null = null;
      let limit = 0;

      if (whiteOnlyKing && blackThreePlusKings) { favored = PlayerColor.BLACK; limit = 12; }
      else if (blackOnlyKing && whiteThreePlusKings) { favored = PlayerColor.WHITE; limit = 12; }
      else if (whiteOnlyKing && blackTwoKings) { favored = PlayerColor.BLACK; limit = 5; }
      else if (blackOnlyKing && whiteTwoKings) { favored = PlayerColor.WHITE; limit = 5; }
      else if (whiteOnlyKing && blackKingMan) { favored = PlayerColor.BLACK; limit = 5; }
      else if (blackOnlyKing && whiteKingMan) { favored = PlayerColor.WHITE; limit = 5; }
      else if (whiteOnlyKing && blackOnlyKing) { favored = null; limit = 5; }

      if (limit === 0) {
        setEndgameCountdown(null);
        return;
      }

      setEndgameCountdown((prev) => {
        const isNewScenario = !prev || prev.favored !== favored;
        const base = isNewScenario ? limit : prev!.remaining;
        const shouldDecrement = favored === null || movePlayer === favored;
        if (!shouldDecrement) {
          return isNewScenario ? { favored, remaining: base } : prev!;
        }
        const remaining = Math.max(0, base - 1);
        if (remaining === 0) setResult({ winner: Winner.DRAW });
        return { favored, remaining };
      });
    },
    [],
  );

  const applyMove = useCallback(
    (move: Move) => {
      if (moveAudioRef.current) {
        moveAudioRef.current.currentTime = 0;
        moveAudioRef.current.play().catch(() => {});
      }

      // Store in board coordinates for correct flip-aware display
      setLastMovePositions({ from: move.from, to: move.to });

      const moveCaptures = move.capturedSquares.reduce<CaptureGhost[]>(
        (acc, capturedPos) => {
          const capturedPiece = board.getPieceAt(capturedPos);
          if (!capturedPiece) return acc;
          acc.push({
            id: ++captureGhostIdRef.current,
            index: positionToIndex(capturedPos, flipForCurrentPlayer),
            piece: {
              color: toUiColor(capturedPiece.color),
              isKing: capturedPiece.isKing() ? true : undefined,
            },
          });
          return acc;
        },
        [],
      );
      if (moveCaptures.length > 0) {
        setCapturedGhosts((prev) => [...prev, ...moveCaptures].slice(-24));
        const cleanupId = window.setTimeout(() => {
          setCapturedGhosts((prev) =>
            prev.filter((g) => !moveCaptures.some((c) => c.id === g.id)),
          );
          captureCleanupTimeoutsRef.current = captureCleanupTimeoutsRef.current.filter(
            (id) => id !== cleanupId,
          );
        }, 240);
        captureCleanupTimeoutsRef.current.push(cleanupId);
      }

      const nextBoard = CakeEngine.applyMove(board, move);
      const nextPlayer = getOpponent(currentPlayer);

      setBoard(nextBoard);
      setMoves((prev) => [...prev, move]);
      setMoveCount((prev) => prev + 1);

      // TZD free-choice: a complete capture path is applied atomically; turn
      // always passes to the opponent — never force a "continue capturing" chain.
      setMustContinueFrom(null);
      setCurrentPlayer(nextPlayer);
      if (passDevice) setShowPassOverlay(true);

      evaluateEndgameCountdown(nextBoard, move.player, move.capturedSquares.length > 0);

      const gameResult = CakeEngine.evaluateGameResult(nextBoard, nextPlayer);
      if (gameResult) setResult({ winner: gameResult.winner });
    },
    [board, currentPlayer, evaluateEndgameCountdown, flipForCurrentPlayer, passDevice],
  );

  const makeMove = useCallback(
    (fromIndex: number, toIndex: number) => {
      if (result) return;
      if (showPassOverlay) return;

      const from = indexToPosition(fromIndex, flipForCurrentPlayer);
      const to = indexToPosition(toIndex, flipForCurrentPlayer);
      if (!from || !to) return;

      const allMoves = CakeEngine.generateLegalMoves(board, currentPlayer, moveCount);
      const filtered = mustContinueFrom
        ? allMoves.filter((m) => m.from.equals(mustContinueFrom))
        : allMoves;
      const match = filtered.find(
        (move) => move.from.equals(from) && move.to.equals(to),
      );
      if (!match) return;
      if (mustContinueFrom && !match.from.equals(mustContinueFrom)) return;

      if (match.capturedSquares.length > 0) {
        const piece = board.getPieceAt(from);
        if (piece) {
          const captureService = new CaptureFindingService();
          const captures = captureService.findCapturesForPiece(board, piece);
          const captureMatch = captures.find(
            (c) => c.from.equals(from) && c.to.equals(to),
          );
          if (captureMatch) {
            const notation = Move.generateNotation(from, to, captureMatch.capturedSquares);
            const rebuilt = new Move(
              match.id, match.gameId, match.moveNumber, match.player,
              match.from, match.to, captureMatch.capturedSquares,
              captureMatch.isPromotion, notation, match.createdAt,
            );
            applyMove(rebuilt);
            return;
          }
          // Fallback: flying king single-capture path reconstruction
          const fromCoords = from.toRowCol();
          const toCoords = to.toRowCol();
          const rowStep = Math.sign(toCoords.row - fromCoords.row);
          const colStep = Math.sign(toCoords.col - fromCoords.col);
          if (rowStep !== 0 && colStep !== 0) {
            const jumped: Position[] = [];
            let r = fromCoords.row + rowStep;
            let c = fromCoords.col + colStep;
            while (r !== toCoords.row && c !== toCoords.col) {
              const pos = Position.fromRowCol(r, c);
              const occupant = board.getPieceAt(pos);
              if (occupant && occupant.color !== piece.color) jumped.push(pos);
              r += rowStep;
              c += colStep;
            }
            if (jumped.length === 1) {
              const notation = Move.generateNotation(from, to, jumped);
              const rebuilt = new Move(
                match.id, match.gameId, match.moveNumber, match.player,
                match.from, match.to, jumped, match.isPromotion, notation, match.createdAt,
              );
              applyMove(rebuilt);
              return;
            }
          }
        }
      }
      applyMove(match);
    },
    [applyMove, board, currentPlayer, moveCount, result, mustContinueFrom, flipForCurrentPlayer, showPassOverlay],
  );

  const dismissPassOverlay = useCallback(() => {
    setShowPassOverlay(false);
  }, []);

  const resign = useCallback((resigningColor: PlayerColor) => {
    const winner = resigningColor === PlayerColor.WHITE ? Winner.BLACK : Winner.WHITE;
    setResult({ winner });
  }, []);

  const undo = useCallback(() => {
    if (moves.length === 0) return;
    const newMoves = moves.slice(0, -1);
    let nextBoard = initialBoardRef.current;
    for (const move of newMoves) {
      nextBoard = CakeEngine.applyMove(nextBoard, move);
    }
    const nextPlayer =
      newMoves.length === 0
        ? PlayerColor.WHITE
        : getOpponent(newMoves[newMoves.length - 1].player);
    setBoard(nextBoard);
    setMoves(newMoves);
    setMoveCount(newMoves.length);
    setCurrentPlayer(nextPlayer);
    setResult(null);
    setEndgameCountdown(null);
    setThirtyMoveCount(0);
    setMustContinueFrom(null);
    setLastMovePositions(null);
    setCapturedGhosts([]);
    setShowPassOverlay(false);
    for (const id of captureCleanupTimeoutsRef.current) {
      window.clearTimeout(id);
    }
    captureCleanupTimeoutsRef.current = [];
  }, [moves]);

  const reset = useCallback(() => {
    initialBoardRef.current = CakeEngine.createInitialState();
    setBoard(initialBoardRef.current);
    setCurrentPlayer(PlayerColor.WHITE);
    setMoveCount(0);
    setMoves([]);
    setResult(null);
    setTimeLeft({ WHITE: timeSeconds, BLACK: timeSeconds });
    setEndgameCountdown(null);
    setThirtyMoveCount(0);
    setMustContinueFrom(null);
    setLastMovePositions(null);
    setCapturedGhosts([]);
    setShowPassOverlay(false);
    for (const id of captureCleanupTimeoutsRef.current) {
      window.clearTimeout(id);
    }
    captureCleanupTimeoutsRef.current = [];
    if (startAudioRef.current) {
      startAudioRef.current.currentTime = 0;
      startAudioRef.current.play().catch(() => {});
    }
  }, [timeSeconds]);

  // Audio init
  useEffect(() => {
    if (typeof window === "undefined") return;
    const moveAudio = new Audio("/sfx/move1.mp3");
    moveAudio.preload = "auto";
    moveAudio.volume = 0.4;
    moveAudioRef.current = moveAudio;

    const startAudio = new Audio("/sfx/start.mp3");
    startAudio.preload = "auto";
    startAudio.volume = 0.5;
    startAudioRef.current = startAudio;

    const warningAudio = new Audio("/sfx/warning.wav");
    warningAudio.preload = "auto";
    warningAudio.volume = 0.6;
    warningAudioRef.current = warningAudio;

    const victoryAudio = new Audio("/sfx/victory.mp3");
    victoryAudio.preload = "auto";
    victoryAudio.volume = 0.6;
    victoryAudioRef.current = victoryAudio;

    if (!startedRef.current) {
      startAudio.currentTime = 0;
      startAudio.play().catch(() => {});
      startedRef.current = true;
    }

    return () => {
      for (const id of captureCleanupTimeoutsRef.current) {
        window.clearTimeout(id);
      }
      captureCleanupTimeoutsRef.current = [];
      moveAudioRef.current = null;
      startAudioRef.current = null;
      warningAudioRef.current = null;
      victoryAudioRef.current = null;
    };
  }, []);

  // Victory sound on result
  useEffect(() => {
    const winner = result?.winner ?? null;
    if (!winner || winner === prevResultRef.current) return;
    prevResultRef.current = winner;
    if (victoryAudioRef.current) {
      victoryAudioRef.current.currentTime = 0;
      victoryAudioRef.current.play().catch(() => {});
    }
  }, [result]);

  // Clock countdown — paused while pass-device overlay is visible
  useEffect(() => {
    if (result || timeSeconds === 0 || showPassOverlay) return;
    const interval = window.setInterval(() => {
      setTimeLeft((prev) => {
        const next = { ...prev };
        if (currentPlayer === PlayerColor.WHITE) {
          next.WHITE = Math.max(0, next.WHITE - 1);
        } else {
          next.BLACK = Math.max(0, next.BLACK - 1);
        }
        const whitePieces = board.getPiecesByColor(PlayerColor.WHITE).length;
        const blackPieces = board.getPiecesByColor(PlayerColor.BLACK).length;
        const isThreeVsOne =
          (whitePieces === 3 && blackPieces === 1) ||
          (whitePieces === 1 && blackPieces === 3);
        if (next.WHITE === 0) {
          setResult({ winner: isThreeVsOne ? Winner.DRAW : Winner.BLACK });
        } else if (next.BLACK === 0) {
          setResult({ winner: isThreeVsOne ? Winner.DRAW : Winner.WHITE });
        }
        return next;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [board, currentPlayer, result, timeSeconds, showPassOverlay]);

  const playWarning = useCallback(() => {
    if (!warningAudioRef.current) return;
    warningAudioRef.current.currentTime = 0;
    warningAudioRef.current.play().catch(() => {});
  }, []);

  return {
    state: {
      board,
      currentPlayer,
      moveCount,
      moves,
      result,
      timeLeft,
      endgameCountdown,
      mustContinueFrom: mustContinueFrom
        ? positionToIndex(mustContinueFrom, flipForCurrentPlayer)
        : null,
      showPassOverlay,
    } as LocalPvpGameState,
    pieces,
    lastMove,
    capturedGhosts,
    legalMoves,
    forcedPieces,
    flipBoard: flipForCurrentPlayer,
    playWarning,
    makeMove,
    dismissPassOverlay,
    resign,
    undo,
    reset,
  };
};
