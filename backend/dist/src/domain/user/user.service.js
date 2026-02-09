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
exports.UserService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../infrastructure/database/prisma/prisma.service");
const bcrypt = __importStar(require("bcrypt"));
const phone_util_1 = require("../../shared/utils/phone.util");
let UserService = class UserService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findByPhoneNumber(phoneNumber) {
        return this.prisma.user.findUnique({
            where: { phoneNumber },
            include: { rating: true },
        });
    }
    async findByIdentifier(identifier) {
        const isPhone = identifier.startsWith('+') ||
            identifier.startsWith('0') ||
            /^\d+$/.test(identifier);
        if (isPhone) {
            const normalized = (0, phone_util_1.normalizePhoneNumber)(identifier);
            return this.prisma.user.findFirst({
                where: { phoneNumber: normalized },
                include: { rating: true },
            });
        }
        else {
            return this.prisma.user.findFirst({
                where: { username: identifier },
                include: { rating: true },
            });
        }
    }
    async findById(id) {
        return this.prisma.user.findUnique({
            where: { id },
            include: {
                rating: true,
            },
        });
    }
    async create(data) {
        const hashedPassword = await bcrypt.hash(data.password, 10);
        const user = await this.prisma.user.create({
            data: {
                phoneNumber: data.phoneNumber,
                email: data.email,
                username: data.username,
                passwordHash: hashedPassword,
                displayName: data.displayName || data.username,
                country: data.country || 'TZ',
                region: data.region,
                rating: {
                    create: {
                        rating: 1200,
                        gamesPlayed: 0,
                    },
                },
            },
            include: {
                rating: true,
            },
        });
        return user;
    }
};
exports.UserService = UserService;
exports.UserService = UserService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], UserService);
//# sourceMappingURL=user.service.js.map