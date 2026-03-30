"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BoardState,
  MkaguziEngine,
  Move,
  PlayerColor,
  Position,
  Winner,
  isEngineReady,
  initEngine,
} from "@tzdraft/mkaguzi-engine";
import type {
  BoardState as UiBoardState,
  CaptureGhost,
  LastMoveState,
} from "@/components/game/Board";
import { playMoveSound } from "@/lib/game/move-sound";

function boardToFen(board: BoardState, player: PlayerColor): string {
  const stm = player === PlayerColor.WHITE ? "W" : "B";
  const w = board
    .getPiecesByColor(PlayerColor.WHITE)
    .map((p) => (p.isKing() ? `K${p.position.value}` : `${p.position.value}`))
    .sort()
    .join(",");
  const b = board
    .getPiecesByColor(PlayerColor.BLACK)
    .map((p) => (p.isKing() ? `K${p.position.value}` : `${p.position.value}`))
    .sort()
    .join(",");
  return `${stm}:W${w}:B${b}`;
}

function countFenOccurrences(history: string[], fen: string): number {
  let n = 0;
  for (const f of history) if (f === fen) n++;
  return n;
}

export interface LocalPvpGameState {
  board: BoardState;
  currentPlayer: PlayerColor;
  moveCount: number;
  moves: Move[];
  result: { winner: Winner; drawReason?: string } | null;
  timeLeft: { WHITE: number; BLACK: number };
  endgameCountdown: { favored: PlayerColor | null; remaining: number } | null;
  mustContinueFrom: number | null;
  showPassOverlay: boolean;
}

const getOpponent = (player: PlayerColor): PlayerColor =>
  player === PlayerColor.WHITE ? PlayerColor.BLACK : PlayerColor.WHITE;

function isOnLongDiagonal(position: Position): boolean {
  const { row, col } = position.toRowCol();
  return row + col === 7;
}

