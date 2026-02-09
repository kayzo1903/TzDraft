export interface User {
  id: string;
  phoneNumber: string;
  email?: string;
  username: string;
  displayName: string;
  isVerified: boolean;
  rating: number;
}

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, accessToken: string, refreshToken: string) => void;
  clearAuth: () => void;
  updateUser: (user: Partial<User>) => void;
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
  accessToken: string;
  refreshToken: string;
}

export interface OtpData {
  phoneNumber: string;
  code?: string;
}
