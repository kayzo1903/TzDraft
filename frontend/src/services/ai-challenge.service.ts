import axiosInstance from "@/lib/axios";

export type AiChallengeResult = "WIN" | "LOSS" | "DRAW";
export type AiChallengePlayerColor = "WHITE" | "BLACK";

export interface AiProgression {
  highestAiLevelPlayed: number;
  highestAiLevelBeaten: number;
  highestUnlockedAiLevel: number;
  completedLevels: number[];
  initialFreeLevels: number;
  totalLevels: number;
}

export const aiChallengeService = {
  async getProgression(): Promise<AiProgression> {
    const response = await axiosInstance.get("/games/ai/progression");
    return response.data.data;
  },

  async syncLocalProgress(input: {
    completedLevels: number[];
    maxUnlockedAiLevel: number;
  }): Promise<AiProgression> {
    const response = await axiosInstance.post("/games/ai/progression/sync", input);
    return response.data.data;
  },

  async startSession(input: {
    aiLevel: number;
    playerColor: AiChallengePlayerColor;
  }): Promise<{ sessionId: string; progression: AiProgression }> {
    const response = await axiosInstance.post("/games/ai/sessions", input);
    return response.data.data;
  },

  async completeSession(
    sessionId: string,
    input: { result: AiChallengeResult; undoUsed: boolean },
  ): Promise<AiProgression> {
    const response = await axiosInstance.post(`/games/ai/sessions/${sessionId}/complete`, input);
    return response.data.data;
  },
};
