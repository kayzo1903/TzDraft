"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BoardState,
  MkaguziEngine,
  Move,
  PlayerColor,
  Position,
  Winner,
} from "@tzdraft/mkaguzi-engine";
import type {
  BoardState as UiBoardState,
  CaptureGhost,
  LastMoveState,
} from "@/components/game/Board";
import { playMoveSound } from "@/lib/game/move-sound";
import { gameService } from "@/services/game.service";
import { useSocket } from "@/hooks/useSocket";

/* ─── Helpers (mirrored from useOnlineGame) ─────────────────────────────── */

const getPositionValue = (p: unknown): number => {
  if (typeof p === "number") return p;
  const obj = p as Record<string, unknown>;
  if (typeof obj?._value === "number") return obj._value;
  if (typeof obj?.value === "number") return obj.value as number;
  throw new Error(`Invalid position format: ${JSON.stringify(p)}`);
};

const positionToIndex = (position: Position, flip: boolean): number => {
  const { row, col } = position.toRowCol();
  if (!flip) return row * 8 + col;
  return (7 - row) * 8 + (7 - col);
};

const boardToUiPieces = (board: BoardState, flip: boolean): UiBoardState => {
  const pieces: UiBoardState = {};
  for (const piece of board.getAllPieces()) {
    pieces[positionToIndex(piece.position, flip)] = {
      color: piece.color,
      isKing: piece.isKing(),
    };
  }
  return pieces;
};

const toUiColor = (color: PlayerColor): "WHITE" | "BLACK" =>
  color === PlayerColor.WHITE ? "WHITE" : "BLACK";

const reconstructBoard = (rawMoves: unknown[]): BoardState => {
  let board = MkaguziEngine.createInitialState();
  for (const raw of rawMoves) {
    const m = raw as Record<string, unknown>;
    try {
      const from = new Position(getPositionValue(m.from));
      const to = new Position(getPositionValue(m.to));
      const capturedSquares = ((m.capturedSquares as unknown[]) ?? []).map(
        (v) => new Position(getPositionValue(v)),
      );
      const move = new Move(
        String(m.id ?? ""),
        String(m.gameId ?? ""),
        Number(m.moveNumber ?? 0),
        (m.player as PlayerColor) ?? PlayerColor.WHITE,
        from,
        to,
        capturedSquares,
        Boolean(m.isPromotion),
        String(m.notation ?? ""),
        new Date(),
      );
      board = MkaguziEngine.applyMove(board, move);
    } catch {
      // skip malformed move
    }
  }
  return board;
};

/* ─── Types ─────────────────────────────────────────────────────────────── */

export interface SpectatorGameState {
  board: BoardState;
  currentPlayer: PlayerColor;
  moveCount: number;
  result: { winner: Winner | null; reason?: string } | null;
  timeLeft: { WHITE: number; BLACK: number } | null;
  isActive: boolean;
  gameData: Record<string, unknown> | null;
  players: {
    white: Record<string, unknown> | null;
    black: Record<string, unknown> | null;
  };
}

/* ─── Hook ──────────────────────────────────────────────────────────────── */

