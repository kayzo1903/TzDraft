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
exports.JwtStrategy = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const passport_jwt_1 = require("passport-jwt");
const config_1 = require("@nestjs/config");
const prisma_service_1 = require("../../infrastructure/database/prisma/prisma.service");
let JwtStrategy = class JwtStrategy extends (0, passport_1.PassportStrategy)(passport_jwt_1.Strategy) {
    config;
    prisma;
    constructor(config, prisma) {
        const secret = config.get('JWT_SECRET');
        if (!secret) {
            throw new Error('JWT_SECRET is not defined in environment variables');
        }
        super({
            jwtFromRequest: passport_jwt_1.ExtractJwt.fromAuthHeaderAsBearerToken(),
            secretOrKey: secret,
        });
        this.config = config;
        this.prisma = prisma;
    }
    async validate(payload) {
        const user = await this.prisma.user.findUnique({
            where: { id: payload.sub },
            select: {
                id: true,
                phoneNumber: true,
                email: true,
                username: true,
                displayName: true,
                isVerified: true,
                rating: {
                    select: {
                        rating: true,
                    },
                },
            },
        });
        if (!user) {
            throw new common_1.UnauthorizedException();
        }
        const hasRealPhoneNumber = user.phoneNumber.startsWith('+255');
        if (hasRealPhoneNumber && !user.isVerified) {
            await this.prisma.user.update({
                where: { id: user.id },
                data: { isVerified: true },
            });
        }
        return {
            id: user.id,
            phoneNumber: hasRealPhoneNumber ? user.phoneNumber : '',
            email: user.email ?? undefined,
            username: user.username,
            displayName: user.displayName,
            isVerified: hasRealPhoneNumber ? true : false,
            rating: user.rating?.rating ?? 1200,
        };
    }
};
exports.JwtStrategy = JwtStrategy;
exports.JwtStrategy = JwtStrategy = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        prisma_service_1.PrismaService])
], JwtStrategy);
//# sourceMappingURL=jwt.strategy.js.map