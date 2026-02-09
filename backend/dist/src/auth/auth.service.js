"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const bcrypt = __importStar(require("bcrypt"));
const prisma_service_1 = require("../infrastructure/database/prisma/prisma.service");
const user_service_1 = require("../domain/user/user.service");
const phone_util_1 = require("../shared/utils/phone.util");
const crypto = __importStar(require("crypto"));
let AuthService = class AuthService {
    prisma;
    userService;
    jwtService;
    config;
    constructor(prisma, userService, jwtService, config) {
        this.prisma = prisma;
        this.userService = userService;
        this.jwtService = jwtService;
        this.config = config;
    }
    async register(dto) {
        if (dto.password !== dto.confirmPassword) {
            throw new common_1.BadRequestException('Passwords do not match');
        }
        const phoneNumber = (0, phone_util_1.normalizePhoneNumber)(dto.phoneNumber);
        const existingUser = await this.prisma.user.findFirst({
            where: {
                OR: [
                    { phoneNumber },
                    { username: dto.username },
                    ...(dto.email ? [{ email: dto.email }] : []),
                ],
            },
        });
        if (existingUser) {
            throw new common_1.ConflictException('User with this phone number, username, or email already exists');
        }
        const hashedPassword = await bcrypt.hash(dto.password, 10);
        const user = await this.prisma.user.create({
            data: {
                phoneNumber,
                email: dto.email,
                username: dto.username,
                displayName: dto.displayName || dto.username,
                passwordHash: hashedPassword,
                country: dto.country,
                region: dto.region,
                rating: {
                    create: {
                        rating: 500,
                    },
                },
            },
            include: {
                rating: true,
            },
        });
        const { accessToken, refreshToken } = await this.generateTokens(user.id);
        return {
            user: {
                id: user.id,
                phoneNumber: user.phoneNumber,
                email: user.email ?? undefined,
                username: user.username,
                displayName: user.displayName,
                isVerified: user.isVerified,
                rating: user.rating?.rating || 1200,
            },
            accessToken,
            refreshToken,
        };
    }
    async login(dto) {
        const user = await this.prisma.user.findFirst({
            where: {
                OR: [
                    { phoneNumber: (0, phone_util_1.normalizePhoneNumber)(dto.identifier) },
                    { username: dto.identifier },
                ],
            },
            include: {
                rating: true,
            },
        });
        if (!user) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
        if (!isPasswordValid) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        await this.prisma.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() },
        });
        const { accessToken, refreshToken } = await this.generateTokens(user.id);
        return {
            user: {
                id: user.id,
                phoneNumber: user.phoneNumber,
                email: user.email ?? undefined,
                username: user.username,
                displayName: user.displayName,
                isVerified: user.isVerified,
                rating: user.rating?.rating || 1200,
            },
            accessToken,
            refreshToken,
        };
    }
    async refreshTokens(refreshToken) {
        const tokenRecord = await this.prisma.refreshToken.findUnique({
            where: { token: refreshToken },
            include: { user: true },
        });
        if (!tokenRecord || tokenRecord.expiresAt < new Date()) {
            throw new common_1.UnauthorizedException('Invalid refresh token');
        }
        await this.prisma.refreshToken.delete({
            where: { id: tokenRecord.id },
        });
        return this.generateTokens(tokenRecord.userId);
    }
    async logout(userId, refreshToken) {
        await this.prisma.refreshToken.deleteMany({
            where: {
                userId,
                token: refreshToken,
            },
        });
    }
    async verifyEmail(token) {
        const verificationToken = await this.prisma.verificationToken.findUnique({
            where: { token },
        });
        if (!verificationToken || verificationToken.expiresAt < new Date()) {
            throw new common_1.BadRequestException('Invalid or expired verification token');
        }
        await this.prisma.user.update({
            where: { id: verificationToken.userId },
            data: { isVerified: true },
        });
        await this.prisma.verificationToken.delete({
            where: { id: verificationToken.id },
        });
        return { message: 'Email verified successfully' };
    }
    async requestPasswordReset(email) {
        const user = await this.prisma.user.findUnique({
            where: { email },
        });
        if (!user) {
            return {
                message: 'If an account with that email exists, a password reset link has been sent',
            };
        }
        await this.prisma.passwordResetToken.deleteMany({
            where: { userId: user.id },
        });
        const resetToken = crypto.randomBytes(32).toString('hex');
        await this.prisma.passwordResetToken.create({
            data: {
                userId: user.id,
                token: resetToken,
                expiresAt: new Date(Date.now() + 60 * 60 * 1000),
            },
        });
        console.log(`Password reset token for ${user.email}: ${resetToken}`);
        return {
            message: 'If an account with that email exists, a password reset link has been sent',
        };
    }
    async resetPassword(token, newPassword) {
        const resetToken = await this.prisma.passwordResetToken.findUnique({
            where: { token },
        });
        if (!resetToken || resetToken.expiresAt < new Date()) {
            throw new common_1.BadRequestException('Invalid or expired reset token');
        }
        const passwordHash = await bcrypt.hash(newPassword, 10);
        await this.prisma.user.update({
            where: { id: resetToken.userId },
            data: { passwordHash },
        });
        await this.prisma.passwordResetToken.delete({
            where: { id: resetToken.id },
        });
        return { message: 'Password reset successfully' };
    }
    async resetPasswordPhone(phoneNumber, code, newPassword) {
        const normalized = (0, phone_util_1.normalizePhoneNumber)(phoneNumber);
        const otpRecord = await this.prisma.otpCode.findFirst({
            where: {
                phoneNumber: normalized,
                code,
                verified: true,
                createdAt: {
                    gt: new Date(Date.now() - 15 * 60 * 1000),
                },
            },
            orderBy: { createdAt: 'desc' },
        });
        if (!otpRecord) {
            throw new common_1.BadRequestException('Invalid or expired OTP verification. Please verify your phone number again.');
        }
        const user = await this.prisma.user.findUnique({
            where: { phoneNumber: normalized },
        });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        const passwordHash = await bcrypt.hash(newPassword, 10);
        await this.prisma.user.update({
            where: { id: user.id },
            data: { passwordHash },
        });
        await this.prisma.otpCode.delete({
            where: { id: otpRecord.id },
        });
        return { message: 'Password reset successfully' };
    }
    async generateTokens(userId) {
        const accessToken = this.jwtService.sign({ sub: userId }, {
            secret: this.config.get('JWT_SECRET'),
            expiresIn: '15m',
        });
        const refreshToken = this.jwtService.sign({ sub: userId, type: 'refresh' }, {
            secret: this.config.get('JWT_REFRESH_SECRET'),
            expiresIn: '7d',
        });
        await this.prisma.refreshToken.create({
            data: {
                userId,
                token: refreshToken,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            },
        });
        return { accessToken, refreshToken };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        user_service_1.UserService,
        jwt_1.JwtService,
        config_1.ConfigService])
], AuthService);
//# sourceMappingURL=auth.service.js.map