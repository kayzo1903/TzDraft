export declare class AuthResponseDto {
    user: {
        id: string;
        phoneNumber: string;
        email?: string;
        username: string;
        displayName: string;
        isVerified: boolean;
        rating: number;
    };
    accessToken: string;
    refreshToken: string;
}
