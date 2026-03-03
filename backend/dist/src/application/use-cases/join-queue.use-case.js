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
exports.JoinQueueUseCase = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const crypto_1 = require("crypto");
const game_entity_1 = require("../../domain/game/entities/game.entity");
const game_constants_1 = require("../../shared/constants/game.constants");
const prisma_service_1 = require("../../infrastructure/database/prisma/prisma.service");
const STALE_QUEUE_AGE_MS = 1 * 60 * 1000;
const MAX_TX_RETRIES = 5;
let JoinQueueUseCase = class JoinQueueUseCase {
    matchmakingRepo;
    prisma;
    constructor(matchmakingRepo, prisma) {
        this.matchmakingRepo = matchmakingRepo;
        this.prisma = prisma;
    }
    async execute(userId, timeMs, socketId, userRating) {
        for (let attempt = 0; attempt < MAX_TX_RETRIES; attempt += 1) {
            try {
                const txResult = await this.prisma.$transaction(async (tx) => {
                    const staleCutoff = new Date(Date.now() - STALE_QUEUE_AGE_MS);
                    await tx.matchmakingQueue.deleteMany({
                        where: { joinedAt: { lt: staleCutoff } },
                    });
                    await tx.matchmakingQueue.deleteMany({ where: { userId } });
                    const selfActiveGameCount = await tx.game.count({
                        where: {
                            status: { in: [game_constants_1.GameStatus.WAITING, game_constants_1.GameStatus.ACTIVE] },
                            OR: [{ whitePlayerId: userId }, { blackPlayerId: userId }],
                        },
                    });
                    if (selfActiveGameCount > 0) {
                        return { status: 'waiting' };
                    }
                    const opponent = await tx.matchmakingQueue.findFirst({
                        where: {
                            timeMs,
                            userId: { not: userId },
                        },
                        orderBy: { joinedAt: 'asc' },
                    });
                    if (opponent) {
                        const claim = await tx.matchmakingQueue.deleteMany({
                            where: { id: opponent.id },
                        });
                        if (claim.count !== 1) {
                            return { status: 'retry' };
                        }
                        const opponentActiveGameCount = await tx.game.count({
                            where: {
                                status: { in: [game_constants_1.GameStatus.WAITING, game_constants_1.GameStatus.ACTIVE] },
                                OR: [
                                    { whitePlayerId: opponent.userId },
                                    { blackPlayerId: opponent.userId },
                                ],
                            },
                        });
                        if (opponentActiveGameCount > 0) {
                            return { status: 'retry' };
                        }
                        const [whiteId, blackId] = Math.random() < 0.5
                            ? [userId, opponent.userId]
                            : [opponent.userId, userId];
                        const game = new game_entity_1.Game((0, crypto_1.randomUUID)(), whiteId, blackId, game_constants_1.GameType.CASUAL, null, null, null, timeMs, undefined);
                        game.start();
                        await tx.game.create({
                            data: {
                                id: game.id,
                                status: game.status,
                                gameType: game.gameType,
                                ruleVersion: game.ruleVersion,
                                initialTimeMs: game.initialTimeMs,
                                whitePlayerId: game.whitePlayerId,
                                blackPlayerId: game.blackPlayerId,
                                whiteElo: game.whiteElo,
                                blackElo: game.blackElo,
                                aiLevel: game.aiLevel,
                                inviteCode: game.inviteCode,
                                creatorColor: game.creatorColor,
                                winner: game.winner,
                                endReason: game.endReason,
                                createdAt: game.createdAt,
                                startedAt: game.startedAt,
                                endedAt: game.endedAt,
                                clock: {
                                    create: {
                                        whiteTimeMs: game.initialTimeMs,
                                        blackTimeMs: game.initialTimeMs,
                                        lastMoveAt: new Date(),
                                    },
                                },
                            },
                        });
                        return {
                            status: 'matched',
                            gameId: game.id,
                            opponentUserId: opponent.userId,
                        };
                    }
                    await tx.matchmakingQueue.upsert({
                        where: { userId },
                        update: {
                            timeMs,
                            socketId,
                            joinedAt: new Date(),
                            rating: userRating ?? null,
                            rd: null,
                            volatility: null,
                        },
                        create: {
                            userId,
                            timeMs,
                            socketId,
                            rating: userRating ?? null,
                            rd: null,
                            volatility: null,
                        },
                    });
                    return { status: 'waiting' };
                }, { isolationLevel: client_1.Prisma.TransactionIsolationLevel.Serializable });
                if (txResult.status === 'retry') {
                    continue;
                }
                return txResult;
            }
            catch (error) {
                if (error instanceof client_1.Prisma.PrismaClientKnownRequestError &&
                    error.code === 'P2034') {
                    continue;
                }
                throw error;
            }
        }
        await this.matchmakingRepo.upsert({
            userId,
            timeMs,
            socketId,
            rating: userRating ?? null,
            rd: null,
            volatility: null,
        });
        return { status: 'waiting' };
    }
    async cancelQueue(userId) {
        await this.matchmakingRepo.remove(userId);
    }
};
exports.JoinQueueUseCase = JoinQueueUseCase;
exports.JoinQueueUseCase = JoinQueueUseCase = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('IMatchmakingRepository')),
    __metadata("design:paramtypes", [Object, prisma_service_1.PrismaService])
], JoinQueueUseCase);
//# sourceMappingURL=join-queue.use-case.js.map