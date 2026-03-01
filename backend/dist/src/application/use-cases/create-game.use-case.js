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
exports.CreateGameUseCase = void 0;
const common_1 = require("@nestjs/common");
const game_entity_1 = require("../../domain/game/entities/game.entity");
const game_constants_1 = require("../../shared/constants/game.constants");
const crypto_1 = require("crypto");
function generateInviteCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
}
let CreateGameUseCase = class CreateGameUseCase {
    gameRepository;
    constructor(gameRepository) {
        this.gameRepository = gameRepository;
    }
    async createPvPGame(whitePlayerId, blackPlayerId, whiteElo, blackElo) {
        const game = new game_entity_1.Game((0, crypto_1.randomUUID)(), whitePlayerId, blackPlayerId, game_constants_1.GameType.RANKED, whiteElo, blackElo, null, 600000, undefined);
        game.start();
        return this.gameRepository.create(game);
    }
    async createPvEGame(playerId, playerColor, playerElo, aiLevel, dto = {}) {
        const whitePlayerId = playerColor === game_constants_1.PlayerColor.WHITE ? playerId : 'AI';
        const blackPlayerId = playerColor === game_constants_1.PlayerColor.BLACK ? playerId : 'AI';
        const whiteElo = playerColor === game_constants_1.PlayerColor.WHITE ? playerElo : null;
        const blackElo = playerColor === game_constants_1.PlayerColor.BLACK ? playerElo : null;
        const game = new game_entity_1.Game((0, crypto_1.randomUUID)(), whitePlayerId, blackPlayerId, game_constants_1.GameType.AI, whiteElo, blackElo, aiLevel, dto.initialTimeMs || 600000, undefined);
        game.start();
        return this.gameRepository.create(game);
    }
    async createInviteGame(creatorId, creatorColor, creatorElo, initialTimeMs) {
        await this.gameRepository.expireStaleInvitesByPlayer(creatorId);
        const inviteCode = generateInviteCode();
        const whitePlayerId = creatorColor === game_constants_1.PlayerColor.WHITE ? creatorId : null;
        const blackPlayerId = creatorColor === game_constants_1.PlayerColor.BLACK ? creatorId : null;
        const whiteElo = creatorColor === game_constants_1.PlayerColor.WHITE ? creatorElo : null;
        const blackElo = creatorColor === game_constants_1.PlayerColor.BLACK ? creatorElo : null;
        const game = new game_entity_1.Game((0, crypto_1.randomUUID)(), whitePlayerId, blackPlayerId, game_constants_1.GameType.CASUAL, whiteElo, blackElo, null, initialTimeMs, undefined, new Date(), null, null, game_constants_1.GameStatus.WAITING, null, null, creatorColor, inviteCode);
        const created = await this.gameRepository.create(game);
        return { game: created, inviteCode };
    }
    async joinInviteGame(code, joinerId) {
        const game = await this.gameRepository.findByInviteCode(code);
        if (!game) {
            throw new common_1.NotFoundException('Invite code not found');
        }
        if (game.status !== game_constants_1.GameStatus.WAITING) {
            throw new common_1.BadRequestException('This game is no longer available');
        }
        if (game.whitePlayerId === joinerId || game.blackPlayerId === joinerId) {
            throw new common_1.BadRequestException('You cannot join your own game');
        }
        return this.gameRepository.joinInvite(game.id, joinerId);
    }
    async createRematch(originalGameId) {
        const original = await this.gameRepository.findById(originalGameId);
        if (!original)
            throw new common_1.NotFoundException('Original game not found');
        if (!original.blackPlayerId) {
            throw new common_1.BadRequestException('Cannot rematch a game that never started');
        }
        const newWhiteId = original.blackPlayerId;
        const newBlackId = original.whitePlayerId;
        const game = new game_entity_1.Game((0, crypto_1.randomUUID)(), newWhiteId, newBlackId, game_constants_1.GameType.CASUAL, original.blackElo ?? 1200, original.whiteElo ?? 1200, null, original.initialTimeMs, undefined);
        game.start();
        return this.gameRepository.create(game);
    }
    async findGameById(gameId) {
        const game = await this.gameRepository.findById(gameId);
        if (!game) {
            throw new common_1.NotFoundException(`Game with ID ${gameId} not found`);
        }
        return game;
    }
};
exports.CreateGameUseCase = CreateGameUseCase;
exports.CreateGameUseCase = CreateGameUseCase = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('IGameRepository')),
    __metadata("design:paramtypes", [Object])
], CreateGameUseCase);
//# sourceMappingURL=create-game.use-case.js.map