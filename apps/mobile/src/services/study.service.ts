import api from "../lib/api";
import type { FreeMoveRecord } from "../hooks/useFreeGame";

export interface SaveStudyPayload {
  name: string;
  description?: string;
  fenHistory: string[];
  moveHistory: FreeMoveRecord[];
  moveCount: number;
}

export interface SavedStudySummary {
  id: string;
  name: string;
  description: string | null;
  moveCount: number;
  status: string;
  createdAt: string;
}

export interface SavedStudyDetail extends SavedStudySummary {
  fenHistory: string[];
  moveHistory: FreeMoveRecord[];
}

class StudyService {
  async saveStudy(payload: SaveStudyPayload): Promise<SavedStudySummary> {
    const res = await api.post("/studies", payload);
    return res.data.data as SavedStudySummary;
  }

  async listMine(): Promise<SavedStudySummary[]> {
    const res = await api.get("/studies/mine");
    return res.data.data as SavedStudySummary[];
  }

  async getStudy(id: string): Promise<SavedStudyDetail> {
    const res = await api.get(`/studies/${id}`);
    return res.data.data as SavedStudyDetail;
  }
}

export const studyService = new StudyService();
