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
  result: { winner: Winner } | null;
  timeLeft: { WHITE: number; BLACK: number } | null;
  isWaiting: boolean;
  isSubmitting: boolean;
  error: string | null;
  drawOffer: DrawOfferState;
  /** False when the opponent's WebSocket disconnected (reconnect timer running). */
  opponentConnected: boolean;
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
  const [result, setResult] = useState<{ winner: Winner } | null>(null);
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

  const [drawOffer, setDrawOffer] = useState<DrawOfferState>({
    offeredByUserId: null,
  });
  const [opponentConnected, setOpponentConnected] = useState(true);
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
    return !gameData.blackPlayerId;
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
      }
      // If game.winner is null we leave the existing result in place;
      // this prevents a race-condition fetch from dismissing the result card.

      // Update clock
      if (game.clockInfo) {
        const clock = game.clockInfo as {
          whiteTimeMs: number;
          blackTimeMs: number;
        };
        setTimeLeft({
          WHITE: Math.floor(clock.whiteTimeMs / 1000),
          BLACK: Math.floor(clock.blackTimeMs / 1000),
        });
      }
    } catch (err) {
      console.error("Failed to fetch game state:", err);
    }
  }, [gameId, flipBoard]);

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
          | { whiteTimeMs: number; blackTimeMs: number }
          | undefined;
        if (clock) {
          setTimeLeft({
            WHITE: Math.floor(clock.whiteTimeMs / 1000),
            BLACK: Math.floor(clock.blackTimeMs / 1000),
          });
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
          | { whiteTimeMs: number; blackTimeMs: number }
          | undefined;
        if (clock) {
          setTimeLeft({
            WHITE: Math.floor(clock.whiteTimeMs / 1000),
            BLACK: Math.floor(clock.blackTimeMs / 1000),
          });
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
      if (d?.winner) {
        setResult({ winner: winnerMap[d.winner as string] ?? Winner.DRAW });
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

    const handleOpponentDisconnected = () => {
      setOpponentConnected(false);
    };

    const handleOpponentReconnected = () => {
      setOpponentConnected(true);
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
    socket.on("gameOver", (data: unknown) => {
      handleGameOver(data);
      // Game is over — restore connected state so banner disappears
      setOpponentConnected(true);
    });
    socket.on("drawOffered", handleDrawOffered);
    socket.on("drawDeclined", handleDrawDeclined);
    socket.on("drawCancelled", handleDrawCancelled);
    socket.on("opponentDisconnected", handleOpponentDisconnected);
    socket.on("opponentReconnected", handleOpponentReconnected);
    socket.on("rematchOffered", handleRematchOffered);
    socket.on("rematchAccepted", handleRematchAccepted);
    socket.on("rematchDeclined", handleRematchDeclined);
    socket.on("rematchCancelled", handleRematchCancelled);

    return () => {
      socket.off("gameStateUpdated", handleUpdate);
      socket.off("gameOver", handleGameOver);
      socket.off("drawOffered", handleDrawOffered);
      socket.off("drawDeclined", handleDrawDeclined);
      socket.off("drawCancelled", handleDrawCancelled);
      socket.off("opponentDisconnected", handleOpponentDisconnected);
      socket.off("opponentReconnected", handleOpponentReconnected);
      socket.off("rematchOffered", handleRematchOffered);
      socket.off("rematchAccepted", handleRematchAccepted);
      socket.off("rematchDeclined", handleRematchDeclined);
      socket.off("rematchCancelled", handleRematchCancelled);
    };
  }, [socket, gameId, fetchGameState, flipBoard]);

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
      } catch (err: unknown) {
        const msg =
          (err as { response?: { data?: { message?: string } } })?.response
            ?.data?.message ?? "Move failed";
        setError(msg);
        fetchGameState();
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      result,
      currentPlayer,
      myColor,
      isSubmitting,
      flipBoard,
      gameId,
      board,
      moveCount,
      fetchGameState,
      socket,
    ],
  );

  /* ── Draw offer actions ─────────────────────────────────────────────── */

  const offerDraw = useCallback(() => {
    if (!socket || !gameId) return;
    socket.emit("offerDraw", { gameId });
  }, [socket, gameId]);

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
      isSubmitting,
      error,
      drawOffer,
      opponentConnected,
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
    offerDraw,
    acceptDraw,
    declineDraw,
    cancelDraw,
    offerRematch,
    acceptRematch,
    declineRematch,
    cancelRematch,
    refetch: fetchGameState,
  };
};
