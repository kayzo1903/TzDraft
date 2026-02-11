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
Object.defineProperty(exports, "__esModule", { value: true });
exports.OtpService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../infrastructure/database/prisma/prisma.service");
const beam_africa_service_1 = require("../infrastructure/sms/beam-africa.service");
const phone_util_1 = require("../shared/utils/phone.util");
let OtpService = class OtpService {
    prisma;
    beamAfrica;
    constructor(prisma, beamAfrica) {
        this.prisma = prisma;
        this.beamAfrica = beamAfrica;
    }
    generateCode() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }
    async sendOTP(phoneNumber, purpose = 'signup') {
        const normalized = (0, phone_util_1.normalizePhoneNumber)(phoneNumber);
        const existingUser = await this.prisma.user.findUnique({
            where: { phoneNumber: normalized },
        });
        if (purpose === 'signup' && existingUser) {
            throw new common_1.BadRequestException('User with this phone number already exists');
        }
        if ((purpose === 'password_reset' || purpose === 'verify_phone') && !existingUser) {
            throw new common_1.BadRequestException('User with this phone number does not exist');
        }
        const code = this.generateCode();
        await this.prisma.otpCode.create({
            data: {
                phoneNumber: normalized,
                userId: existingUser?.id ?? null,
                code,
                expiresAt: new Date(Date.now() + 5 * 60 * 1000),
            },
        });
        const sent = await this.beamAfrica.sendOTP(normalized, code);
        if (!sent) {
            throw new common_1.BadRequestException('Failed to send OTP. Please try again.');
        }
        return {
            success: true,
            message: 'OTP sent successfully',
        };
    }
    async verifyOTP(phoneNumber, code, _purpose = 'signup') {
        const normalized = (0, phone_util_1.normalizePhoneNumber)(phoneNumber);
        const otpRecord = await this.prisma.otpCode.findFirst({
            where: {
                phoneNumber: normalized,
                code,
                verified: false,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
        if (!otpRecord) {
            throw new common_1.BadRequestException('Invalid OTP code');
        }
        if (otpRecord.expiresAt < new Date()) {
            throw new common_1.BadRequestException('OTP code has expired');
        }
        await this.prisma.otpCode.update({
            where: { id: otpRecord.id },
            data: { verified: true },
        });
        const user = await this.prisma.user.findUnique({
            where: { phoneNumber: normalized },
        });
        if (user && !user.isVerified) {
            await this.prisma.user.update({
                where: { id: user.id },
                data: { isVerified: true },
            });
        }
        return true;
    }
    async cleanupExpiredOTPs() {
        await this.prisma.otpCode.deleteMany({
            where: {
                expiresAt: {
                    lt: new Date(),
                },
            },
        });
    }
};
exports.OtpService = OtpService;
exports.OtpService = OtpService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        beam_africa_service_1.BeamAfricaService])
], OtpService);
//# sourceMappingURL=otp.service.js.map