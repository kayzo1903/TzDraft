import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { OtpService } from './otp.service';
import { RegisterDto, LoginDto, SendOtpDto, VerifyOtpDto, ResetPasswordPhoneDto } from './dto';
export declare class AuthController {
    private authService;
    private otpService;
    constructor(authService: AuthService, otpService: OtpService);
    private getCookie;
    private getCookieOptions;
    register(dto: RegisterDto): Promise<import("./dto").AuthResponseDto>;
    login(dto: LoginDto): Promise<import("./dto").AuthResponseDto>;
    sendOtp(dto: SendOtpDto): Promise<{
        success: boolean;
        message: string;
    }>;
    verifyOtp(dto: VerifyOtpDto): Promise<{
        success: boolean;
        message: string;
    }>;
    refresh(req: Request, res: Response, refreshToken?: string): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
    logout(user: any, refreshToken: string, req: Request, res: Response): Promise<void>;
    getCurrentUser(user: any): Promise<any>;
    verifyEmail(token: string): Promise<{
        message: string;
    }>;
    forgotPassword(email: string): Promise<{
        message: string;
    }>;
    resetPassword(token: string, newPassword: string): Promise<{
        message: string;
    }>;
    resetPasswordPhone(dto: ResetPasswordPhoneDto): Promise<{
        message: string;
    }>;
    googleAuth(): Promise<void>;
    googleAuthCallback(user: any, res: Response): Promise<void>;
}
