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
exports.PrismaMoveRepository = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../database/prisma/prisma.service");
const move_entity_1 = require("../../domain/game/entities/move.entity");
const position_vo_1 = require("../../domain/game/value-objects/position.vo");
let PrismaMoveRepository = class PrismaMoveRepository {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(move) {
        const created = await this.prisma.move.create({
            data: {
                id: move.id,
                gameId: move.gameId,
                moveNumber: move.moveNumber,
                player: move.player,
                fromSquare: move.from.value,
                toSquare: move.to.value,
                capturedSquares: move.capturedSquares.map((p) => p.value),
                isPromotion: move.isPromotion,
                isMultiCapture: move.isMultiCapture(),
                notation: move.notation,
                createdAt: move.createdAt,
            },
        });
        return this.toDomain(created);
    }
    async findById(id) {
        const move = await this.prisma.move.findUnique({
            where: { id },
        });
        if (!move) {
            return null;
        }
        return this.toDomain(move);
    }
    async findByGameId(gameId) {
        const moves = await this.prisma.move.findMany({
            where: { gameId },
            orderBy: { moveNumber: 'asc' },
        });
        return moves.map((m) => this.toDomain(m));
    }
    async findByGameIdPaginated(gameId, skip, take) {
        const moves = await this.prisma.move.findMany({
            where: { gameId },
            orderBy: { moveNumber: 'asc' },
            skip,
            take,
        });
        return moves.map((m) => this.toDomain(m));
    }
    async countByGameId(gameId) {
        return this.prisma.move.count({
            where: { gameId },
        });
    }
    async getLastMove(gameId) {
        const move = await this.prisma.move.findFirst({
            where: { gameId },
            orderBy: { moveNumber: 'desc' },
        });
        if (!move) {
            return null;
        }
        return this.toDomain(move);
    }
    async deleteByGameId(gameId) {
        await this.prisma.move.deleteMany({
            where: { gameId },
        });
    }
    toDomain(prismaMove) {
        return new move_entity_1.Move(prismaMove.id, prismaMove.gameId, prismaMove.moveNumber, prismaMove.player, new position_vo_1.Position(prismaMove.fromSquare), new position_vo_1.Position(prismaMove.toSquare), prismaMove.capturedSquares.map((s) => new position_vo_1.Position(s)), prismaMove.isPromotion, prismaMove.notation, prismaMove.createdAt);
    }
};
exports.PrismaMoveRepository = PrismaMoveRepository;
exports.PrismaMoveRepository = PrismaMoveRepository = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PrismaMoveRepository);
//# sourceMappingURL=prisma-move.repository.js.map