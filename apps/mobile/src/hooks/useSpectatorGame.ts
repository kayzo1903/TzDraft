import { useCallback, useEffect, useRef, useState } from "react";
import { BoardState, PlayerColor } from "@tzdraft/mkaguzi-engine";
import { useMkaguzi } from "../lib/game/mkaguzi-mobile";
import { matchService } from "../lib/match-service";
import { useSocket } from "./useSocket";

const INITIAL_FEN = "W:W1,2,3,4,5,6,7,8,9,10,11,12:B21,22,23,24,25,26,27,28,29,30,31,32";

function getPositionValue(p: unknown): number {
  if (typeof p === "number") return p;
  const obj = p as Record<string, unknown>;
  if (typeof obj?._value === "number") return obj._value;
  if (typeof obj?.value === "number") return obj.value as number;
  throw new Error(`Invalid position: ${JSON.stringify(p)}`);
}

/* ─── Types ─────────────────────────────────────────────────────────────── */

export interface SpectatorPlayerInfo {
  id: string;
  username?: string;
  displayName?: string;
  avatarUrl?: string | null;
  rating?: { rating: number } | null;
}

export interface SpectatorResult {
  winner: "WHITE" | "BLACK" | "DRAW" | null;
  reason?: string;
}

export interface MoveHistoryEntry {
  moveNumber: number;
  player: "WHITE" | "BLACK";
  notation: string;
  from: number;
  to: number;
  captureCount: number;
}

/* ─── Hook ──────────────────────────────────────────────────────────────── */

