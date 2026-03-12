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
import { useAuthStore } from "@/lib/auth/auth-store";
import { gameService } from "@/services/game.service";
import { useSocket } from "@/hooks/useSocket";

export interface DrawOfferState {
  /** userId who sent the offer, or null if none pending */
  offeredByUserId: string | null;
}

export interface RematchOfferState {
  /** userId who sent the rematch offer, or null if none pending */
  offeredByUserId: string | null;
}

export interface OnlineGameState {
  board: BoardState;
  currentPlayer: PlayerColor;
  myColor: PlayerColor | null;
  moveCount: number;
  result: { winner: Winner; reason?: string } | null;
  /** Time remaining in **milliseconds** for each player. */
  timeLeft: { WHITE: number; BLACK: number } | null;
  isWaiting: boolean;
  bothPlayersPresent: boolean;
  isSubmitting: boolean;
  error: string | null;
  drawOffer: DrawOfferState;
  /** False when the opponent's WebSocket disconnected (reconnect timer running). */
  opponentConnected: boolean;
  /** Seconds until the disconnected opponent is auto-resigned (null = not disconnected). */
  disconnectSecondsRemaining: number | null;
  rematchOffer: RematchOfferState;
  /** Set to the new game ID when rematch is accepted; page should navigate here. */
  rematchNewGameId: string | null;
}

/* ─── Helpers ────────────────────────────────────────────────────────────── */

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

/* ─── Reconstruct board from backend moves ─────────────────────────────── */
const reconstructBoard = (rawMoves: unknown[]): BoardState => {
  let board = CakeEngine.createInitialState();
  for (const raw of rawMoves) {
    const m = raw as Record<string, unknown>;
    try {
      const fromVal = getPositionValue(m.from);
      const toVal = getPositionValue(m.to);
      const capturedVals = (m.capturedSquares as unknown[]).map(
        getPositionValue,
      );
      const from = new Position(fromVal);
      const to = new Position(toVal);
      const capturedSquares = capturedVals.map((v) => new Position(v));
      const isPromotion = Boolean(m.isPromotion);
      const notation = String(m.notation ?? "");
      const move = new Move(
        String(m.id ?? ""),
        String(m.gameId ?? ""),
        Number(m.moveNumber ?? 0),
        (m.player as PlayerColor) ?? PlayerColor.WHITE,
        from,
        to,
        capturedSquares,
        isPromotion,
        notation,
        new Date(),
      );
      board = CakeEngine.applyMove(board, move);
    } catch {
      // Skip malformed moves
    }
  }
  return board;
};

/* ─── Hook ──────────────────────────────────────────────────────────────── */

