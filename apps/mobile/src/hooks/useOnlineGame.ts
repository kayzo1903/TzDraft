import { useCallback, useEffect, useRef, useState } from "react";
import { BoardState, PlayerColor, Position } from "@tzdraft/mkaguzi-engine";
import { useMkaguzi } from "../lib/game/mkaguzi-mobile";
import type { RawMove } from "../lib/game/bridge-types";
import { matchService } from "../lib/match-service";
import { useAuthStore } from "../auth/auth-store";
import { useSocket } from "./useSocket";

const INITIAL_FEN =
  "W:W1,2,3,4,5,6,7,8,9,10,11,12:B21,22,23,24,25,26,27,28,29,30,31,32";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getPositionValue(p: unknown): number {
  if (typeof p === "number") return p;
  const obj = p as Record<string, unknown>;
  if (typeof obj?._value === "number") return obj._value;
  if (typeof obj?.value === "number") return obj.value as number;
  throw new Error(`Invalid position format: ${JSON.stringify(p)}`);
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface OnlineGameResult {
  winner: "WHITE" | "BLACK" | "DRAW" | null;
  reason?: string;
}

export interface DrawOfferState {
  offeredByUserId: string | null;
}

export interface RematchOfferState {
  offeredByUserId: string | null;
}

/** Shape returned by GET /games/:id → players.white / players.black */
export interface OnlinePlayerInfo {
  id: string;
  username?: string;
  displayName?: string;
  /** rating is a nested object (Prisma include: { rating: true }) */
  rating?: {
    rating: number;
    gamesPlayed?: number;
    wins?: number;
    losses?: number;
    draws?: number;
  } | null;
}

export interface MoveHistoryEntry {
  moveNumber: number;
  player: "WHITE" | "BLACK";
  notation: string;
  from: number;
  to: number;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useOnlineGame(gameId: string) {
  const bridge = useMkaguzi();
  const { socket } = useSocket();

  // ── Core board state ───────────────────────────────────────────────────────
  const [fen, setFen] = useState(INITIAL_FEN);
  const [board, setBoard] = useState(() => BoardState.fromFen(INITIAL_FEN));
  const [moveCount, setMoveCount] = useState(0);
  const [legalMoves, setLegalMoves] = useState<RawMove[]>([]);
  const [selectedSquare, setSelectedSquare] = useState<number | null>(null);
  const [validDestinations, setValidDestinations] = useState<number[]>([]);
  const [capturablePieces, setCapturablePieces] = useState<number[]>([]);
  const [lastMove, setLastMove] = useState<{ from: number; to: number } | null>(null);
  const [invalidMoveSignal, setInvalidMoveSignal] = useState(0);

  // ── Move history ────────────────────────────────────────────────────────────
  const [moveHistory, setMoveHistory] = useState<MoveHistoryEntry[]>([]);
  const [fenHistory, setFenHistory] = useState<string[]>([INITIAL_FEN]);

  // ── Game metadata ──────────────────────────────────────────────────────────
  const [gameData, setGameData] = useState<Record<string, unknown> | null>(null);
  const [players, setPlayers] = useState<{
    white: OnlinePlayerInfo | null;
    black: OnlinePlayerInfo | null;
  }>({ white: null, black: null });
  const [result, setResult] = useState<OnlineGameResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // ── Clock ──────────────────────────────────────────────────────────────────
  // Stored as ms; display layer divides by 1000 for MM:SS
  const [timeLeft, setTimeLeft] = useState<{ WHITE: number; BLACK: number } | null>(null);
  const serverClockRef = useRef<{
    WHITE: number;
    BLACK: number;
    receivedAt: number;
  } | null>(null);
  const claimedTimeoutRef = useRef(false);

  // ── Draw / rematch ─────────────────────────────────────────────────────────
  const [drawOffer, setDrawOffer] = useState<DrawOfferState>({ offeredByUserId: null });
  const [rematchOffer, setRematchOffer] = useState<RematchOfferState>({ offeredByUserId: null });
  const [rematchNewGameId, setRematchNewGameId] = useState<string | null>(null);
  // Tracks whether the local player was the one who offered the rematch (vs accepted).
  // Used so the navigation can set isHost correctly for the new game.
  const [rematchIWasOfferer, setRematchIWasOfferer] = useState(false);

  // ── Disconnect tracking ────────────────────────────────────────────────────
  const [opponentConnected, setOpponentConnected] = useState(true);
  const [disconnectSecondsRemaining, setDisconnectSecondsRemaining] =
    useState<number | null>(null);
  const disconnectCountdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Stable refs for timer/socket closures ─────────────────────────────────
  const prevMoveCountRef = useRef(0);
  const resultRef = useRef<OnlineGameResult | null>(null);
  const isWaitingRef = useRef(true);
  const currentPlayerRef = useRef<PlayerColor>(PlayerColor.WHITE);
  const socketRef = useRef(socket);
  const gameIdRef = useRef(gameId);
  const bridgeRef = useRef(bridge);

  useEffect(() => { socketRef.current = socket; }, [socket]);
  useEffect(() => { gameIdRef.current = gameId; }, [gameId]);
  useEffect(() => { bridgeRef.current = bridge; }, [bridge]);

  // ── Derived values ─────────────────────────────────────────────────────────
  const userId = useAuthStore.getState().user?.id ?? null;

  const myColor: PlayerColor | null =
    gameData && userId
      ? gameData.whitePlayerId === userId
        ? PlayerColor.WHITE
        : gameData.blackPlayerId === userId
        ? PlayerColor.BLACK
        : null
      : null;

  const myColorStr: "WHITE" | "BLACK" | null =
    myColor === PlayerColor.WHITE ? "WHITE" :
    myColor === PlayerColor.BLACK ? "BLACK" : null;

  const currentPlayer: PlayerColor =
    moveCount % 2 === 0 ? PlayerColor.WHITE : PlayerColor.BLACK;

  const isWaiting = gameData ? gameData.status === "WAITING" : true;
  const bothPlayersPresent =
    gameData
      ? gameData.whitePlayerId !== null && gameData.blackPlayerId !== null
      : false;

  // Flip the board when the local player is BLACK so their pieces appear at the bottom.
  // In the PDN grid, squares 1-12 (White home) are already at the visual bottom;
  // flipping rotates so Black's squares 21-32 appear at the bottom instead.
  const flipBoard = myColor === PlayerColor.BLACK;

  // ── Clock: update stable ref ───────────────────────────────────────────────
  useEffect(() => { currentPlayerRef.current = currentPlayer; }, [currentPlayer]);
  useEffect(() => { resultRef.current = result; }, [result]);
  useEffect(() => { isWaitingRef.current = isWaiting; }, [isWaiting]);

  // ── Legal move re-generation ───────────────────────────────────────────────
  const computeCapturables = useCallback((moves: RawMove[]): number[] => {
    const caps = new Set<number>();
    for (const m of moves) for (const c of m.captures) caps.add(c);
    return Array.from(caps);
  }, []);

  useEffect(() => {
    if (!bridge.isReady || !myColor) return;
    if (currentPlayer !== myColor) {
      // Not my turn — clear selection
      setLegalMoves([]);
      setCapturablePieces([]);
      return;
    }
    let cancelled = false;
    bridge.generateMoves(fen).then((moves) => {
      if (cancelled) return;
      setLegalMoves(moves);
      setCapturablePieces(computeCapturables(moves));
    });
    return () => { cancelled = true; };
  }, [bridge.isReady, fen, currentPlayer, myColor, computeCapturables]);

  // ── Apply clock snapshot from server ──────────────────────────────────────
  const applyClockSnapshot = useCallback(
    (
      clock: { whiteTimeMs: number; blackTimeMs: number; lastMoveAt?: string },
      activeColor: PlayerColor,
    ) => {
      let whiteMs = Number(clock.whiteTimeMs);
      let blackMs = Number(clock.blackTimeMs);

      if (clock.lastMoveAt) {
        const elapsed = Math.max(0, Date.now() - new Date(clock.lastMoveAt).getTime());
        if (activeColor === PlayerColor.WHITE) {
          whiteMs = Math.max(0, whiteMs - elapsed);
        } else {
          blackMs = Math.max(0, blackMs - elapsed);
        }
      }

      serverClockRef.current = {
        WHITE: whiteMs,
        BLACK: blackMs,
        receivedAt: Date.now(),
      };
      claimedTimeoutRef.current = false;
      setTimeLeft({ WHITE: whiteMs, BLACK: blackMs });
    },
    [],
  );

  // ── Reconstruct board from moves list ─────────────────────────────────────
  const reconstructFromMoves = useCallback(
    async (moves: unknown[]): Promise<{ finalFen: string; fenHistory: string[] }> => {
      if (!bridgeRef.current.isReady) return { finalFen: INITIAL_FEN, fenHistory: [INITIAL_FEN] };
      let currentFen = INITIAL_FEN;
      const history: string[] = [INITIAL_FEN];
      for (const raw of moves) {
        const m = raw as Record<string, unknown>;
        try {
          const from = getPositionValue(m.from);
          const to = getPositionValue(m.to);
          const newFen = await bridgeRef.current.applyMove(currentFen, from, to);
          if (newFen) { currentFen = newFen; history.push(newFen); }
        } catch {
          // Skip malformed move
        }
      }
      return { finalFen: currentFen, fenHistory: history };
    },
    [],
  );

  // ── Fetch game state from API ──────────────────────────────────────────────
  const fetchGameState = useCallback(async () => {
    try {
      const res = await matchService.getGame(gameId);
      const { game, moves, players: playersData } = res;

      setGameData(game);
      if (playersData) {
        setPlayers(
          playersData as {
            white: OnlinePlayerInfo | null;
            black: OnlinePlayerInfo | null;
          },
        );
      }

      const movesArr = (moves ?? []) as unknown[];
      const newMoveCount = movesArr.length;

      // Reconstruct board only when the WASM bridge is available.
      // If the bridge isn't ready yet (e.g. waiting room), we still set
      // gameData/players so the waiting room renders immediately.
      if (bridgeRef.current.isReady && newMoveCount > 0) {
        const { finalFen: newFen, fenHistory: newFenHistory } = await reconstructFromMoves(movesArr);
        setFen(newFen);
        setBoard(BoardState.fromFen(newFen));
        setFenHistory(newFenHistory);

        const lastRaw = movesArr[movesArr.length - 1] as Record<string, unknown>;
        try {
          setLastMove({
            from: getPositionValue(lastRaw.from),
            to: getPositionValue(lastRaw.to),
          });
        } catch {
          // ignore
        }
      }

      prevMoveCountRef.current = newMoveCount;
      setMoveCount(newMoveCount);

      // Build move history from backend move list (authoritative notation)
      const history: MoveHistoryEntry[] = movesArr.map((raw, idx) => {
        const m = raw as Record<string, unknown>;
        const moveNumber = idx + 1;
        const player: "WHITE" | "BLACK" = moveNumber % 2 === 1 ? "WHITE" : "BLACK";
        try {
          const from = getPositionValue(m.from);
          const to = getPositionValue(m.to);
          const notation = String(m.notation ?? `${from}-${to}`);
          return { moveNumber, player, notation, from, to };
        } catch {
          return { moveNumber, player, notation: "?", from: 0, to: 0 };
        }
      });
      setMoveHistory(history);

      // Result
      if (game.winner) {
        const w = String(game.winner);
        setResult({
          winner: (w === "WHITE" || w === "BLACK" || w === "DRAW") ? w : null,
          reason: (game.endReason as string | undefined) ?? undefined,
        });
      } else if (game.status === "ABORTED") {
        setResult({ winner: null, reason: "aborted" });
      }

      // Clock
      if (game.clockInfo) {
        const clock = game.clockInfo as {
          whiteTimeMs: number;
          blackTimeMs: number;
          lastMoveAt?: string;
        };
        const activeColor =
          newMoveCount % 2 === 0 ? PlayerColor.WHITE : PlayerColor.BLACK;
        const clockForSnapshot =
          newMoveCount === 0 ? { ...clock, lastMoveAt: undefined } : clock;
        applyClockSnapshot(clockForSnapshot, activeColor);
      }
    } catch (err) {
      console.error("[useOnlineGame] fetchGameState failed:", err);
    } finally {
      setIsLoading(false);
    }
  }, [gameId, applyClockSnapshot, reconstructFromMoves]);

  // ── Initial load ───────────────────────────────────────────────────────────
  // Fire metadata fetch immediately — we don't need the bridge to show the
  // waiting room. The bridge is only needed for board reconstruction (moves).
  const didInitialFetch = useRef(false);
  useEffect(() => {
    if (didInitialFetch.current) return;
    didInitialFetch.current = true;
    fetchGameState();
  }, [fetchGameState]);

  // When bridge becomes ready after the initial fetch, re-fetch so the board
  // is reconstructed from any moves that already exist.
  useEffect(() => {
    if (bridge.isReady && !isLoading && moveCount > 0) {
      fetchGameState();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bridge.isReady]);

  // ── 1-second countdown clock ───────────────────────────────────────────────
  useEffect(() => {
    const id = setInterval(() => {
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

      // Claim timeout when clock hits zero
      if (activeMs <= 0 && !claimedTimeoutRef.current && socketRef.current) {
        claimedTimeoutRef.current = true;
        socketRef.current.emit("claimTimeout", { gameId: gameIdRef.current });
      }
    }, 1000);
    return () => clearInterval(id);
  }, []); // intentionally empty — reads only stable refs

  // ── WebSocket: join room + event listeners ─────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    socket.emit("joinGame", gameId);

    const handleReconnect = () => {
      socket.emit("joinGame", gameId);
      fetchGameState();
    };
    socket.on("connect", handleReconnect);

    const handleUpdate = async (data?: unknown) => {
      const d = data as Record<string, unknown> | undefined;

      // No lastMove data — full sync needed (e.g. opponent joined)
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

      // Our own move echoed back — sync clock and record move notation
      if (incomingMoveNum <= prevMoveCountRef.current) {
        const clock = d?.clockInfo as
          | { whiteTimeMs: number; blackTimeMs: number; lastMoveAt?: string }
          | undefined;
        if (clock) {
          const activeColor =
            incomingMoveNum % 2 === 0 ? PlayerColor.WHITE : PlayerColor.BLACK;
          applyClockSnapshot(clock, activeColor);
        }
        const winnerStr = d?.winner as string | undefined;
        if (winnerStr && !resultRef.current) {
          setResult({
            winner: (winnerStr === "WHITE" || winnerStr === "BLACK" || winnerStr === "DRAW") ? winnerStr : null,
          });
        }
        // Reconcile our optimistic history entry with server's authoritative notation
        try {
          const echoFrom = getPositionValue(m.from);
          const echoTo = getPositionValue(m.to);
          const echoNotation = String(m.notation ?? `${echoFrom}-${echoTo}`);
          const echoPlayer: "WHITE" | "BLACK" = incomingMoveNum % 2 === 1 ? "WHITE" : "BLACK";
          setMoveHistory((prev) => {
            const idx = prev.findIndex((e) => e.moveNumber === incomingMoveNum);
            if (idx === -1) {
              // Optimistic entry not yet added — append it
              return [...prev, { moveNumber: incomingMoveNum, player: echoPlayer, notation: echoNotation, from: echoFrom, to: echoTo }];
            }
            if (prev[idx].notation === echoNotation) return prev; // already correct
            // Replace optimistic notation with server's authoritative value
            const next = [...prev];
            next[idx] = { ...next[idx], notation: echoNotation, from: echoFrom, to: echoTo };
            return next;
          });
        } catch { /* ignore */ }
        return;
      }

      // Missed moves — fall back to HTTP
      if (incomingMoveNum > prevMoveCountRef.current + 1) {
        fetchGameState();
        return;
      }

      // Opponent's next move — apply incrementally
      try {
        const from = getPositionValue(m.from);
        const to = getPositionValue(m.to);
        const incomingNotation = String(m.notation ?? `${from}-${to}`);
        const incomingPlayer: "WHITE" | "BLACK" = incomingMoveNum % 2 === 1 ? "WHITE" : "BLACK";

        // Record in move history
        setMoveHistory((prev) => {
          if (prev.length >= incomingMoveNum) return prev;
          return [...prev, { moveNumber: incomingMoveNum, player: incomingPlayer, notation: incomingNotation, from, to }];
        });

        // Apply via bridge (async)
        setFen((prevFen) => {
          // Can't await inside setState; use a side-effectful approach
          if (!bridgeRef.current.isReady) return prevFen;
          bridgeRef.current.applyMove(prevFen, from, to).then((newFen) => {
            if (!newFen) return;
            setFen(newFen);
            setBoard(BoardState.fromFen(newFen));
            setLastMove({ from, to });
            setMoveCount(incomingMoveNum);
            prevMoveCountRef.current = incomingMoveNum;
            setSelectedSquare(null);
            setValidDestinations([]);
            setFenHistory((prev) => [...prev, newFen]);
          });
          return prevFen;
        });

        // Clock
        const clock = d?.clockInfo as
          | { whiteTimeMs: number; blackTimeMs: number; lastMoveAt?: string }
          | undefined;
        if (clock) {
          const activeColor =
            incomingMoveNum % 2 === 0 ? PlayerColor.WHITE : PlayerColor.BLACK;
          applyClockSnapshot(clock, activeColor);
        }
        const winnerStr = d?.winner as string | undefined;
        if (winnerStr && !resultRef.current) {
          setResult({
            winner: (winnerStr === "WHITE" || winnerStr === "BLACK" || winnerStr === "DRAW") ? winnerStr : null,
          });
        }
      } catch {
        fetchGameState();
      }
    };

    const handleGameOver = (data: unknown) => {
      const d = data as Record<string, unknown>;
      const winnerStr = d?.winner as string | null | undefined;
      // Backend may use either "reason" or "endReason" field name
      const reason =
        (d?.reason as string | undefined) ??
        (d?.endReason as string | undefined) ??
        undefined;
      setResult({
        winner: winnerStr === "WHITE" || winnerStr === "BLACK" || winnerStr === "DRAW"
          ? winnerStr
          : null,
        reason,
      });
      // Clear disconnect banner
      setOpponentConnected(true);
      if (disconnectCountdownRef.current !== null) {
        clearInterval(disconnectCountdownRef.current);
        disconnectCountdownRef.current = null;
      }
      setDisconnectSecondsRemaining(null);
      fetchGameState();
    };

    const handleDrawOffered = (data: { offeredByUserId: string }) => {
      setDrawOffer({ offeredByUserId: data.offeredByUserId });
    };
    const handleDrawDeclined = () => setDrawOffer({ offeredByUserId: null });
    const handleDrawCancelled = () => setDrawOffer({ offeredByUserId: null });

    const handleOpponentDisconnected = (data: {
      userId: string;
      secondsRemaining?: number;
    }) => {
      if (resultRef.current !== null) return;
      setOpponentConnected(false);
      const secs = data.secondsRemaining ?? 60;
      setDisconnectSecondsRemaining(secs);

      if (disconnectCountdownRef.current !== null) {
        clearInterval(disconnectCountdownRef.current);
      }
      disconnectCountdownRef.current = setInterval(() => {
        setDisconnectSecondsRemaining((prev) => {
          if (prev === null || prev <= 1) {
            clearInterval(disconnectCountdownRef.current!);
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
      setDisconnectSecondsRemaining(data.secondsRemaining);
    };

    const handleOpponentReconnected = () => {
      setOpponentConnected(true);
      if (disconnectCountdownRef.current !== null) {
        clearInterval(disconnectCountdownRef.current);
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
    const handleRematchDeclined = () =>
      setRematchOffer({ offeredByUserId: null });
    const handleRematchCancelled = () =>
      setRematchOffer({ offeredByUserId: null });

    socket.on("gameStateUpdated", handleUpdate);
    socket.on("gameOver", handleGameOver);
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

    return () => {
      socket.off("connect", handleReconnect);
      socket.off("gameStateUpdated", handleUpdate);
      socket.off("gameOver", handleGameOver);
      socket.off("drawOffered", handleDrawOffered);
      socket.off("drawDeclined", handleDrawDeclined);
      socket.off("drawCancelled", handleDrawCancelled);
      socket.off("opponentDisconnected", handleOpponentDisconnected);
      socket.off("opponentDisconnectCountdown", handleOpponentDisconnectCountdown);
      socket.off("opponentReconnected", handleOpponentReconnected);
      socket.off("rematchOffered", handleRematchOffered);
      socket.off("rematchAccepted", handleRematchAccepted);
      socket.off("rematchDeclined", handleRematchDeclined);
      socket.off("rematchCancelled", handleRematchCancelled);
    };
  }, [socket, gameId, fetchGameState, applyClockSnapshot]);

  // ── Square selection ───────────────────────────────────────────────────────
  const selectSquare = useCallback(
    (pdn: number) => {
      if (result !== null) return;
      if (myColor === null || currentPlayer !== myColor) return;
      if (pdn < 1 || pdn > 32) {
        setSelectedSquare(null);
        setValidDestinations([]);
        return;
      }

      const piece = board.getPieceAt(new Position(pdn));

      // Tap a piece of ours
      if (piece && piece.color === currentPlayer) {
        const ownMoves = legalMoves.filter((m) => m.from === pdn);
        if (ownMoves.length > 0) {
          setSelectedSquare(pdn);
          setValidDestinations(ownMoves.map((m) => m.to));
          return;
        }
      }

      // Tap a valid destination
      if (selectedSquare !== null && validDestinations.includes(pdn)) {
        const move = legalMoves.find(
          (m) => m.from === selectedSquare && m.to === pdn,
        );
        if (move) {
          setSelectedSquare(null);
          setValidDestinations([]);
          performMove(selectedSquare, pdn);
          return;
        }
      }

      if (piece || selectedSquare !== null) {
        setInvalidMoveSignal((s) => s + 1);
      }
      setSelectedSquare(null);
      setValidDestinations([]);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [board, currentPlayer, myColor, legalMoves, selectedSquare, validDestinations, result],
  );

  // ── Submit move ────────────────────────────────────────────────────────────
  const performMove = useCallback(
    (from: number, to: number) => {
      if (result || !socket || isSubmitting) return;

      // Optimistic update via bridge
      bridge.applyMove(fen, from, to).then((newFen) => {
        if (!newFen) return;
        setFen(newFen);
        setBoard(BoardState.fromFen(newFen));
        setLastMove({ from, to });
        const newCount = moveCount + 1;
        setMoveCount(newCount);
        prevMoveCountRef.current = newCount;
        setSelectedSquare(null);
        setValidDestinations([]);
        // Optimistic history entry (notation will be corrected by server echo)
        const optPlayer: "WHITE" | "BLACK" = newCount % 2 === 0 ? "WHITE" : "BLACK";
        setMoveHistory((prev) => {
          if (prev.length >= newCount) return prev;
          return [...prev, { moveNumber: newCount, player: optPlayer, notation: `${from}-${to}`, from, to }];
        });
        setFenHistory((prev) => {
          if (prev.length >= newCount + 1) return prev;
          return [...prev, newFen];
        });
      });

      setIsSubmitting(true);
      setError(null);

      // Guard against duplicate handling if ack fires after timeout or vice-versa
      let ackHandled = false;
      socket.emit("makeMove", { gameId, from, to }, (ack: { error?: string } | undefined) => {
        if (ackHandled) return;
        ackHandled = true;
        clearTimeout(ackTimer);
        setIsSubmitting(false);
        if (ack?.error) {
          setError(ack.error);
          // Roll back optimistic update
          fetchGameState();
        }
      });
      // Roll back and surface an error if no ack arrives within 8 s
      const ackTimer = setTimeout(() => {
        if (ackHandled) return;
        ackHandled = true;
        setIsSubmitting(false);
        setError("Move timed out — check your connection.");
        fetchGameState();
      }, 8000);
    },
    [bridge, fen, moveCount, gameId, result, socket, isSubmitting, fetchGameState],
  );

  // ── Start game (host) ──────────────────────────────────────────────────────
  const startGame = useCallback(async () => {
    if (!isWaiting || !bothPlayersPresent) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await matchService.startGame(gameId);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e?.response?.data?.message ?? "Failed to start game.");
    } finally {
      setIsSubmitting(false);
    }
  }, [isWaiting, bothPlayersPresent, gameId]);

  // ── Draw actions ───────────────────────────────────────────────────────────
  const offerDraw = useCallback(() => {
    if (result || !socket) {
      if (!socket) setError("Not connected — please wait.");
      return;
    }
    socket.emit("offerDraw", { gameId });
    if (userId) setDrawOffer({ offeredByUserId: userId });
  }, [gameId, result, socket, userId]);

  const acceptDraw = useCallback(() => {
    if (!socket) { setError("Not connected — please wait."); return; }
    setDrawOffer({ offeredByUserId: null });
    socket.emit("acceptDraw", { gameId });
  }, [socket, gameId]);

  const declineDraw = useCallback(() => {
    if (!socket) { setError("Not connected — please wait."); return; }
    socket.emit("declineDraw", { gameId });
    setDrawOffer({ offeredByUserId: null });
  }, [socket, gameId]);

  const cancelDraw = useCallback(() => {
    if (!socket) { setError("Not connected — please wait."); return; }
    socket.emit("cancelDraw", { gameId });
    setDrawOffer({ offeredByUserId: null });
  }, [socket, gameId]);

  // ── Resign ─────────────────────────────────────────────────────────────────
  const resign = useCallback(() => {
    if (!socket || result) {
      if (!socket) setError("Not connected — please wait.");
      return;
    }
    socket.emit("resign", { gameId });
  }, [socket, gameId, result]);

  // ── Abort (before first move) ──────────────────────────────────────────────
  const abort = useCallback(() => {
    if (!socket || moveCount > 0) {
      if (!socket) setError("Not connected — please wait.");
      return;
    }
    socket.emit("abort", { gameId });
  }, [socket, gameId, moveCount]);

  // ── Rematch actions ────────────────────────────────────────────────────────
  const offerRematch = useCallback(() => {
    if (!socket) { setError("Not connected — please wait."); return; }
    socket.emit("offerRematch", { gameId });
    setRematchOffer({ offeredByUserId: "self" });
    setRematchIWasOfferer(true);
  }, [socket, gameId]);

  const acceptRematch = useCallback(() => {
    if (!socket) { setError("Not connected — please wait."); return; }
    socket.emit("acceptRematch", { gameId });
    // Acceptor is NOT the offerer — keep rematchIWasOfferer as false
  }, [socket, gameId]);

  const declineRematch = useCallback(() => {
    if (!socket) return;
    socket.emit("declineRematch", { gameId });
    setRematchOffer({ offeredByUserId: null });
    setRematchIWasOfferer(false);
  }, [socket, gameId]);

  const cancelRematch = useCallback(() => {
    if (!socket) return;
    socket.emit("cancelRematch", { gameId });
    setRematchOffer({ offeredByUserId: null });
    setRematchIWasOfferer(false);
  }, [socket, gameId]);

  return {
    // Board state
    fen,
    board,
    moveHistory,
    fenHistory,
    currentPlayer,
    myColor,
    myColorStr,
    flipBoard,
    moveCount,
    legalMoves,
    selectedSquare,
    validDestinations,
    capturablePieces,
    lastMove,
    invalidMoveSignal,
    // Game metadata
    gameData,
    players,
    result,
    error,
    isLoading,
    isSubmitting,
    isWaiting,
    bothPlayersPresent,
    isReady: bridge.isReady,
    // Clock
    timeLeft,
    // Draw / rematch
    drawOffer,
    rematchOffer,
    rematchNewGameId,
    rematchIWasOfferer,
    // Opponent connection
    opponentConnected,
    disconnectSecondsRemaining,
    // Actions
    selectSquare,
    startGame,
    offerDraw,
    acceptDraw,
    declineDraw,
    cancelDraw,
    resign,
    abort,
    offerRematch,
    acceptRematch,
    declineRematch,
    cancelRematch,
    refetch: fetchGameState,
  };
}
