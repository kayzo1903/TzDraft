"use client";

import { useState, useEffect, useCallback } from "react";
import {
  historyService,
  GameHistoryItem,
  PlayerStats,
  PlayerRank,
  HistoryFilters,
} from "@/services/history.service";

const PAGE_SIZE = 20;

export function useGameHistory(filters: HistoryFilters = {}, pageSize = PAGE_SIZE) {
  const [items, setItems] = useState<GameHistoryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (pageNum: number) => {
      setLoading(true);
      setError(null);
      try {
        const data = await historyService.getHistory(
          pageNum * pageSize,
          pageSize,
          filters,
        );
        setItems(data.items);
        setTotal(data.total);
        setPage(pageNum);
      } catch {
        setError("Failed to load game history");
      } finally {
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filters.result, filters.gameType, pageSize],
  );

  useEffect(() => {
    load(0);
  }, [load]);

  const totalPages = Math.ceil(total / pageSize);

  return {
    items,
    total,
    page,
    totalPages,
    loading,
    error,
    goToPage: load,
  };
}

export function usePlayerStats() {
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    historyService
      .getStats()
      .then(setStats)
      .catch(() => setError("Failed to load stats"))
      .finally(() => setLoading(false));
  }, []);

  return { stats, loading, error };
}

export function usePlayerRank() {
  const [rank, setRank] = useState<PlayerRank | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    historyService
      .getRank()
      .then(setRank)
      .catch(() => setRank(null))
      .finally(() => setLoading(false));
  }, []);

  return { rank, loading };
}
