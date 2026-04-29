/**
 * ai-search.ts
 *
 * Level parameters and getBestMove() logic for the Play vs AI mode.
 * Mirrors the LEVEL_PARAMS table used on the web frontend.
 */

import type { RawMove, RawSearchResult } from "./bridge-types";

// ─── Level parameters ──────────────────────────────────────────────────────────
interface LevelParams {
  timeMs: number;
  level: number;       // Mkaguzi strength 15-19
  randomness: number;  // centipawn noise
  blunderChance: number; // 0-1 probability of playing a random legal move
}

export const LEVEL_PARAMS: Record<number, LevelParams> = {
   1: { timeMs:  150, level: 15, randomness: 250, blunderChance: 0.70 },
   2: { timeMs:  200, level: 15, randomness: 125, blunderChance: 0.40 },
   3: { timeMs:  350, level: 15, randomness:  75, blunderChance: 0.15 },
   4: { timeMs:  500, level: 16, randomness:  40, blunderChance: 0.05 },
   5: { timeMs:  750, level: 16, randomness:  25, blunderChance: 0.00 },
   6: { timeMs: 1000, level: 16, randomness:  20, blunderChance: 0.00 },
   7: { timeMs: 1200, level: 16, randomness:  15, blunderChance: 0.00 },
   8: { timeMs: 1500, level: 17, randomness:  10, blunderChance: 0.00 },
   9: { timeMs: 2000, level: 17, randomness:   8, blunderChance: 0.00 },
  10: { timeMs: 2500, level: 17, randomness:   5, blunderChance: 0.00 },
  11: { timeMs: 3000, level: 18, randomness:   3, blunderChance: 0.00 },
  12: { timeMs: 3500, level: 18, randomness:   2, blunderChance: 0.00 },
  13: { timeMs: 4000, level: 18, randomness:   1, blunderChance: 0.00 },
  14: { timeMs: 5000, level: 18, randomness:   0, blunderChance: 0.00 },
  15: { timeMs: 6000, level: 19, randomness:   0, blunderChance: 0.00 },
  16: { timeMs: 7000, level: 19, randomness:   0, blunderChance: 0.00 },
  17: { timeMs: 7500, level: 19, randomness:   0, blunderChance: 0.00 },
  18: { timeMs: 8000, level: 19, randomness:   0, blunderChance: 0.00 },
  19: { timeMs: 9000, level: 19, randomness:   0, blunderChance: 0.00 },
};

// ─── Tier-based flat strength params ──────────────────────────────────────────
// All bots within a tier play at the same strength regardless of their level.
// Undisputed (17-19) keeps individual progressive params from LEVEL_PARAMS.

const TIER_PARAMS: Record<string, LevelParams> = {
  beginner:    { timeMs:  150, level: 15, randomness: 250, blunderChance: 0.70 },
  casual:      { timeMs:  350, level: 15, randomness:  75, blunderChance: 0.50 },
  competitive: { timeMs:  500, level: 16, randomness:  40, blunderChance: 0.25 },
  expert:      { timeMs: 1000, level: 16, randomness:  15, blunderChance: 0.05 },
};

function getTierName(level: number): string | null {
  if (level <= 3)  return "beginner";
  if (level <= 7)  return "casual";
  if (level <= 11) return "competitive";
  if (level <= 16) return "expert";
  return null; // Undisputed — use individual LEVEL_PARAMS
}

function getParams(level: number): LevelParams {
  const clamped = Math.max(1, Math.min(level, 19));
  const tier = getTierName(clamped);
  if (tier) return TIER_PARAMS[tier];
  return LEVEL_PARAMS[clamped] ?? LEVEL_PARAMS[19];
}

// ─── Bridge interface (only the methods we need) ───────────────────────────────
interface BridgeMethods {
  generateMoves: (fen: string) => Promise<RawMove[]>;
  search: (
    fen: string,
    history: string[],
    timeMs: number,
    depth: number,
    level: number,
    randomness: number,
  ) => Promise<RawSearchResult | null>;
}

// ─── getBestMove ───────────────────────────────────────────────────────────────
/**
 * Runs the AI search for the given position and returns the best move.
 * Returns null if there are no legal moves.
 */
export async function getBestMove(
  fen: string,
  botLevel: number,
  fenHistory: string[],
  bridge: BridgeMethods,
): Promise<RawMove | null> {
  const params = getParams(botLevel);

  // Blunder: occasionally play a random legal move to simulate human error
  if (params.blunderChance > 0 && Math.random() < params.blunderChance) {
    const moves = await bridge.generateMoves(fen);
    if (moves.length === 0) return null;
    return moves[Math.floor(Math.random() * moves.length)];
  }

  return bridge.search(fen, fenHistory, params.timeMs, 0, params.level, params.randomness);
}