function computeTimeoutResult(
  board: BoardState,
  timedOutPlayer: PlayerColor,
  moveCount: number,
  endgameCountdown: { favored: PlayerColor | null; remaining: number } | null,
): { winner: Winner; drawReason?: string } {
  const opponent =
    timedOutPlayer === PlayerColor.WHITE ? PlayerColor.BLACK : PlayerColor.WHITE;
  const opponentWinner =
    opponent === PlayerColor.WHITE ? Winner.WHITE : Winner.BLACK;

  // Art. 10.1: no legal moves → loss
  const legal = MkaguziEngine.generateLegalMoves(board, timedOutPlayer, moveCount);
  if (legal.length === 0) {
    return { winner: opponentWinner };
  }

  const wp = board.getPiecesByColor(PlayerColor.WHITE);
  const bp = board.getPiecesByColor(PlayerColor.BLACK);
  const wk = wp.filter((p) => p.isKing()).length;
  const bk = bp.filter((p) => p.isKing()).length;
  const wm = wp.length - wk;
  const bm = bp.length - bk;

  // Art. 10.2: K vs K → draw
  if (wk === 1 && wm === 0 && bk === 1 && bm === 0) {
    return { winner: Winner.DRAW, drawReason: "timeout-kvk" };
  }

  // Art. 10.3: stronger side timed out → draw
  const timedWhite = timedOutPlayer === PlayerColor.WHITE;
  const timedBlack = timedOutPlayer === PlayerColor.BLACK;
  if (
    (timedWhite && wk === 2 && wm === 0 && bk === 1 && bm === 0) ||
    (timedBlack && bk === 2 && bm === 0 && wk === 1 && wm === 0) ||
    (timedWhite && wk === 1 && wm === 1 && bk === 1 && bm === 0) ||
    (timedBlack && bk === 1 && bm === 1 && wk === 1 && wm === 0) ||
    (timedWhite && wk === 1 && wm === 0 && bk === 0 && bm === 2) ||
    (timedBlack && bk === 1 && bm === 0 && wk === 0 && wm === 2)
  ) {
    return { winner: Winner.DRAW, drawReason: "timeout-insufficient" };
  }

  // Art. 10.4: weaker side (lone king) timed out in 2K/K+Man vs 1K
  const timedOutPieces = timedWhite ? wp : bp;
  const opponentPieces = timedWhite ? bp : wp;
  const timedOutIsLoneKing =
    timedOutPieces.length === 1 &&
    timedOutPieces[0].isKing() &&
    opponentPieces.length === 2;

  if (timedOutIsLoneKing) {
    const loneKingPos = timedOutPieces[0].position;

    if (isOnLongDiagonal(loneKingPos)) {
      return { winner: Winner.DRAW, drawReason: "timeout-long-diagonal" };
    }

    const weakMovesMade = endgameCountdown != null ? Math.max(0, 5 - endgameCountdown.remaining) : 0;
    if (weakMovesMade >= 5) {
      return { winner: Winner.DRAW, drawReason: "timeout-endgame-survived" };
    }

    return { winner: opponentWinner };
  }

  return { winner: opponentWinner };
}

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
    MkaguziEngine.createInitialState(),
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
  const endgameCountdownRef = useRef<{ favored: PlayerColor | null; remaining: number } | null>(null);
  const thirtyMoveCountRef = useRef(0);
  endgameCountdownRef.current = endgameCountdown;
  thirtyMoveCountRef.current = thirtyMoveCount;
  const [mustContinueFrom, setMustContinueFrom] = useState<Position | null>(null);
  const [showPassOverlay, setShowPassOverlay] = useState(false);
  const [engineReady, setEngineReady] = useState(isEngineReady());
  useEffect(() => {
    if (engineReady) return;
    initEngine("/wasm/mkaguzi_wasm.js").then(() => setEngineReady(true)).catch(() => {});
  }, [engineReady]);
  // Store last move in board coordinates so it re-maps correctly when board flips
  const [lastMovePositions, setLastMovePositions] = useState<{
    from: Position;
    to: Position;
  } | null>(null);
  const [capturedGhosts, setCapturedGhosts] = useState<CaptureGhost[]>([]);

  const captureCleanupTimeoutsRef = useRef<number[]>([]);
  const captureGhostIdRef = useRef(0);
  const initialBoardRef = useRef<BoardState>(MkaguziEngine.createInitialState());
  const fenHistoryRef = useRef<string[]>([
    boardToFen(MkaguziEngine.createInitialState(), PlayerColor.WHITE),
  ]);
  const moveAudioRef = useRef<HTMLAudioElement | null>(null);
  const longMoveAudioRef = useRef<HTMLAudioElement | null>(null);
  const captureAudioRef = useRef<HTMLAudioElement | null>(null);
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
    const allMoves = MkaguziEngine.generateLegalMoves(board, currentPlayer, moveCount);
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
  }, [board, currentPlayer, moveCount, flipForCurrentPlayer, mustContinueFrom, engineReady]);

  const forcedPieces = useMemo(() => {
    if (mustContinueFrom) {
      return [positionToIndex(mustContinueFrom, flipForCurrentPlayer)];
    }
    const allMoves = MkaguziEngine.generateLegalMoves(board, currentPlayer, moveCount);
    const captures = allMoves.filter((m) => m.capturedSquares.length > 0);
    if (captures.length === 0) return [];
    const set = new Set<number>();
    for (const move of captures) {
      set.add(positionToIndex(move.from, flipForCurrentPlayer));
    }
    return Array.from(set);
  }, [board, currentPlayer, moveCount, flipForCurrentPlayer, mustContinueFrom, engineReady]);

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

  // Returns the draw reason string if a draw should be declared, null otherwise.
  const evaluateEndgameCountdown = useCallback(
    (nextBoard: BoardState, movePlayer: PlayerColor, hadCapture: boolean): string | null => {
      const whitePieces = nextBoard.getPiecesByColor(PlayerColor.WHITE);
      const blackPieces = nextBoard.getPiecesByColor(PlayerColor.BLACK);
      const whiteKings = whitePieces.filter((p) => p.isKing()).length;
      const blackKings = blackPieces.filter((p) => p.isKing()).length;
      const whiteMen = whitePieces.length - whiteKings;
      const blackMen = blackPieces.length - blackKings;

      // Article 8.3 — 30 full moves = 60 half-moves with kings only and no captures.
      const allKings = whiteMen === 0 && blackMen === 0;
      const newThirtyCount =
        !allKings || hadCapture ? 0 : thirtyMoveCountRef.current + 1;
      setThirtyMoveCount(newThirtyCount);
      thirtyMoveCountRef.current = newThirtyCount;
      if (newThirtyCount >= 60) return '30-move';

      // K vs K intentionally excluded — in TZD kings can capture kings.
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
      // K vs K intentionally omitted — kings can capture kings in TZD

      if (limit === 0) {
        setEndgameCountdown(null);
        endgameCountdownRef.current = null;
        return null;
      }

      const prev = endgameCountdownRef.current;
      const isNewScenario = !prev || prev.favored !== favored;
      const base = isNewScenario ? limit : prev.remaining;
      const shouldDecrement = favored === null || movePlayer === favored;

      let newCountdown: { favored: PlayerColor | null; remaining: number };
      if (!shouldDecrement) {
        newCountdown = isNewScenario ? { favored, remaining: base } : prev;
      } else {
        const remaining = Math.max(0, base - 1);
        newCountdown = { favored, remaining };
      }

      setEndgameCountdown(newCountdown);
      endgameCountdownRef.current = newCountdown;
      return newCountdown.remaining === 0
        ? (favored !== null ? 'three-kings' : 'endgame')
        : null;
    },
    [],
  );

  const applyMove = useCallback(
    (move: Move) => {
      playMoveSound(
        {
          from: move.from,
          to: move.to,
          capturedCount: move.capturedSquares.length,
        },
        {
          normal: moveAudioRef.current,
          long: longMoveAudioRef.current,
          capture: captureAudioRef.current,
        },
      );

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

      const nextBoard = MkaguziEngine.applyMove(board, move);
      const nextPlayer = getOpponent(currentPlayer);

      // Track FEN history for Art. 8.2 threefold repetition detection
      fenHistoryRef.current.push(boardToFen(nextBoard, nextPlayer));

      setBoard(nextBoard);
      setMoves((prev) => [...prev, move]);
      setMoveCount((prev) => prev + 1);

      // TZD free-choice: a complete capture path is applied atomically; turn
      // always passes to the opponent — never force a "continue capturing" chain.
      setMustContinueFrom(null);
      setCurrentPlayer(nextPlayer);
      if (passDevice) setShowPassOverlay(true);

      const endgameDrawReason = evaluateEndgameCountdown(
        nextBoard,
        move.player,
        move.capturedSquares.length > 0,
      );

      // Art. 8.2 — threefold repetition: same position with same side-to-move 3× → draw
      const newFen = fenHistoryRef.current[fenHistoryRef.current.length - 1];
      const isRepetition = countFenOccurrences(fenHistoryRef.current, newFen) >= 3;

      const drawReason = endgameDrawReason ?? (isRepetition ? 'repetition' : null);

      const gameResult = MkaguziEngine.evaluateGameResult(nextBoard, nextPlayer);
      if (gameResult) setResult({ winner: gameResult.winner });
      else if (drawReason) setResult({ winner: Winner.DRAW, drawReason });
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

      const allMoves = MkaguziEngine.generateLegalMoves(board, currentPlayer, moveCount);
      const filtered = mustContinueFrom
        ? allMoves.filter((m) => m.from.equals(mustContinueFrom))
        : allMoves;
      const match = filtered.find(
        (move) => move.from.equals(from) && move.to.equals(to),
      );
      if (!match) return;
      if (mustContinueFrom && !match.from.equals(mustContinueFrom)) return;
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
    const rebuiltFens: string[] = [boardToFen(initialBoardRef.current, PlayerColor.WHITE)];
    for (const move of newMoves) {
      nextBoard = MkaguziEngine.applyMove(nextBoard, move);
      rebuiltFens.push(boardToFen(nextBoard, getOpponent(move.player)));
    }
    fenHistoryRef.current = rebuiltFens;
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
    endgameCountdownRef.current = null;
    setThirtyMoveCount(0);
    thirtyMoveCountRef.current = 0;
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
    initialBoardRef.current = MkaguziEngine.createInitialState();
    fenHistoryRef.current = [boardToFen(initialBoardRef.current, PlayerColor.WHITE)];
    setBoard(initialBoardRef.current);
    setCurrentPlayer(PlayerColor.WHITE);
    setMoveCount(0);
    setMoves([]);
    setResult(null);
    setTimeLeft({ WHITE: timeSeconds, BLACK: timeSeconds });
    setEndgameCountdown(null);
    endgameCountdownRef.current = null;
    setThirtyMoveCount(0);
    thirtyMoveCountRef.current = 0;
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
    const moveAudio = new Audio("/sfx/move-tap.wav");
    moveAudio.preload = "auto";
    moveAudio.volume = 0.48;
    moveAudioRef.current = moveAudio;

    const longMoveAudio = new Audio("/sfx/move-slide.wav");
    longMoveAudio.preload = "auto";
    longMoveAudio.volume = 0.52;
    longMoveAudioRef.current = longMoveAudio;

    const captureAudio = new Audio("/sfx/move-capture.wav");
    captureAudio.preload = "auto";
    captureAudio.volume = 0.6;
    captureAudioRef.current = captureAudio;

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
      longMoveAudioRef.current = null;
      captureAudioRef.current = null;
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
        // Art. 10: timeout → loss UNLESS opponent has insufficient material to win (Art. 8.1).
        const wp = board.getPiecesByColor(PlayerColor.WHITE);
        const bp = board.getPiecesByColor(PlayerColor.BLACK);
        const wk = wp.filter((p) => p.isKing()).length;
        const bk = bp.filter((p) => p.isKing()).length;
        const wm = wp.length - wk;
        const bm = bp.length - bk;
        // Opponent cannot force a win: 1-2 kings vs lone king (no men on either side)
        const blackCannotWin = bm === 0 && bk <= 2 && wm === 0 && wk === 1;
        const whiteCannotWin = wm === 0 && wk <= 2 && bm === 0 && bk === 1;
        if (next.WHITE === 0) {
          setResult({ winner: blackCannotWin ? Winner.DRAW : Winner.BLACK });
        } else if (next.BLACK === 0) {
          setResult({ winner: whiteCannotWin ? Winner.DRAW : Winner.WHITE });
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
    engineReady,
    playWarning,
    makeMove,
    dismissPassOverlay,
    resign,
    undo,
    reset,
  };
};
