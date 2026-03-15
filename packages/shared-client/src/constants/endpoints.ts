export const AUTH_ENDPOINTS = {
  guest: "/auth/guest",
  login: "/auth/login",
  logout: "/auth/logout",
  me: "/auth/me",
  refresh: "/auth/refresh",
  register: "/auth/register",
  forgotPassword: "/auth/forgot-password",
  resetPassword: "/auth/reset-password",
  sendOtp: "/auth/send-otp",
  verifyOtp: "/auth/verify-otp",
  resetPasswordPhone: "/auth/reset-password-phone",
} as const;

export const GAME_ENDPOINTS = {
  base: "/games",
  queueJoin: "/games/queue/join",
  queueCancel: "/games/queue/cancel",
  pve: "/games/pve",
  invite: "/games/invite",
  byId: (gameId: string) => `/games/${gameId}`,
  start: (gameId: string) => `/games/${gameId}/start`,
  moves: (gameId: string) => `/games/${gameId}/moves`,
  legalMoves: (gameId: string) => `/games/${gameId}/moves/legal`,
  resign: (gameId: string) => `/games/${gameId}/resign`,
  draw: (gameId: string) => `/games/${gameId}/draw`,
  abort: (gameId: string) => `/games/${gameId}/abort`,
  inviteJoin: (code: string) => `/games/invite/${code}/join`,
} as const;
