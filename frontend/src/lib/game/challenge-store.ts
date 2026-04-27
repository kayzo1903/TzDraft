import { create } from "zustand";

export interface IncomingChallenge {
  challengerId: string;
  challengerName: string;
  challengerAvatarUrl?: string | null;
  challengerRating?: number;
  inviteCode: string;
  gameId: string;
}

export interface ChallengeState {
  incomingChallenge: IncomingChallenge | null;
  outgoingChallenge: {
    username: string;
    displayName: string;
    avatarUrl?: string;
    rating?: number;
    gameId?: string;
  } | null;
  
  setIncomingChallenge: (challenge: IncomingChallenge | null) => void;
  setOutgoingChallenge: (challenge: ChallengeState["outgoingChallenge"]) => void;
  clearChallenges: () => void;
}

export const useChallengeStore = create<ChallengeState>((set) => ({
  incomingChallenge: null,
  outgoingChallenge: null,

  setIncomingChallenge: (incomingChallenge) => set({ incomingChallenge }),
  setOutgoingChallenge: (outgoingChallenge) => set({ outgoingChallenge }),
  clearChallenges: () => set({ incomingChallenge: null, outgoingChallenge: null }),
}));
