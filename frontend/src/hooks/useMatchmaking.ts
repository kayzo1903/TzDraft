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

const SEARCH_TIMEOUT_MS = 60 * 1000; // 1 minute

export function useMatchmaking() {
  const router = useRouter();
  const { locale } = useParams<{ locale: string }>();
  const { socket } = useSocket();

  const [state, setState] = useState<MatchmakingState>("idle");
  const [error, setError] = useState<string | null>(null);
  const cancelledRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const ensureSocketConnected = useCallback(async () => {
    if (!socket) return false;
    if (socket.connected && socket.id) return true;

    // Try to establish/re-establish the WS connection before joining queue.
    socket.connect();

    return await new Promise<boolean>((resolve) => {
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
      if (cancelledRef.current) return;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      cancelledRef.current = true;
      setState("matched");
      router.push(`/${locale}/game/${gameId}`);
    };

    socket.on("matchFound", handleMatchFound);
    return () => {
      socket.off("matchFound", handleMatchFound);
    };
  }, [socket, router, locale]);

  const joinQueue = useCallback(
    async (timeMs: QueueTimeMs) => {
      if (!socket) {
        setError("No connection. Please refresh and try again.");
        return;
      }

      const ready = await ensureSocketConnected();
      if (!ready || !socket.id) {
        setError("No live connection. Please check network and try again.");
        return;
      }

      cancelledRef.current = false;
      setError(null);
      setState("searching");

      // Auto-cancel after 1 minute if no match is found
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(async () => {
        if (cancelledRef.current) return;
        cancelledRef.current = true;
        setState("idle");
        setError("No opponent found. Please try again.");
        gameService.cancelQueue().catch(() => {});
      }, SEARCH_TIMEOUT_MS);

      try {
        const socketId = socket.id;
        const res = await gameService.joinQueue(timeMs, socketId);

        if (cancelledRef.current) return;

        if (res.data.status === "matched" && res.data.gameId) {
          // Immediate match (opponent was already waiting)
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          cancelledRef.current = true;
          setState("matched");
          router.push(`/${locale}/game/${res.data.gameId}`);
        }
        // status === "waiting": stay in searching state, wait for matchFound WS event
      } catch {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        if (!cancelledRef.current) {
          setState("idle");
          setError("Failed to join queue. Please try again.");
        }
      }
    },
    [socket, router, locale, ensureSocketConnected],
  );

  const cancelQueue = useCallback(async () => {
    cancelledRef.current = true;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setState("idle");
    setError(null);
    try {
      await gameService.cancelQueue();
    } catch {
      // Best-effort cancel — ignore errors
    }
  }, []);

  // Auto-cancel if the component unmounts while still searching
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (state === "searching" && !cancelledRef.current) {
        cancelledRef.current = true;
        gameService.cancelQueue().catch(() => {});
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return { state, error, joinQueue, cancelQueue };
}
