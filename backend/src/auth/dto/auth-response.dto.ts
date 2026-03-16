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
  };
  accessToken: string;
  refreshToken: string;
}
