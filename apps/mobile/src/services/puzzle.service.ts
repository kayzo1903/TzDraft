import api from "../lib/api";

export interface Puzzle {
  id: string;
  title: string | null;
  difficulty: number;
  theme: string;
  sideToMove: "WHITE" | "BLACK";
  pieces: any[];
  solution?: any[];
  publishedAt: string;
  alreadyAttempted?: boolean;
  _count: { attempts: number };
}

export interface PuzzleListResult {
  data: Puzzle[];
  total: number;
  page: number;
  limit: number;
}

export const puzzleService = {
  getDaily: async (): Promise<Puzzle | null> => {
    try {
      const res = await api.get("/puzzles/daily");
      return res.data;
    } catch {
      return null;
    }
  },

  list: async (params: { difficulty?: number; theme?: string; page?: number; limit?: number } = {}): Promise<Puzzle[]> => {
    try {
      const res = await api.get("/puzzles", { params });
      return res.data.data;
    } catch {
      return [];
    }
  },

  listPaged: async (params: { difficulty?: number; theme?: string; page?: number; limit?: number } = {}): Promise<PuzzleListResult> => {
    try {
      const res = await api.get("/puzzles", { params });
      return res.data;
    } catch {
      return { data: [], total: 0, page: 1, limit: 20 };
    }
  },

  getById: async (id: string): Promise<Puzzle | null> => {
    try {
      const res = await api.get(`/puzzles/${id}`);
      return res.data;
    } catch {
      return null;
    }
  },

  getMyRating: async (): Promise<number> => {
    try {
      const res = await api.get("/puzzles/my-rating");
      return res.data.puzzleRating ?? 1000;
    } catch {
      return 1000;
    }
  },

  attempt: async (
    id: string,
    moves: { from: number; to: number; captures?: number[] }[],
    timeTaken?: number,
  ): Promise<{ correct: boolean; solution?: any[]; points?: number; newRating?: number | null }> => {
    try {
      const res = await api.post(`/puzzles/${id}/attempt`, { moves, timeTaken });
      return res.data;
    } catch {
      return { correct: false };
    }
  },
};
