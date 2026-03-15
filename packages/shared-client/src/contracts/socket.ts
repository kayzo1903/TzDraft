export interface ClientToServerGameEvents {
  joinGame: (payload: { gameId: string }) => void;
  makeMove: (
    payload: { gameId: string; from: number; to: number },
    ack?: (response: { error?: string }) => void,
  ) => void;
  offerDraw: (
    payload: { gameId: string },
    ack?: (response: { error?: string }) => void,
  ) => void;
  acceptDraw: (
    payload: { gameId: string },
    ack?: (response: { error?: string }) => void,
  ) => void;
  declineDraw: (payload: { gameId: string }) => void;
  cancelDraw: (payload: { gameId: string }) => void;
  offerRematch: (payload: { gameId: string }) => void;
  acceptRematch: (payload: { gameId: string }) => void;
  declineRematch: (payload: { gameId: string }) => void;
  cancelRematch: (payload: { gameId: string }) => void;
  claimTimeout: (payload: { gameId: string }) => void;
}

export interface ServerToClientGameEvents {
  gameStateUpdated: (payload?: Record<string, unknown>) => void;
  gameOver: (payload: Record<string, unknown>) => void;
  drawOffered: (payload: { offeredByUserId: string }) => void;
  drawDeclined: () => void;
  drawCancelled: () => void;
  opponentDisconnected: (payload: {
    userId: string;
    secondsRemaining?: number;
  }) => void;
  opponentDisconnectCountdown: (payload: {
    userId: string;
    secondsRemaining: number;
  }) => void;
  opponentReconnected: () => void;
  rematchOffered: (payload: { offeredByUserId: string }) => void;
  rematchAccepted: (payload: { newGameId: string }) => void;
  rematchDeclined: () => void;
  rematchCancelled: () => void;
  autoRequeue: (payload: { timeMs: number }) => void;
}
