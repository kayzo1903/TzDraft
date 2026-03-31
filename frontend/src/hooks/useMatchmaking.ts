"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { gameService } from "@/services/game.service";
import { useSocket } from "@/hooks/useSocket";

export type MatchmakingState = "idle" | "searching" | "matched";

export const QUEUE_TIME_OPTIONS = [
  { ms: 180000, label: "3 min", name: "Bullet" },
  { ms: 300000, label: "5 min", name: "Blitz" },
  { ms: 600000, label: "10 min", name: "Rapid" },
  { ms: 1800000, label: "30 min", name: "Classic" },
] as const;

export type QueueTimeMs = (typeof QUEUE_TIME_OPTIONS)[number]["ms"];

const SEARCH_TIMEOUT_MS = 60 * 1000; // 60 seconds

export function useMatchmaking() {
  const router = useRouter();
  const { locale } = useParams<{ locale: string }>();
  const { socket } = useSocket();

  const [state, setState] = useState<MatchmakingState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [timeoutReached, setTimeoutReached] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);

  // Refs — never cause re-render, safe to read inside closures/timers
  const cancelledRef = useRef(false);
  const isSearchingRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedRef = useRef(0);

  const clearTimers = useCallback(() => {
    if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
    if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
  }, []);

  const ensureSocketConnected = useCallback(async () => {
    if (!socket) return false;
    if (socket.connected && socket.id) return true;
    socket.connect();
    return new Promise<boolean>((resolve) => {
      const timeout = setTimeout(() => {
        socket.off("connect", onConnect);
        socket.off("connect_error", onError);
        resolve(false);
      }, 5000);
      const onConnect = () => {
        clearTimeout(timeout);
        socket.off("connect_error", onError);
        resolve(Boolean(socket.id));
      };
      const onError = () => {
        clearTimeout(timeout);
        socket.off("connect", onConnect);
        resolve(false);
      };
      socket.once("connect", onConnect);
      socket.once("connect_error", onError);
    });
  }, [socket]);

  // Listen for matchFound from the server
  useEffect(() => {
    if (!socket) return;
    const handleMatchFound = ({ gameId }: { gameId: string }) => {
      if (cancelledRef.current) {
        gameService.abort(gameId).catch(() => {});
        return;
      }
      clearTimers();
      cancelledRef.current = true;
      isSearchingRef.current = false;
      setState("matched");
      router.push(`/${locale}/game/${gameId}`);
    };
    socket.on("matchFound", handleMatchFound);
    return () => { socket.off("matchFound", handleMatchFound); };
  }, [socket, router, locale, clearTimers]);

  const joinQueue = useCallback(
    async (timeMs: QueueTimeMs) => {
      if (!socket) {
        setError("No connection. Please refresh and try again.");
        return;
      }
      const ready = await ensureSocketConnected();
      if (!ready || !socket.id) {
        setError("No live connection. Please check your network and try again.");
        return;
      }

      cancelledRef.current = false;
      isSearchingRef.current = true;
      setError(null);
      setState("searching");

      // Reset elapsed + start tick + start 60 s timeout
      clearTimers();
      elapsedRef.current = 0;
      setElapsedMs(0);
      setTimeoutReached(false);

      tickRef.current = setInterval(() => {
        elapsedRef.current += 1000;
        setElapsedMs(elapsedRef.current);
      }, 1000);

      timeoutRef.current = setTimeout(() => {
        if (!cancelledRef.current) setTimeoutReached(true);
      }, SEARCH_TIMEOUT_MS);

      try {
        const res = await gameService.joinQueue(timeMs, socket.id);
        if (cancelledRef.current) {
          if (res.data?.status === "matched" && res.data.gameId) {
            gameService.abort(res.data.gameId).catch(() => {});
          }
          return;
        }
        if (res.data?.status === "matched" && res.data.gameId) {
          // Immediate match — opponent was already waiting
          clearTimers();
          cancelledRef.current = true;
          isSearchingRef.current = false;
          setState("matched");
          router.push(`/${locale}/game/${res.data.gameId}`);
        }
        // status === "waiting": remain in searching state, wait for matchFound WS event
      } catch {
        clearTimers();
        if (!cancelledRef.current) {
          isSearchingRef.current = false;
          setState("idle");
          setError("Failed to join queue. Please try again.");
        }
      }
    },
    [socket, router, locale, ensureSocketConnected, clearTimers],
  );

  const cancelQueue = useCallback(async () => {
    cancelledRef.current = true;
    isSearchingRef.current = false;
    clearTimers();
    setTimeoutReached(false);
    setElapsedMs(0);
    setState("idle");
    setError(null);
    try { await gameService.cancelQueue(); } catch { /* best-effort */ }
  }, [clearTimers]);

  /** Reset the 60 s clock without leaving the queue ("Keep searching"). */
  const resetTimeout = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setTimeoutReached(false);
    timeoutRef.current = setTimeout(() => {
      if (!cancelledRef.current) setTimeoutReached(true);
    }, SEARCH_TIMEOUT_MS);
  }, []);

  // Cleanup on unmount ONLY — empty deps prevents the cleanup from firing on
  // every state change (which was killing the timers right after they started)
  useEffect(() => {
    return () => {
      clearTimers();
      if (isSearchingRef.current && !cancelledRef.current) {
        cancelledRef.current = true;
        gameService.cancelQueue().catch(() => {});
      }
    };
  }, [clearTimers]);

  return { state, error, timeoutReached, elapsedMs, joinQueue, cancelQueue, resetTimeout };
}
