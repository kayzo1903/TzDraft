import axiosInstance from "@/lib/axios";
import { PieceType, PlayerColor } from "@tzdraft/official-engine";

export type SidraMoveRequest = {
  pieces: {
    type: PieceType;
    color: PlayerColor;
    position: number;
  }[];
  currentPlayer: PlayerColor;
  moveCount: number;
  timeLimitMs?: number;
};

export type SidraMoveResponse = {
  move: {
    from: number;
    to: number;
    capturedSquares: number[];
    isPromotion: boolean;
  } | null;
};

export const requestSidraMove = async (payload: SidraMoveRequest) => {
  const response = await axiosInstance.post<SidraMoveResponse>(
    "/engines/sidra/move",
    payload,
  );
  return response.data;
};
