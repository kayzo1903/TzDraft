import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../infrastructure/database/prisma/prisma.service';
import { UserService } from '../domain/user/user.service';
import { RegisterDto, LoginDto, AuthResponseDto } from './dto';
export declare class AuthService {
    private prisma;
    private userService;
    private jwtService;
    private config;
    constructor(prisma: PrismaService, userService: UserService, jwtService: JwtService, config: ConfigService);
    register(dto: RegisterDto): Promise<AuthResponseDto>;
    login(dto: LoginDto): Promise<AuthResponseDto>;
    refreshTokens(refreshToken: string): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
    logout(userId: string, refreshToken: string): Promise<void>;
    verifyEmail(token: string): Promise<{
        message: string;
    }>;
    requestPasswordReset(email: string): Promise<{
        message: string;
    }>;
    resetPassword(token: string, newPassword: string): Promise<{
        message: string;
    }>;
    resetPasswordPhone(phoneNumber: string, code: string, newPassword: string): Promise<{
        message: string;
    }>;
    private generateTokens;
}
