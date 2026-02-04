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
exports.PrismaGameRepository = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../database/prisma/prisma.service");
const game_entity_1 = require("../../domain/game/entities/game.entity");
const game_constants_1 = require("../../shared/constants/game.constants");
let PrismaGameRepository = class PrismaGameRepository {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(game) {
        const created = await this.prisma.game.create({
            data: {
                id: game.id,
                status: game.status,
                gameType: game.gameType,
                ruleVersion: game.ruleVersion,
                whitePlayerId: game.whitePlayerId,
                blackPlayerId: game.blackPlayerId,
                whiteElo: game.whiteElo,
                blackElo: game.blackElo,
                aiLevel: game.aiLevel,
                currentTurn: game.currentTurn,
                winner: game.winner,
                endReason: game.endReason,
                createdAt: game.createdAt,
                startedAt: game.startedAt,
                endedAt: game.endedAt,
            },
        });
        return this.toDomain(created);
    }
    async findById(id) {
        const game = await this.prisma.game.findUnique({
            where: { id },
            include: {
                moves: {
                    orderBy: { moveNumber: 'asc' },
                },
            },
        });
        if (!game) {
            return null;
        }
        return this.toDomain(game);
    }
    async update(game) {
        const updated = await this.prisma.game.update({
            where: { id: game.id },
            data: {
                status: game.status,
                currentTurn: game.currentTurn,
                winner: game.winner,
                endReason: game.endReason,
                startedAt: game.startedAt,
                endedAt: game.endedAt,
            },
        });
        return this.toDomain(updated);
    }
    async findActiveGamesByPlayer(playerId) {
        const games = await this.prisma.game.findMany({
            where: {
                OR: [{ whitePlayerId: playerId }, { blackPlayerId: playerId }],
                status: {
                    in: [game_constants_1.GameStatus.WAITING, game_constants_1.GameStatus.ACTIVE],
                },
            },
            include: {
                moves: {
                    orderBy: { moveNumber: 'asc' },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
        return games.map((g) => this.toDomain(g));
    }
    async findByStatus(status) {
        const games = await this.prisma.game.findMany({
            where: { status },
            include: {
                moves: {
                    orderBy: { moveNumber: 'asc' },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
        return games.map((g) => this.toDomain(g));
    }
    async findByType(gameType) {
        const games = await this.prisma.game.findMany({
            where: { gameType },
            include: {
                moves: {
                    orderBy: { moveNumber: 'asc' },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
        return games.map((g) => this.toDomain(g));
    }
    async delete(id) {
        await this.prisma.game.delete({
            where: { id },
        });
    }
    async findRecentGamesByPlayer(playerId, limit) {
        const games = await this.prisma.game.findMany({
            where: {
                OR: [{ whitePlayerId: playerId }, { blackPlayerId: playerId }],
            },
            include: {
                moves: {
                    orderBy: { moveNumber: 'asc' },
                },
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
        });
        return games.map((g) => this.toDomain(g));
    }
    async countGamesByPlayer(playerId) {
        return this.prisma.game.count({
            where: {
                OR: [{ whitePlayerId: playerId }, { blackPlayerId: playerId }],
            },
        });
    }
    toDomain(prismaGame) {
        const game = new game_entity_1.Game(prismaGame.id, prismaGame.whitePlayerId, prismaGame.blackPlayerId, prismaGame.gameType, prismaGame.whiteElo, prismaGame.blackElo, prismaGame.aiLevel, prismaGame.createdAt, prismaGame.startedAt, prismaGame.endedAt, prismaGame.status, prismaGame.winner, prismaGame.endReason, prismaGame.currentTurn);
        return game;
    }
};
exports.PrismaGameRepository = PrismaGameRepository;
exports.PrismaGameRepository = PrismaGameRepository = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PrismaGameRepository);
//# sourceMappingURL=prisma-game.repository.js.map