export const useOnlineGame = (gameId: string) => {
  const { user } = useAuthStore();
  const { socket } = useSocket();

  const [gameData, setGameData] = useState<Record<string, unknown> | null>(
    null,
  );
  const [players, setPlayers] = useState<{
    white: Record<string, unknown> | null;
    black: Record<string, unknown> | null;
  }>({ white: null, black: null });
  const [board, setBoard] = useState<BoardState>(() =>
    CakeEngine.createInitialState(),
  );
  const [moveCount, setMoveCount] = useState(0);
  const [result, setResult] = useState<{
    winner: Winner;
    reason?: string;
  } | null>(null);
  const [autoRequeue, setAutoRequeue] = useState<{ timeMs: number } | null>(null);
  const [timeLeft, setTimeLeft] = useState<{
    WHITE: number;
    BLACK: number;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastMovePositions, setLastMovePositions] = useState<{
    from: Position;
    to: Position;
  } | null>(null);
  const [capturedGhosts, setCapturedGhosts] = useState<CaptureGhost[]>([]);

  const captureCleanupRef = useRef<number[]>([]);
  const captureGhostIdRef = useRef(0);
  const moveAudioRef = useRef<HTMLAudioElement | null>(null);
  const prevMoveCountRef = useRef(0);

  // Clock refs — WHITE/BLACK stored in milliseconds for sub-second scheduling precision
  const serverClockRef = useRef<{
    WHITE: number;
    BLACK: number;
    receivedAt: number;
  } | null>(null);
  const currentPlayerRef = useRef<PlayerColor>(PlayerColor.WHITE);
  const resultRef = useRef<{ winner: Winner; reason?: string } | null>(null);
  const isWaitingRef = useRef<boolean>(true);
  const clockTimerRef = useRef<number | null>(null);
  // Stable refs for use inside the 50ms clock interval closure
  const socketRef = useRef<typeof socket>(null);
  const gameIdRef = useRef<string>(gameId);

  const [drawOffer, setDrawOffer] = useState<DrawOfferState>({
    offeredByUserId: null,
  });
  const [opponentConnected, setOpponentConnected] = useState(true);
  const [disconnectSecondsRemaining, setDisconnectSecondsRemaining] = useState<
    number | null
  >(null);
  const disconnectCountdownRef = useRef<number | null>(null);
  const claimedTimeoutRef = useRef(false);
  const [rematchOffer, setRematchOffer] = useState<RematchOfferState>({
    offeredByUserId: null,
  });
  const [rematchNewGameId, setRematchNewGameId] = useState<string | null>(null);

  // Determine my color from game data
  const myColor = useMemo<PlayerColor | null>(() => {
    if (!gameData || !user) return null;
    if (gameData.whitePlayerId === user.id) return PlayerColor.WHITE;
    if (gameData.blackPlayerId === user.id) return PlayerColor.BLACK;
    return null;
  }, [gameData, user]);

  const isWaiting = useMemo(() => {
    if (!gameData) return true;
    return gameData.status === "WAITING";
  }, [gameData]);

  const bothPlayersPresent = useMemo(() => {
    if (!gameData) return false;
    return gameData.whitePlayerId !== null && gameData.blackPlayerId !== null;
  }, [gameData]);

  // White starts at engine rows 0-2 (top); flip so White sees own pieces at bottom.
  // Black starts at engine rows 5-7 which are already at the screen bottom (no flip needed).
  // Spectators see board from Black's natural orientation (no flip).
  const flipBoard = myColor === PlayerColor.WHITE;

  // Infer current player from move count (WHITE goes first)
  const currentPlayer = useMemo(
    () => (moveCount % 2 === 0 ? PlayerColor.WHITE : PlayerColor.BLACK),
    [moveCount],
  );

  const pieces = useMemo(
    () => boardToUiPieces(board, flipBoard),
    [board, flipBoard],
  );

  const legalMoves = useMemo(() => {
    if (currentPlayer !== myColor) return {};
    const map: Record<number, number[]> = {};
    const allMoves = CakeEngine.generateLegalMoves(
      board,
      currentPlayer,
      moveCount,
    );
    for (const move of allMoves) {
      const fromIdx = positionToIndex(move.from, flipBoard);
      const toIdx = positionToIndex(move.to, flipBoard);
      if (!map[fromIdx]) map[fromIdx] = [];
      map[fromIdx].push(toIdx);
    }
    return map;
  }, [board, currentPlayer, myColor, moveCount, flipBoard]);

  const forcedPieces = useMemo(() => {
    if (currentPlayer !== myColor) return [];
    const allMoves = CakeEngine.generateLegalMoves(
      board,
      currentPlayer,
      moveCount,
    );
    const captures = allMoves.filter((m) => m.capturedSquares.length > 0);
    if (captures.length === 0) return [];
    const set = new Set<number>();
    for (const move of captures) {
      set.add(positionToIndex(move.from, flipBoard));
    }
    return Array.from(set);
  }, [board, currentPlayer, myColor, moveCount, flipBoard]);

  const lastMove: LastMoveState = useMemo(
    () =>
      lastMovePositions
        ? {
            from: positionToIndex(lastMovePositions.from, flipBoard),
            to: positionToIndex(lastMovePositions.to, flipBoard),
          }
        : null,
    [lastMovePositions, flipBoard],
  );

  const applyClockSnapshot = useCallback(
    (
      clock: {
        whiteTimeMs: number;
        blackTimeMs: number;
        lastMoveAt?: string | Date;
      },
      activeColor: PlayerColor,
    ) => {
      // Keep full millisecond precision — the UI will round/format as needed.
      const baseWhiteMs = Number(clock.whiteTimeMs);
      const baseBlackMs = Number(clock.blackTimeMs);

      let whiteMs = baseWhiteMs;
      let blackMs = baseBlackMs;
      const lm =
        clock.lastMoveAt !== undefined
          ? new Date(clock.lastMoveAt).getTime()
          : NaN;
      if (!Number.isNaN(lm)) {
        const elapsed = Math.max(0, Date.now() - lm);
        if (activeColor === PlayerColor.WHITE) {
          whiteMs = Math.max(0, baseWhiteMs - elapsed);
        } else {
          blackMs = Math.max(0, baseBlackMs - elapsed);
        }
      }

      serverClockRef.current = {
        WHITE: whiteMs,
        BLACK: blackMs,
        receivedAt: Date.now(),
      };
      // A new move arrived — allow claimTimeout to be emitted again if needed
      claimedTimeoutRef.current = false;
      setTimeLeft({ WHITE: whiteMs, BLACK: blackMs });
    },
    [],
  );

  /* ── Fetch game state from API ──────────────────────────────────────── */
  const fetchGameState = useCallback(async () => {
    try {
      const res = await gameService.getGame(gameId);
      const { game, moves, players: playersData } = res.data;

      setGameData(game);
      if (playersData)
        setPlayers(
          playersData as {
            white: Record<string, unknown> | null;
            black: Record<string, unknown> | null;
          },
        );

      const newBoard = reconstructBoard(moves ?? []);
      const newMoveCount = (moves ?? []).length;

      // Compute capture ghosts for the newly arrived move
      if (newMoveCount > prevMoveCountRef.current && (moves ?? []).length > 0) {
        const lastRaw = (moves as unknown[])[moves.length - 1] as Record<
          string,
          unknown
        >;
        try {
          const toVal = getPositionValue(lastRaw.to);
          const fromVal = getPositionValue(lastRaw.from);
          setLastMovePositions({
            from: new Position(fromVal),
            to: new Position(toVal),
          });

          const capturedVals = (
            (lastRaw.capturedSquares as unknown[]) ?? []
          ).map(getPositionValue);
          if (capturedVals.length > 0) {
            const ghosts: CaptureGhost[] = capturedVals.map((v) => {
              const pos = new Position(v);
              // The captured piece was of the OPPONENT's color
              const movePlayer =
                (lastRaw.player as PlayerColor) ?? PlayerColor.WHITE;
              const capturedColor =
                movePlayer === PlayerColor.WHITE
                  ? PlayerColor.BLACK
                  : PlayerColor.WHITE;
              return {
                id: ++captureGhostIdRef.current,
                index: positionToIndex(pos, flipBoard),
                piece: { color: toUiColor(capturedColor), isKing: undefined },
              };
            });
            setCapturedGhosts((prev) => [...prev, ...ghosts].slice(-24));
            const cleanupId = window.setTimeout(() => {
              setCapturedGhosts((prev) =>
                prev.filter((g) => !ghosts.some((c) => c.id === g.id)),
              );
              captureCleanupRef.current = captureCleanupRef.current.filter(
                (id) => id !== cleanupId,
              );
            }, 240);
            captureCleanupRef.current.push(cleanupId);
          }
        } catch {
          // Ignore ghost errors
        }

        if (moveAudioRef.current) {
          moveAudioRef.current.currentTime = 0;
          moveAudioRef.current.play().catch(() => {});
        }
      }

      prevMoveCountRef.current = newMoveCount;
      setBoard(newBoard);
      setMoveCount(newMoveCount);

      // Check result — once a result is set, never clear it via a sync.
      if (game.winner) {
        const winnerMap: Record<string, Winner> = {
          WHITE: Winner.WHITE,
          BLACK: Winner.BLACK,
          DRAW: Winner.DRAW,
        };
        setResult({ winner: winnerMap[game.winner as string] ?? Winner.DRAW });
      } else if (game.status === "ABORTED") {
        setResult({ winner: Winner.DRAW, reason: "aborted" });
      }
      // If game.winner is null and not aborted we leave the existing result in place;
      // this prevents a race-condition fetch from dismissing the result card.

      // Update clock — write server snapshot so the countdown interval can interpolate.
      // Before the first move the clock hasn't truly started — show full initial time.
      if (game.clockInfo) {
        const clock = game.clockInfo as {
          whiteTimeMs: number;
          blackTimeMs: number;
          lastMoveAt?: string | Date;
        };
        const activeColor =
          newMoveCount % 2 === 0 ? PlayerColor.WHITE : PlayerColor.BLACK;
        const clockForSnapshot =
          newMoveCount === 0 ? { ...clock, lastMoveAt: undefined } : clock;
        applyClockSnapshot(clockForSnapshot, activeColor);
      }
    } catch (err) {
      console.error("Failed to fetch game state:", err);
    }
  }, [applyClockSnapshot, gameId, flipBoard]);

  /* ── Initial load ──────────────────────────────────────────────────── */
  useEffect(() => {
    fetchGameState();
  }, [fetchGameState]);

  /* ── WebSocket: join room + listen ─────────────────────────────────── */
  useEffect(() => {
    if (!socket) return;

    socket.emit("joinGame", gameId);

    const handleUpdate = (data?: unknown) => {
      const d = data as Record<string, unknown> | undefined;

      // No move data → state change event (e.g. opponent joined). Full sync needed.
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
        // Our own move echoed back — already applied optimistically.
        // Still extract clock so timers stay in sync.
        const clock = d?.clockInfo as
          | {
              whiteTimeMs: number;
              blackTimeMs: number;
              lastMoveAt?: string | Date;
            }
          | undefined;
        if (clock) {
          const activeColor =
            incomingMoveNum % 2 === 0 ? PlayerColor.WHITE : PlayerColor.BLACK;
          applyClockSnapshot(clock, activeColor);
        }
        // Also check if our move ended the game (e.g. stalemate, draw).
        // The backend sends winner in the same gameStateUpdated payload.
        const winnerStrEcho = d?.winner as string | undefined;
        if (winnerStrEcho) {
          const winnerMapEcho: Record<string, Winner> = {
            WHITE: Winner.WHITE,
            BLACK: Winner.BLACK,
            DRAW: Winner.DRAW,
          };
          const w = winnerMapEcho[winnerStrEcho];
          if (w !== undefined) setResult({ winner: w });
        }
        return;
      }

      if (incomingMoveNum > prevMoveCountRef.current + 1) {
        // We missed one or more moves — fall back to HTTP to re-sync.
        fetchGameState();
        return;
      }

      // incomingMoveNum === prevMoveCountRef.current + 1: opponent's move — apply via WS.
      try {
        const fromVal = getPositionValue(m.from);
        const toVal = getPositionValue(m.to);
        const capturedVals = ((m.capturedSquares as unknown[]) ?? []).map(
          getPositionValue,
        );

        const from = new Position(fromVal);
        const to = new Position(toVal);
        const capturedSquares = capturedVals.map((v) => new Position(v));

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
            const updatedBoard = CakeEngine.applyMove(prevBoard, move);

            setMoveCount(incomingMoveNum);
            prevMoveCountRef.current = incomingMoveNum;
            setLastMovePositions({ from: move.from, to: move.to });

            if (move.capturedSquares.length > 0) {
              const capturedColor =
                move.player === PlayerColor.WHITE
                  ? PlayerColor.BLACK
                  : PlayerColor.WHITE;
              const ghosts: CaptureGhost[] = move.capturedSquares.map(
                (pos) => ({
                  id: ++captureGhostIdRef.current,
                  index: positionToIndex(pos, flipBoard),
                  piece: {
                    color: toUiColor(capturedColor),
                    isKing: undefined,
                  },
                }),
              );
              setCapturedGhosts((prevGhosts) =>
                [...prevGhosts, ...ghosts].slice(-24),
              );
              const cleanupId = window.setTimeout(() => {
                setCapturedGhosts((prevGhosts) =>
                  prevGhosts.filter((g) => !ghosts.some((c) => c.id === g.id)),
                );
                captureCleanupRef.current = captureCleanupRef.current.filter(
                  (id) => id !== cleanupId,
                );
              }, 240);
              captureCleanupRef.current.push(cleanupId);
            }

            if (moveAudioRef.current) {
              moveAudioRef.current.currentTime = 0;
              moveAudioRef.current.play().catch(() => {});
            }

            return updatedBoard;
          } catch {
            // Apply failed (shouldn't happen) — fall back to HTTP
            fetchGameState();
            return prevBoard;
          }
        });
        // Extract clock and winner from WS payload so we don't need HTTP for that.
        const clock = d?.clockInfo as
          | {
              whiteTimeMs: number;
              blackTimeMs: number;
              lastMoveAt?: string | Date;
            }
          | undefined;
        if (clock) {
          const activeColor =
            incomingMoveNum % 2 === 0 ? PlayerColor.WHITE : PlayerColor.BLACK;
          applyClockSnapshot(clock, activeColor);
        }
        const winnerStr = d?.winner as string | undefined;
        if (winnerStr) {
          const winnerMap: Record<string, Winner> = {
            WHITE: Winner.WHITE,
            BLACK: Winner.BLACK,
            DRAW: Winner.DRAW,
          };
          const w = winnerMap[winnerStr];
          if (w !== undefined) setResult({ winner: w });
        }
      } catch {
        // Parse error — fall back to HTTP
        fetchGameState();
      }
    };

    const handleGameOver = (data: unknown) => {
      const d = data as Record<string, unknown>;
      const winnerMap: Record<string, Winner> = {
        WHITE: Winner.WHITE,
        BLACK: Winner.BLACK,
        DRAW: Winner.DRAW,
      };
      const winnerStr = d?.winner as string | null | undefined;
      if (winnerStr) {
        // Normal game-over: timeout, resign, draw, abandon…
        setResult({
          winner: winnerMap[winnerStr] ?? Winner.DRAW,
          reason: d.reason as string | undefined,
        });
      } else {
        // winner is null/undefined — treat as aborted (or fall back to HTTP)
        setResult({
          winner: Winner.DRAW, // no winner for aborted games
          reason: (d?.reason as string | undefined) ?? "aborted",
        });
      }
    };

    const handleDrawOffered = (data: { offeredByUserId: string }) => {
      setDrawOffer({ offeredByUserId: data.offeredByUserId });
    };

    const handleDrawDeclined = () => {
      setDrawOffer({ offeredByUserId: null });
    };

    const handleDrawCancelled = () => {
      setDrawOffer({ offeredByUserId: null });
    };

    const handleOpponentDisconnected = (data: {
      userId: string;
      secondsRemaining?: number;
    }) => {
      setOpponentConnected(false);
      const secs = data.secondsRemaining ?? 60;
      setDisconnectSecondsRemaining(secs);

      // Start a local 1-second decrement so the countdown is smooth without
      // waiting for every server tick.
      if (disconnectCountdownRef.current !== null) {
        window.clearInterval(disconnectCountdownRef.current);
      }
      disconnectCountdownRef.current = window.setInterval(() => {
        setDisconnectSecondsRemaining((prev) => {
          if (prev === null || prev <= 1) {
            window.clearInterval(disconnectCountdownRef.current!);
            disconnectCountdownRef.current = null;
            return null;
          }
          return prev - 1;
        });
      }, 1000);
    };

    const handleOpponentDisconnectCountdown = (data: {
      userId: string;
      secondsRemaining: number;
    }) => {
      // Sync to authoritative server value (avoids drift)
      setDisconnectSecondsRemaining(data.secondsRemaining);
    };

    const handleOpponentReconnected = () => {
      setOpponentConnected(true);
      if (disconnectCountdownRef.current !== null) {
        window.clearInterval(disconnectCountdownRef.current);
        disconnectCountdownRef.current = null;
      }
      setDisconnectSecondsRemaining(null);
    };

    const handleRematchOffered = (data: { offeredByUserId: string }) => {
      setRematchOffer({ offeredByUserId: data.offeredByUserId });
    };

    const handleRematchAccepted = (data: { newGameId: string }) => {
      setRematchNewGameId(data.newGameId);
    };

    const handleRematchDeclined = () => {
      setRematchOffer({ offeredByUserId: null });
    };

    const handleRematchCancelled = () => {
      setRematchOffer({ offeredByUserId: null });
    };

    socket.on("gameStateUpdated", handleUpdate);
    const handleGameOverEvent = (data: unknown) => {
      handleGameOver(data);
      // Game is over — restore connected/disconnect state so banners disappear
      setOpponentConnected(true);
      if (disconnectCountdownRef.current !== null) {
        window.clearInterval(disconnectCountdownRef.current);
        disconnectCountdownRef.current = null;
      }
      setDisconnectSecondsRemaining(null);
    };
    const handleAutoRequeue = (data: { timeMs: number }) => {
      setAutoRequeue({ timeMs: data.timeMs });
    };

    socket.on("gameOver", handleGameOverEvent);
    socket.on("drawOffered", handleDrawOffered);
    socket.on("drawDeclined", handleDrawDeclined);
    socket.on("drawCancelled", handleDrawCancelled);
    socket.on("opponentDisconnected", handleOpponentDisconnected);
    socket.on("opponentDisconnectCountdown", handleOpponentDisconnectCountdown);
    socket.on("opponentReconnected", handleOpponentReconnected);
    socket.on("rematchOffered", handleRematchOffered);
    socket.on("rematchAccepted", handleRematchAccepted);
    socket.on("rematchDeclined", handleRematchDeclined);
    socket.on("rematchCancelled", handleRematchCancelled);
    socket.on("autoRequeue", handleAutoRequeue);

    return () => {
      socket.off("gameStateUpdated", handleUpdate);
      socket.off("gameOver", handleGameOverEvent);
      socket.off("drawOffered", handleDrawOffered);
      socket.off("drawDeclined", handleDrawDeclined);
      socket.off("drawCancelled", handleDrawCancelled);
      socket.off("opponentDisconnected", handleOpponentDisconnected);
      socket.off(
        "opponentDisconnectCountdown",
        handleOpponentDisconnectCountdown,
      );
      socket.off("opponentReconnected", handleOpponentReconnected);
      socket.off("rematchOffered", handleRematchOffered);
      socket.off("rematchAccepted", handleRematchAccepted);
      socket.off("rematchDeclined", handleRematchDeclined);
      socket.off("rematchCancelled", handleRematchCancelled);
      socket.off("autoRequeue", handleAutoRequeue);
    };
  }, [socket, gameId, fetchGameState, flipBoard, applyClockSnapshot]);

  /* ── Audio ─────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const moveAudio = new Audio("/sfx/move1.mp3");
    moveAudio.preload = "auto";
    moveAudio.volume = 0.4;
    moveAudioRef.current = moveAudio;
    return () => {
      moveAudioRef.current = null;
      for (const id of captureCleanupRef.current) window.clearTimeout(id);
      captureCleanupRef.current = [];
    };
  }, []);

  /* ── Keep clock refs in sync with state (used inside the interval) ── */
  useEffect(() => {
    currentPlayerRef.current = currentPlayer;
  }, [currentPlayer]);
  useEffect(() => {
    resultRef.current = result;
  }, [result]);
  useEffect(() => {
    isWaitingRef.current = isWaiting;
  }, [isWaiting]);
  // Keep stable refs for the 50ms closure in sync
  useEffect(() => {
    socketRef.current = socket;
  }, [socket]);
  useEffect(() => {
    gameIdRef.current = gameId;
  }, [gameId]);

  /* ── Persistent client-side countdown (chess.com technique) ─────── */
  // Ticks at 50 ms for sub-second smoothness. Interpolates from the last
  // server-provided snapshot (stored in ms). Resets on every move.
  useEffect(() => {
    const id = window.setInterval(() => {
      // Don't tick before the first move — the clock only starts running after
      // white's first move so neither player loses time while reading the board.
      if (
        !serverClockRef.current ||
        resultRef.current ||
        isWaitingRef.current ||
        prevMoveCountRef.current === 0
      )
        return;
      const elapsedMs = Date.now() - serverClockRef.current.receivedAt;
      const activeColor =
        currentPlayerRef.current === PlayerColor.WHITE ? "WHITE" : "BLACK";
      const otherColor = activeColor === "WHITE" ? "BLACK" : "WHITE";
      const activeMs = Math.max(
        0,
        serverClockRef.current[activeColor] - elapsedMs,
      );

      setTimeLeft({
        [activeColor]: activeMs,
        [otherColor]: serverClockRef.current[otherColor],
      } as { WHITE: number; BLACK: number });

      // Emit a timeout claim when the active player's clock hits zero
      if (activeMs <= 0 && !claimedTimeoutRef.current && socketRef.current) {
        claimedTimeoutRef.current = true;
        socketRef.current.emit("claimTimeout", { gameId: gameIdRef.current });
      }
    }, 50);
    return () => clearInterval(id);
  }, []); // intentionally empty — runs once, reads only stable refs

  /* ── Submit a move (with optimistic update) ────────────────────────── */
  const makeMove = useCallback(
    async (fromIndex: number, toIndex: number) => {
      if (result) return;
      if (currentPlayer !== myColor) return;
      if (isSubmitting) return;

      const from = indexToPosition(fromIndex, flipBoard);
      const to = indexToPosition(toIndex, flipBoard);
      if (!from || !to) return;

      // ── Optimistic update ───────────────────────────────────────────
      // Find the matching legal move so we can apply it instantly before
      // the server confirms, giving a completely lag-free feel.
      const allMoves = CakeEngine.generateLegalMoves(
        board,
        currentPlayer,
        moveCount,
      );
      const matchingMove = allMoves.find(
        (m) => m.from.value === from.value && m.to.value === to.value,
      );

      if (matchingMove) {
        const newBoard = CakeEngine.applyMove(board, matchingMove);
        const newMoveCount = moveCount + 1;

        setBoard(newBoard);
        setMoveCount(newMoveCount);
        setLastMovePositions({ from: matchingMove.from, to: matchingMove.to });
        // Advance ref so fetchGameState won't double-emit ghosts/audio
        prevMoveCountRef.current = newMoveCount;

        // Capture ghost animations
        if (matchingMove.capturedSquares.length > 0) {
          const capturedColor =
            currentPlayer === PlayerColor.WHITE
              ? PlayerColor.BLACK
              : PlayerColor.WHITE;
          const ghosts: CaptureGhost[] = matchingMove.capturedSquares.map(
            (pos) => ({
              id: ++captureGhostIdRef.current,
              index: positionToIndex(pos, flipBoard),
              piece: { color: toUiColor(capturedColor), isKing: undefined },
            }),
          );
          setCapturedGhosts((prev) => [...prev, ...ghosts].slice(-24));
          const cleanupId = window.setTimeout(() => {
            setCapturedGhosts((prev) =>
              prev.filter((g) => !ghosts.some((c) => c.id === g.id)),
            );
            captureCleanupRef.current = captureCleanupRef.current.filter(
              (id) => id !== cleanupId,
            );
          }, 240);
          captureCleanupRef.current.push(cleanupId);
        }

        // Move sound
        if (moveAudioRef.current) {
          moveAudioRef.current.currentTime = 0;
          moveAudioRef.current.play().catch(() => {});
        }
      }
      // ── End optimistic update ───────────────────────────────────────

      setError(null);
      setIsSubmitting(true);

      try {
        if (socket) {
          // WebSocket path — fastest: single round-trip on the existing connection.
          // emitWithAck returns the acknowledgment object from the server handler.
          const ack = await socket.emitWithAck("makeMove", {
            gameId,
            from: from.value,
            to: to.value,
          });
          if (ack?.error) {
            setError(ack.error);
            fetchGameState(); // roll back optimistic update
          }
        } else {
          // Fallback: HTTP (e.g. socket not yet connected)
          await gameService.makeMove(gameId, from.value, to.value);
        }
      } catch (err) {
        setError("Failed to make move. Please try again.");
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      board,
      currentPlayer,
      myColor,
      moveCount,
      gameId,
      result,
      isSubmitting,
      flipBoard,
      fetchGameState,
      socket,
    ],
  );

  /* ── Submit start game (host only) ─────────────────────────────────── */
  const startGame = useCallback(async () => {
    if (!isWaiting || !bothPlayersPresent || myColor === null) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await gameService.startGame(gameId);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to start game.");
    } finally {
      setIsSubmitting(false);
    }
  }, [isWaiting, bothPlayersPresent, myColor, gameId]);

  /* ── Draw offer actions ─────────────────────────────────────────────── */

  const offerDraw = useCallback(async () => {
    if (result || !myColor || !socket) return;
    setError(null);
    try {
      const ack = await socket.emitWithAck("offerDraw", { gameId });
      if (ack?.error) {
        setError(ack.error);
        return;
      }
      if (user?.id) {
        setDrawOffer({ offeredByUserId: user.id });
      }
    } catch {
      setError("Failed to offer draw.");
    }
  }, [gameId, result, myColor, socket, user?.id]);

  const acceptDraw = useCallback(() => {
    if (!socket || !gameId) return;
    socket.emit("acceptDraw", { gameId });
    setDrawOffer({ offeredByUserId: null });
  }, [socket, gameId]);

  const declineDraw = useCallback(() => {
    if (!socket || !gameId) return;
    socket.emit("declineDraw", { gameId });
    setDrawOffer({ offeredByUserId: null });
  }, [socket, gameId]);

  const cancelDraw = useCallback(() => {
    if (!socket || !gameId) return;
    socket.emit("cancelDraw", { gameId });
    setDrawOffer({ offeredByUserId: null });
  }, [socket, gameId]);

  const offerRematch = useCallback(() => {
    if (!socket || !gameId) return;
    socket.emit("offerRematch", { gameId });
    setRematchOffer({ offeredByUserId: "self" }); // optimistic — replaced by WS event
  }, [socket, gameId]);

  const acceptRematch = useCallback(() => {
    if (!socket || !gameId) return;
    socket.emit("acceptRematch", { gameId });
  }, [socket, gameId]);

  const declineRematch = useCallback(() => {
    if (!socket || !gameId) return;
    socket.emit("declineRematch", { gameId });
    setRematchOffer({ offeredByUserId: null });
  }, [socket, gameId]);

  const cancelRematch = useCallback(() => {
    if (!socket || !gameId) return;
    socket.emit("cancelRematch", { gameId });
    setRematchOffer({ offeredByUserId: null });
  }, [socket, gameId]);

  return {
    state: {
      board,
      currentPlayer,
      myColor,
      moveCount,
      result,
      timeLeft,
      isWaiting,
      bothPlayersPresent,
      isSubmitting,
      error,
      drawOffer,
      opponentConnected,
      disconnectSecondsRemaining,
      rematchOffer,
      rematchNewGameId,
    } as OnlineGameState,
    gameData,
    players,
    pieces,
    lastMove,
    capturedGhosts,
    legalMoves,
    forcedPieces,
    flipBoard,
    makeMove,
    startGame,
    offerDraw,
    acceptDraw,
    declineDraw,
    cancelDraw,
    offerRematch,
    acceptRematch,
    declineRematch,
    cancelRematch,
    refetch: fetchGameState,
    autoRequeue,
  };
};