export function useSpectatorGame(gameId: string) {
  const bridge = useMkaguzi();
  const { socket, connected, reconnecting } = useSocket();

  const [fen, setFen] = useState(INITIAL_FEN);
  const [board, setBoard] = useState(() => BoardState.fromFen(INITIAL_FEN));
  const [moveCount, setMoveCount] = useState(0);
  const [moveHistory, setMoveHistory] = useState<MoveHistoryEntry[]>([]);
  const [lastMove, setLastMove] = useState<{ from: number; to: number } | null>(null);

  const [gameData, setGameData] = useState<Record<string, unknown> | null>(null);
  const [players, setPlayers] = useState<{
    white: SpectatorPlayerInfo | null;
    black: SpectatorPlayerInfo | null;
  }>({ white: null, black: null });
  const [result, setResult] = useState<SpectatorResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Clock
  const [timeLeft, setTimeLeft] = useState<{ WHITE: number; BLACK: number } | null>(null);
  const serverClockRef = useRef<{ WHITE: number; BLACK: number; receivedAt: number } | null>(null);

  // Stable refs
  const prevMoveCountRef = useRef(0);
  const resultRef = useRef<SpectatorResult | null>(null);
  const isActiveRef = useRef(false);
  const currentPlayerRef = useRef<PlayerColor>(PlayerColor.WHITE);
  const bridgeRef = useRef(bridge);
  const gameIdRef = useRef(gameId);

  useEffect(() => { bridgeRef.current = bridge; }, [bridge]);
  useEffect(() => { gameIdRef.current = gameId; }, [gameId]);
  useEffect(() => { resultRef.current = result; }, [result]);

  const currentPlayer: PlayerColor =
    moveCount % 2 === 0 ? PlayerColor.WHITE : PlayerColor.BLACK;

  useEffect(() => { currentPlayerRef.current = currentPlayer; }, [currentPlayer]);

  /* ── Clock snapshot ─────────────────────────────────────────────────── */
  const applyClockSnapshot = useCallback(
    (
      clock: { whiteTimeMs: number; blackTimeMs: number; lastMoveAt?: string },
      activeColor: PlayerColor,
    ) => {
      let whiteMs = Number(clock.whiteTimeMs);
      let blackMs = Number(clock.blackTimeMs);
      if (clock.lastMoveAt) {
        const elapsed = Math.max(0, Date.now() - new Date(clock.lastMoveAt).getTime());
        if (activeColor === PlayerColor.WHITE) whiteMs = Math.max(0, whiteMs - elapsed);
        else blackMs = Math.max(0, blackMs - elapsed);
      }
      serverClockRef.current = { WHITE: whiteMs, BLACK: blackMs, receivedAt: Date.now() };
      setTimeLeft({ WHITE: whiteMs, BLACK: blackMs });
    },
    [],
  );

  /* ── Board reconstruction ───────────────────────────────────────────── */
  const reconstructFromMoves = useCallback(async (moves: unknown[]): Promise<string> => {
    if (!bridgeRef.current.isReady) return INITIAL_FEN;
    let currentFen = INITIAL_FEN;
    for (const raw of moves) {
      const m = raw as Record<string, unknown>;
      try {
        const from = getPositionValue(m.from);
        const to = getPositionValue(m.to);
        const newFen = await bridgeRef.current.applyMove(currentFen, from, to);
        if (newFen) currentFen = newFen;
      } catch { /* skip malformed */ }
    }
    return currentFen;
  }, []);

  /* ── Fetch from API ─────────────────────────────────────────────────── */
  const fetchGameState = useCallback(async () => {
    try {
      const res = await matchService.getGame(gameId);
      const { game, moves, players: playersData } = res;

      setGameData(game);
      if (playersData) setPlayers(playersData);

      const movesArr = (moves ?? []) as unknown[];
      const newMoveCount = movesArr.length;

      if (bridgeRef.current.isReady && newMoveCount > 0) {
        const newFen = await reconstructFromMoves(movesArr);
        setFen(newFen);
        setBoard(BoardState.fromFen(newFen));

        const lastRaw = movesArr[movesArr.length - 1] as Record<string, unknown>;
        try {
          setLastMove({
            from: getPositionValue(lastRaw.from),
            to: getPositionValue(lastRaw.to),
          });
        } catch { /* ignore */ }

        // Build history
        const history: MoveHistoryEntry[] = movesArr.map((raw) => {
          const m = raw as Record<string, unknown>;
          const capturedSquares = Array.isArray(m.capturedSquares)
            ? m.capturedSquares
            : [];
          return {
            moveNumber: Number(m.moveNumber ?? 0),
            player: (m.player as "WHITE" | "BLACK") ?? "WHITE",
            notation: String(m.notation ?? ""),
            from: getPositionValue(m.from),
            to: getPositionValue(m.to),
            captureCount: capturedSquares.length,
          };
        });
        setMoveHistory(history);
      }

      prevMoveCountRef.current = newMoveCount;
      setMoveCount(newMoveCount);
      isActiveRef.current = game.status === "ACTIVE";

      // Result
      if (game.winner) {
        const map: Record<string, "WHITE" | "BLACK" | "DRAW"> = {
          WHITE: "WHITE", BLACK: "BLACK", DRAW: "DRAW",
        };
        setResult({ winner: map[game.winner as string] ?? "DRAW" });
      } else if (game.status === "ABORTED") {
        setResult({ winner: null, reason: "aborted" });
      }

      // Clock
      if (game.clockInfo && newMoveCount > 0) {
        const clock = game.clockInfo as { whiteTimeMs: number; blackTimeMs: number; lastMoveAt?: string };
        applyClockSnapshot(clock, newMoveCount % 2 === 0 ? PlayerColor.WHITE : PlayerColor.BLACK);
      }
    } catch (err) {
      console.error("[Spectator] fetchGameState error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [gameId, reconstructFromMoves, applyClockSnapshot]);

  /* ── Initial load ───────────────────────────────────────────────────── */
  useEffect(() => {
    fetchGameState();
  }, [fetchGameState]);

  /* ── Re-fetch once WASM is ready (board may be empty on first render) ─ */
  useEffect(() => {
    if (bridge.isReady && moveCount === 0) fetchGameState();
  }, [bridge.isReady]);

  /* ── WebSocket ──────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!socket) return;

    // Spectator-only join — does NOT set K_USER_GAME on server
    socket.emit("watchGame", gameId);

    const handleReconnect = () => {
      socket.emit("watchGame", gameId);
      fetchGameState();
    };
    socket.on("connect", handleReconnect);

    const handleUpdate = async (data?: unknown) => {
      const d = data as Record<string, unknown> | undefined;
      if (!d?.lastMove) { fetchGameState(); return; }

      const m = d.lastMove as Record<string, unknown>;
      const incomingNum = Number(m.moveNumber);

      if (incomingNum <= prevMoveCountRef.current) {
        // Our clock may still need updating
        const clock = d?.clockInfo as { whiteTimeMs: number; blackTimeMs: number; lastMoveAt?: string } | undefined;
        if (clock) applyClockSnapshot(clock, incomingNum % 2 === 0 ? PlayerColor.WHITE : PlayerColor.BLACK);
        return;
      }
      if (incomingNum > prevMoveCountRef.current + 1) { fetchGameState(); return; }

      // Apply move via bridge
      try {
        const from = getPositionValue(m.from);
        const to = getPositionValue(m.to);
        const newFen = await bridgeRef.current.applyMove(fen, from, to);
        if (newFen) {
          setFen(newFen);
          setBoard(BoardState.fromFen(newFen));
        }
        setLastMove({ from, to });
        setMoveCount(incomingNum);
        prevMoveCountRef.current = incomingNum;
        setMoveHistory((prev) => [
          ...prev,
          {
            moveNumber: incomingNum,
            player: (m.player as "WHITE" | "BLACK") ?? "WHITE",
            notation: String(m.notation ?? ""),
            from,
            to,
            captureCount: Array.isArray(m.capturedSquares)
              ? m.capturedSquares.length
              : 0,
          },
        ]);

        const clock = d?.clockInfo as { whiteTimeMs: number; blackTimeMs: number; lastMoveAt?: string } | undefined;
        if (clock) applyClockSnapshot(clock, incomingNum % 2 === 0 ? PlayerColor.WHITE : PlayerColor.BLACK);

        const winnerStr = d?.winner as string | undefined;
        if (winnerStr) {
          const map: Record<string, "WHITE" | "BLACK" | "DRAW"> = { WHITE: "WHITE", BLACK: "BLACK", DRAW: "DRAW" };
          setResult({ winner: map[winnerStr] ?? null });
        }
      } catch {
        fetchGameState();
      }
    };

    const handleGameOver = (data: unknown) => {
      const d = data as Record<string, unknown>;
      const map: Record<string, "WHITE" | "BLACK" | "DRAW"> = { WHITE: "WHITE", BLACK: "BLACK", DRAW: "DRAW" };
      const w = d?.winner as string | undefined;
      setResult({ winner: w ? map[w] ?? null : null, reason: d?.reason as string | undefined });
      isActiveRef.current = false;
      fetchGameState();
    };

    socket.on("gameStateUpdated", handleUpdate);
    socket.on("gameOver", handleGameOver);

    return () => {
      socket.off("connect", handleReconnect);
      socket.off("gameStateUpdated", handleUpdate);
      socket.off("gameOver", handleGameOver);
    };
  }, [socket, gameId, fen, fetchGameState, applyClockSnapshot]);

  /* ── 1-second clock countdown (spectator-safe, never emits claimTimeout) */
  useEffect(() => {
    const id = setInterval(() => {
      if (!serverClockRef.current || resultRef.current || !isActiveRef.current) return;
      const elapsed = Date.now() - serverClockRef.current.receivedAt;
      const active = currentPlayerRef.current === PlayerColor.WHITE ? "WHITE" : "BLACK";
      const other = active === "WHITE" ? "BLACK" : "WHITE";
      setTimeLeft({
        [active]: Math.max(0, serverClockRef.current[active] - elapsed),
        [other]: serverClockRef.current[other],
      } as { WHITE: number; BLACK: number });
    }, 1000);
    return () => clearInterval(id);
  }, []);

  return {
    fen,
    board,
    moveCount,
    moveHistory,
    lastMove,
    currentPlayer,
    gameData,
    players,
    result,
    isLoading,
    timeLeft,
    connected,
    reconnecting,
    refetch: fetchGameState,
  };
}
