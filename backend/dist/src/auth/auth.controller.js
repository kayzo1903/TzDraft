"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const common_1 = require("@nestjs/common");
const auth_service_1 = require("./auth.service");
const otp_service_1 = require("./otp.service");
const google_oauth_guard_1 = require("./guards/google-oauth.guard");
const dto_1 = require("./dto");
const public_decorator_1 = require("./decorators/public.decorator");
const current_user_decorator_1 = require("./decorators/current-user.decorator");
const jwt_auth_guard_1 = require("./guards/jwt-auth.guard");
let AuthController = class AuthController {
    authService;
    otpService;
    constructor(authService, otpService) {
        this.authService = authService;
        this.otpService = otpService;
    }
    getCookie(req, name) {
        const raw = req.headers.cookie;
        if (!raw)
            return undefined;
        const parts = raw.split(';');
        for (const part of parts) {
            const [key, ...rest] = part.trim().split('=');
            if (key === name) {
                return rest.join('=');
            }
        }
        return undefined;
    }
    getCookieOptions() {
        const isProd = process.env.NODE_ENV === 'production';
        const cookieDomain = process.env.COOKIE_DOMAIN;
        return {
            httpOnly: true,
            secure: isProd,
            sameSite: 'lax',
            path: '/',
            ...(cookieDomain ? { domain: cookieDomain } : {}),
        };
    }
    async register(dto) {
        return this.authService.register(dto);
    }
    async login(dto) {
        return this.authService.login(dto);
    }
    async sendOtp(dto) {
        return this.otpService.sendOTP(dto.phoneNumber, dto.purpose);
    }
    async verifyOtp(dto) {
        await this.otpService.verifyOTP(dto.phoneNumber, dto.code, dto.purpose);
        return { success: true, message: 'Phone number verified successfully' };
    }
    async refresh(req, res, refreshToken) {
        const tokenFromCookie = this.getCookie(req, 'refreshToken');
        const token = refreshToken || tokenFromCookie;
        if (!token) {
            throw new common_1.UnauthorizedException('Missing refresh token');
        }
        const next = await this.authService.refreshTokens(token);
        const opts = this.getCookieOptions();
        res.cookie('accessToken', next.accessToken, opts);
        res.cookie('refreshToken', next.refreshToken, opts);
        return next;
    }
    async logout(user, refreshToken, req, res) {
        const tokenFromCookie = this.getCookie(req, 'refreshToken');
        const token = refreshToken || tokenFromCookie;
        if (token) {
            await this.authService.logout(user.id, token);
        }
        const opts = this.getCookieOptions();
        res.clearCookie('accessToken', opts);
        res.clearCookie('refreshToken', opts);
    }
    async getCurrentUser(user) {
        return user;
    }
    async verifyEmail(token) {
        return this.authService.verifyEmail(token);
    }
    async forgotPassword(email) {
        return this.authService.requestPasswordReset(email);
    }
    async resetPassword(token, newPassword) {
        return this.authService.resetPassword(token, newPassword);
    }
    async resetPasswordPhone(dto) {
        return this.authService.resetPasswordPhone(dto.phoneNumber, dto.code, dto.newPassword);
    }
    async googleAuth() {
    }
    async googleAuthCallback(user, res) {
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        const redirectUrl = `${frontendUrl}/auth/oauth-callback`;
        try {
            const { accessToken, refreshToken } = await this.authService.generateTokens(user.id);
            const opts = this.getCookieOptions();
            res.cookie('accessToken', accessToken, opts);
            res.cookie('refreshToken', refreshToken, opts);
            return res.redirect(redirectUrl);
        }
        catch {
            return res.redirect(`${frontendUrl}/auth/login?error=google_failed`);
        }
    }
};
exports.AuthController = AuthController;
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('register'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dto_1.RegisterDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "register", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('login'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dto_1.LoginDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "login", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('send-otp'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dto_1.SendOtpDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "sendOtp", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('verify-otp'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dto_1.VerifyOtpDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "verifyOtp", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('refresh'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)({ passthrough: true })),
    __param(2, (0, common_1.Body)('refreshToken')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, String]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "refresh", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)('logout'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)('refreshToken')),
    __param(2, (0, common_1.Req)()),
    __param(3, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "logout", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('me'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "getCurrentUser", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('verify-email'),
    __param(0, (0, common_1.Body)('token')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "verifyEmail", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('forgot-password'),
    __param(0, (0, common_1.Body)('email')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "forgotPassword", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('reset-password'),
    __param(0, (0, common_1.Body)('token')),
    __param(1, (0, common_1.Body)('newPassword')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "resetPassword", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('reset-password-phone'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dto_1.ResetPasswordPhoneDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "resetPasswordPhone", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)('google'),
    (0, common_1.UseGuards)(google_oauth_guard_1.GoogleOAuthGuard),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "googleAuth", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)('google/callback'),
    (0, common_1.UseGuards)(google_oauth_guard_1.GoogleOAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "googleAuthCallback", null);
exports.AuthController = AuthController = __decorate([
    (0, common_1.Controller)('auth'),
    __metadata("design:paramtypes", [auth_service_1.AuthService,
        otp_service_1.OtpService])
], AuthController);
//# sourceMappingURL=auth.controller.js.map