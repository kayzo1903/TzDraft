export class AuthResponseDto {
  user: {
    id: string;
    phoneNumber: string;
    email?: string;
    username: string;
    displayName: string;
    isVerified: boolean;
    rating: number;
    country?: string;
    region?: string;
    role?: 'USER' | 'ADMIN';
    isBanned?: boolean;
    accountType?: 'REGISTERED' | 'GUEST' | 'OAUTH_PENDING';
    avatarUrl?: string;
  };
  accessToken: string;
  refreshToken: string;
}
