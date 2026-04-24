export interface Rating {
  id: string;
  userId: string;
  rating: number;
  gamesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
}

export interface User {
  id: string;
  phoneNumber: string;
  email?: string;
  username: string;
  displayName: string;
  isVerified: boolean;
  accountType: "REGISTERED" | "GUEST" | "OAUTH_PENDING";
  rating: number | Rating;
  role?: 'USER' | 'ADMIN';
  isBanned?: boolean;
  country?: string | null;
  region?: string | null;
  termsAcceptedAt?: string | null;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  hasHydrated: boolean;
  setAuth: (user: User) => void;
  clearAuth: () => void;
  updateUser: (user: Partial<User>) => void;
  setHasHydrated: (value: boolean) => void;
}

export interface RegisterData {
  phoneNumber: string;
  username: string;
  password: string;
  confirmPassword: string;
  displayName?: string;
  email?: string;
  country?: string;
  region?: string;
}

export interface LoginData {
  identifier: string; // Can be phone number or username
  password: string;
}

export interface AuthResponse {
  user: User;
  // accessToken and refreshToken are set as httpOnly cookies by the backend
  // and intentionally not exposed to JavaScript
}

export interface OtpData {
  phoneNumber: string;
  code?: string;
}
