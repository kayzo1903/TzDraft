"use client";

import { useEffect, useState, useCallback } from "react";
import { tournamentService, TournamentDetail } from "@/services/tournament.service";
import { useSocket } from "./useSocket";

export function useTournament(tournamentId: string) {
  const [data, setData] = useState<TournamentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { socket } = useSocket();

  const refetch = useCallback(async () => {
    try {
      const detail = await tournamentService.get(tournamentId);
      setData(detail);
    } catch (err) {
      setError("Failed to load tournament");
    }
  }, [tournamentId]);

  // Initial fetch
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    refetch().finally(() => setLoading(false));
  }, [refetch]);

  // Join tournament WS room and subscribe to events
  useEffect(() => {
    if (!socket) return;

    socket.emit("joinTournament", tournamentId);

    const onMatchGameReady = () => refetch();
    const onMatchCompleted = () => refetch();
    const onRoundAdvanced = () => refetch();
    const onCompleted = () => refetch();

    socket.on("tournamentMatchGameReady", onMatchGameReady);
    socket.on("tournamentMatchCompleted", onMatchCompleted);
    socket.on("tournamentRoundAdvanced", onRoundAdvanced);
    socket.on("tournamentCompleted", onCompleted);

    return () => {
      socket.off("tournamentMatchGameReady", onMatchGameReady);
      socket.off("tournamentMatchCompleted", onMatchCompleted);
      socket.off("tournamentRoundAdvanced", onRoundAdvanced);
      socket.off("tournamentCompleted", onCompleted);
    };
  }, [socket, tournamentId, refetch]);

  return { data, loading, error, refetch };
}
