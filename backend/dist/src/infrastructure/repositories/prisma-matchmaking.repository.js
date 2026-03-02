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
exports.PrismaMatchmakingRepository = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../database/prisma/prisma.service");
let PrismaMatchmakingRepository = class PrismaMatchmakingRepository {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async upsert(entry) {
        const row = await this.prisma.matchmakingQueue.upsert({
            where: { userId: entry.userId },
            update: {
                timeMs: entry.timeMs,
                socketId: entry.socketId,
                joinedAt: new Date(),
                rating: entry.rating ?? null,
                rd: entry.rd ?? null,
                volatility: entry.volatility ?? null,
            },
            create: {
                userId: entry.userId,
                timeMs: entry.timeMs,
                socketId: entry.socketId,
                rating: entry.rating ?? null,
                rd: entry.rd ?? null,
                volatility: entry.volatility ?? null,
            },
        });
        return this.toDomain(row);
    }
    async findOldestMatch(timeMs, excludeUserId) {
        const row = await this.prisma.matchmakingQueue.findFirst({
            where: {
                timeMs,
                userId: { not: excludeUserId },
            },
            orderBy: { joinedAt: 'asc' },
        });
        return row ? this.toDomain(row) : null;
    }
    async remove(userId) {
        await this.prisma.matchmakingQueue
            .delete({ where: { userId } })
            .catch(() => {
        });
    }
    async removeStale(maxAgeMs) {
        const cutoff = new Date(Date.now() - maxAgeMs);
        await this.prisma.matchmakingQueue.deleteMany({
            where: { joinedAt: { lt: cutoff } },
        });
    }
    toDomain(row) {
        return {
            id: row.id,
            userId: row.userId,
            timeMs: row.timeMs,
            socketId: row.socketId,
            joinedAt: row.joinedAt,
            rating: row.rating,
            rd: row.rd,
            volatility: row.volatility,
        };
    }
};
exports.PrismaMatchmakingRepository = PrismaMatchmakingRepository;
exports.PrismaMatchmakingRepository = PrismaMatchmakingRepository = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PrismaMatchmakingRepository);
//# sourceMappingURL=prisma-matchmaking.repository.js.map