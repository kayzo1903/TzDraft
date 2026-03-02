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
const crypto_1 = require("crypto");
const game_entity_1 = require("../../domain/game/entities/game.entity");
const game_constants_1 = require("../../shared/constants/game.constants");
const STALE_QUEUE_AGE_MS = 3 * 60 * 1000;
let JoinQueueUseCase = class JoinQueueUseCase {
    matchmakingRepo;
    gameRepo;
    constructor(matchmakingRepo, gameRepo) {
        this.matchmakingRepo = matchmakingRepo;
        this.gameRepo = gameRepo;
    }
    async execute(userId, timeMs, socketId, userRating) {
        await this.matchmakingRepo.removeStale(STALE_QUEUE_AGE_MS);
        await this.matchmakingRepo.remove(userId);
        const opponent = await this.matchmakingRepo.findOldestMatch(timeMs, userId);
        if (opponent) {
            await this.matchmakingRepo.remove(opponent.userId);
            const [whiteId, blackId] = Math.random() < 0.5
                ? [userId, opponent.userId]
                : [opponent.userId, userId];
            const game = new game_entity_1.Game((0, crypto_1.randomUUID)(), whiteId, blackId, game_constants_1.GameType.CASUAL, null, null, null, timeMs, undefined);
            game.start();
            const created = await this.gameRepo.create(game);
            return {
                status: 'matched',
                gameId: created.id,
                opponentSocketId: opponent.socketId,
            };
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
    __param(1, (0, common_1.Inject)('IGameRepository')),
    __metadata("design:paramtypes", [Object, Object])
], JoinQueueUseCase);
//# sourceMappingURL=join-queue.use-case.js.map