export const useSpectatorGame = (gameId: string) => {
  const { socket } = useSocket();

  const [gameData, setGameData] = useState<Record<string, unknown> | null>(null);
  const [players, setPlayers] = useState<{
    white: Record<string, unknown> | null;
    black: Record<string, unknown> | null;
  }>({ white: null, black: null });
  const [board, setBoard] = useState<BoardState>(() =>
    MkaguziEngine.createInitialState(),
  );
  const [moveCount, setMoveCount] = useState(0);
  const [result, setResult] = useState<{
    winner: Winner | null;
    reason?: string;
  } | null>(null);
  const [timeLeft, setTimeLeft] = useState<{ WHITE: number; BLACK: number } | null>(null);
  const [capturedGhosts, setCapturedGhosts] = useState<CaptureGhost[]>([]);
  const [lastMovePositions, setLastMovePositions] = useState<{
    from: Position;
    to: Position;
  } | null>(null);

  const prevMoveCountRef = useRef(0);
  const captureCleanupRef = useRef<number[]>([]);
  const captureGhostIdRef = useRef(0);
  const serverClockRef = useRef<{ WHITE: number; BLACK: number; receivedAt: number } | null>(null);
  const currentPlayerRef = useRef<PlayerColor>(PlayerColor.WHITE);
  const resultRef = useRef<{ winner: Winner | null; reason?: string } | null>(null);
  const isActiveRef = useRef(false);

  const moveAudioRef = useRef<HTMLAudioElement | null>(null);
  const longMoveAudioRef = useRef<HTMLAudioElement | null>(null);
  const captureAudioRef = useRef<HTMLAudioElement | null>(null);
  const multiCaptureAudioRef = useRef<HTMLAudioElement | null>(null);

  const currentPlayer = useMemo(
    () => (moveCount % 2 === 0 ? PlayerColor.WHITE : PlayerColor.BLACK),
    [moveCount],
  );

  // Spectators always see from Black's natural orientation (no flip)
  const flipBoard = false;

  const pieces = useMemo(() => boardToUiPieces(board, flipBoard), [board]);

  const lastMove: LastMoveState = useMemo(
    () =>
      lastMovePositions
        ? {
            from: positionToIndex(lastMovePositions.from, flipBoard),
            to: positionToIndex(lastMovePositions.to, flipBoard),
          }
        : null,
    [lastMovePositions],
  );

  const applyClockSnapshot = useCallback(
    (
      clock: { whiteTimeMs: number; blackTimeMs: number; lastMoveAt?: string | Date },
      activeColor: PlayerColor,
    ) => {
      const baseWhite = Number(clock.whiteTimeMs);
      const baseBlack = Number(clock.blackTimeMs);
      let whiteMs = baseWhite;
      let blackMs = baseBlack;
      const lm = clock.lastMoveAt ? new Date(clock.lastMoveAt).getTime() : NaN;
      if (!Number.isNaN(lm)) {
        const elapsed = Math.max(0, Date.now() - lm);
        if (activeColor === PlayerColor.WHITE) whiteMs = Math.max(0, baseWhite - elapsed);
        else blackMs = Math.max(0, baseBlack - elapsed);
      }
      serverClockRef.current = { WHITE: whiteMs, BLACK: blackMs, receivedAt: Date.now() };
      setTimeLeft({ WHITE: whiteMs, BLACK: blackMs });
    },
    [],
  );

  const fetchGameState = useCallback(async () => {
    try {
      const res = await gameService.getGame(gameId);
      const { game, moves, players: playersData } = res.data;
      setGameData(game);
      if (playersData)
        setPlayers(playersData as { white: Record<string, unknown> | null; black: Record<string, unknown> | null });

      const newBoard = reconstructBoard(moves ?? []);
      const newMoveCount = (moves ?? []).length;

      if (newMoveCount > prevMoveCountRef.current && (moves ?? []).length > 0) {
        const lastRaw = (moves as unknown[])[moves.length - 1] as Record<string, unknown>;
        try {
          const fromVal = getPositionValue(lastRaw.from);
          const toVal = getPositionValue(lastRaw.to);
          setLastMovePositions({ from: new Position(fromVal), to: new Position(toVal) });

          const capturedVals = ((lastRaw.capturedSquares as unknown[]) ?? []).map(getPositionValue);
          if (capturedVals.length > 0) {
            const movePlayer = (lastRaw.player as PlayerColor) ?? PlayerColor.WHITE;
            const capturedColor = movePlayer === PlayerColor.WHITE ? PlayerColor.BLACK : PlayerColor.WHITE;
            const ghosts: CaptureGhost[] = capturedVals.map((v) => ({
              id: ++captureGhostIdRef.current,
              index: positionToIndex(new Position(v), flipBoard),
              piece: { color: toUiColor(capturedColor), isKing: undefined },
            }));
            setCapturedGhosts((prev) => [...prev, ...ghosts].slice(-24));
            const cleanupId = window.setTimeout(() => {
              setCapturedGhosts((prev) => prev.filter((g) => !ghosts.some((c) => c.id === g.id)));
              captureCleanupRef.current = captureCleanupRef.current.filter((id) => id !== cleanupId);
            }, 240);
            captureCleanupRef.current.push(cleanupId);
          }

          playMoveSound(
            { from: new Position(fromVal), to: new Position(toVal), capturedCount: capturedVals.length },
            { normal: moveAudioRef.current, long: longMoveAudioRef.current, capture: captureAudioRef.current, multiCapture: multiCaptureAudioRef.current },
          );
        } catch { /* ignore */ }
      }

      prevMoveCountRef.current = newMoveCount;
      setBoard(newBoard);
      setMoveCount(newMoveCount);

      if (game.winner) {
        const winnerMap: Record<string, Winner> = { WHITE: Winner.WHITE, BLACK: Winner.BLACK, DRAW: Winner.DRAW };
        setResult({ winner: winnerMap[game.winner as string] ?? Winner.DRAW });
      } else if (game.status === "ABORTED") {
        setResult({ winner: null, reason: "aborted" });
      }

      if (game.clockInfo && newMoveCount > 0) {
        const clock = game.clockInfo as { whiteTimeMs: number; blackTimeMs: number; lastMoveAt?: string | Date };
        applyClockSnapshot(clock, newMoveCount % 2 === 0 ? PlayerColor.WHITE : PlayerColor.BLACK);
      }
    } catch (err) {
      console.error("Spectator: failed to fetch game state", err);
    }
  }, [gameId, applyClockSnapshot]);

  /* ── Initial load ───────────────────────────────────────────────────── */
  useEffect(() => {
    fetchGameState();
  }, [fetchGameState]);

  /* ── WebSocket ──────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!socket) return;

    socket.emit("watchGame", gameId);

    const handleReconnect = () => {
      socket.emit("watchGame", gameId);
      fetchGameState();
    };
    socket.on("connect", handleReconnect);

    const handleUpdate = (data?: unknown) => {
      const d = data as Record<string, unknown> | undefined;
      if (!d?.lastMove) {
        fetchGameState();
        return;
      }
      const m = d.lastMove as Record<string, unknown>;
      let incomingMoveNum: number;
      try {
        incomingMoveNum = Number(m.moveNumber);
      } catch {
        fetchGameState();
        return;
      }

      if (incomingMoveNum <= prevMoveCountRef.current) {
        const clock = d?.clockInfo as { whiteTimeMs: number; blackTimeMs: number; lastMoveAt?: string | Date } | undefined;
        if (clock) applyClockSnapshot(clock, incomingMoveNum % 2 === 0 ? PlayerColor.WHITE : PlayerColor.BLACK);
        return;
      }

      if (incomingMoveNum > prevMoveCountRef.current + 1) {
        fetchGameState();
        return;
      }

      try {
        const from = new Position(getPositionValue(m.from));
        const to = new Position(getPositionValue(m.to));
        const capturedSquares = ((m.capturedSquares as unknown[]) ?? []).map(
          (v) => new Position(getPositionValue(v)),
        );
        const move = new Move(
          String(m.id ?? ""),
          gameId,
          incomingMoveNum,
          (m.player as PlayerColor) ?? PlayerColor.WHITE,
          from,
          to,
          capturedSquares,
          Boolean(m.isPromotion),
          String(m.notation ?? ""),
          new Date(),
        );

        setBoard((prevBoard) => {
          try {
            const updated = MkaguziEngine.applyMove(prevBoard, move);
            setMoveCount(incomingMoveNum);
            prevMoveCountRef.current = incomingMoveNum;
            setLastMovePositions({ from: move.from, to: move.to });

            if (move.capturedSquares.length > 0) {
              const capturedColor = move.player === PlayerColor.WHITE ? PlayerColor.BLACK : PlayerColor.WHITE;
              const ghosts: CaptureGhost[] = move.capturedSquares.map((pos) => ({
                id: ++captureGhostIdRef.current,
                index: positionToIndex(pos, flipBoard),
                piece: { color: toUiColor(capturedColor), isKing: undefined },
              }));
              setCapturedGhosts((prev) => [...prev, ...ghosts].slice(-24));
              const cleanupId = window.setTimeout(() => {
                setCapturedGhosts((prev) => prev.filter((g) => !ghosts.some((c) => c.id === g.id)));
                captureCleanupRef.current = captureCleanupRef.current.filter((id) => id !== cleanupId);
              }, 240);
              captureCleanupRef.current.push(cleanupId);
            }

            playMoveSound(
              { from: move.from, to: move.to, capturedCount: move.capturedSquares.length },
              { normal: moveAudioRef.current, long: longMoveAudioRef.current, capture: captureAudioRef.current, multiCapture: multiCaptureAudioRef.current },
            );

            return updated;
          } catch {
            fetchGameState();
            return prevBoard;
          }
        });

        const clock = d?.clockInfo as { whiteTimeMs: number; blackTimeMs: number; lastMoveAt?: string | Date } | undefined;
        if (clock) applyClockSnapshot(clock, incomingMoveNum % 2 === 0 ? PlayerColor.WHITE : PlayerColor.BLACK);

        const winnerStr = d?.winner as string | undefined;
        if (winnerStr) {
          const winnerMap: Record<string, Winner> = { WHITE: Winner.WHITE, BLACK: Winner.BLACK, DRAW: Winner.DRAW };
          const w = winnerMap[winnerStr];
          if (w !== undefined) setResult({ winner: w });
        }
      } catch {
        fetchGameState();
      }
    };

    const handleGameOver = (data: unknown) => {
      const d = data as Record<string, unknown>;
      const winnerMap: Record<string, Winner | null> = { WHITE: Winner.WHITE, BLACK: Winner.BLACK, DRAW: Winner.DRAW };
      const winnerStr = d?.winner as string | null | undefined;
      setResult({
        winner: winnerStr ? winnerMap[winnerStr] ?? null : null,
        reason: (d?.reason as string | undefined) ?? "aborted",
      });
      fetchGameState();
    };

    socket.on("gameStateUpdated", handleUpdate);
    socket.on("gameOver", handleGameOver);

    return () => {
      socket.off("connect", handleReconnect);
      socket.off("gameStateUpdated", handleUpdate);
      socket.off("gameOver", handleGameOver);
    };
  }, [socket, gameId, fetchGameState, applyClockSnapshot]);

  /* ── Audio ─────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const move = new Audio("/sfx/move-tap.wav"); move.preload = "auto"; move.volume = 0.48; moveAudioRef.current = move;
    const long = new Audio("/sfx/move-slide.wav"); long.preload = "auto"; long.volume = 0.52; longMoveAudioRef.current = long;
    const cap = new Audio("/sfx/move-capture.wav"); cap.preload = "auto"; cap.volume = 0.6; captureAudioRef.current = cap;
    const multi = new Audio("/sfx/move-knock-real.wav"); multi.preload = "auto"; multi.volume = 0.62; multiCaptureAudioRef.current = multi;
    return () => {
      moveAudioRef.current = null;
      longMoveAudioRef.current = null;
      captureAudioRef.current = null;
      multiCaptureAudioRef.current = null;
      for (const id of captureCleanupRef.current) window.clearTimeout(id);
      captureCleanupRef.current = [];
    };
  }, []);

  /* ── Clock countdown (50ms tick, spectator-safe — never emits claimTimeout) */
  useEffect(() => {
    const id = window.setInterval(() => {
      if (!serverClockRef.current || resultRef.current || !isActiveRef.current || prevMoveCountRef.current === 0) return;
      const elapsed = Date.now() - serverClockRef.current.receivedAt;
      const activeColor = currentPlayerRef.current === PlayerColor.WHITE ? "WHITE" : "BLACK";
      const other = activeColor === "WHITE" ? "BLACK" : "WHITE";
      setTimeLeft({
        [activeColor]: Math.max(0, serverClockRef.current[activeColor] - elapsed),
        [other]: serverClockRef.current[other],
      } as { WHITE: number; BLACK: number });
    }, 50);
    return () => clearInterval(id);
  }, []);

  useEffect(() => { currentPlayerRef.current = currentPlayer; }, [currentPlayer]);
  useEffect(() => { resultRef.current = result; }, [result]);
  useEffect(() => {
    isActiveRef.current = gameData?.status === "ACTIVE";
  }, [gameData]);

  const isActive = gameData?.status === "ACTIVE";

  return {
    state: {
      board,
      currentPlayer,
      moveCount,
      result,
      timeLeft,
      isActive,
      gameData,
      players,
    } as SpectatorGameState,
    pieces,
    lastMove,
    capturedGhosts,
    flipBoard,
    refetch: fetchGameState,
  };
};
