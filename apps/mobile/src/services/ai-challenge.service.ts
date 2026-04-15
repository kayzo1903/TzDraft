/**
 * ai-challenge.service.ts
 *
 * Mobile mirror of the web's ai-challenge.service.ts.
 * All calls are authenticated via the Axios instance in api.ts (Bearer token).
 */

import api from "../lib/api";

export interface AiProgressionSummary {
  highestAiLevelPlayed: number;
  highestAiLevelBeaten: number;
  highestUnlockedAiLevel: number;
  completedLevels: number[];
  initialFreeLevels: number; // 3
  totalLevels: number;       // 19
}

class AiChallengeService {
  // In-memory cache — populated on first getProgression() call, cleared when
  // the player completes a game so the next setup-ai open reflects new unlocks.
  private _progression: AiProgressionSummary | null = null;

  async getProgression(): Promise<AiProgressionSummary> {
    if (this._progression) return this._progression;
    const res = await api.get("/games/ai/progression");
    this._progression = res.data.data as AiProgressionSummary;
    return this._progression;
  }

  async startSession(
    aiLevel: number,
    playerColor: "WHITE" | "BLACK",
  ): Promise<{ sessionId: string; progression: AiProgressionSummary }> {
    const res = await api.post("/games/ai/sessions", { aiLevel, playerColor });
    return res.data.data as { sessionId: string; progression: AiProgressionSummary };
  }

  async completeSession(
    sessionId: string,
    result: "WIN" | "LOSS" | "DRAW",
    undoUsed: boolean,
  ): Promise<AiProgressionSummary> {
    const res = await api.post(`/games/ai/sessions/${sessionId}/complete`, {
      result,
      undoUsed,
    });
    const progression = res.data.data as AiProgressionSummary;
    // Refresh cache with the server's updated progression so the next
    // setup-ai open immediately shows any newly unlocked bots.
    this._progression = progression;
    return progression;
  }

  async syncLocalProgress(
    completedLevels: number[],
    maxUnlockedAiLevel: number,
  ): Promise<AiProgressionSummary> {
    const res = await api.post("/games/ai/progression/sync", {
      completedLevels,
      maxUnlockedAiLevel,
    });
    return res.data.data as AiProgressionSummary;
  }
}

export const aiChallengeService = new AiChallengeService();
