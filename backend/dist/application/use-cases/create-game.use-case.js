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
const games_gateway_1 = require("../../infrastructure/messaging/games.gateway");
let CreateGameUseCase = class CreateGameUseCase {
    gameRepository;
    gamesGateway;
    constructor(gameRepository, gamesGateway) {
        this.gameRepository = gameRepository;
        this.gamesGateway = gamesGateway;
    }
    async createPvPGame(whitePlayerId, blackPlayerId, whiteElo, blackElo, whiteGuestName, blackGuestName, gameType = game_constants_1.GameType.RANKED, initialTimeMs = 600000) {
        const game = new game_entity_1.Game((0, crypto_1.randomUUID)(), whitePlayerId, blackPlayerId, whiteGuestName || null, blackGuestName || null, gameType, whiteElo, blackElo, null, initialTimeMs, {
            whiteTimeMs: initialTimeMs,
            blackTimeMs: initialTimeMs,
            lastMoveAt: new Date(),
        });
        game.start();
        const createdGame = await this.gameRepository.create(game);
        if (whitePlayerId) {
            this.gamesGateway.scheduleGameTimeout(createdGame.id, initialTimeMs, whitePlayerId);
        }
        return createdGame;
    }
    async createFriendlyGame(whitePlayerId, blackPlayerId, whiteElo, blackElo, whiteGuestName, blackGuestName, gameType = game_constants_1.GameType.CASUAL, initialTimeMs = 600000) {
        const game = new game_entity_1.Game((0, crypto_1.randomUUID)(), whitePlayerId, blackPlayerId, whiteGuestName || null, blackGuestName || null, gameType, whiteElo, blackElo, null, initialTimeMs, {
            whiteTimeMs: initialTimeMs,
            blackTimeMs: initialTimeMs,
            lastMoveAt: new Date(),
        });
        return this.gameRepository.create(game);
    }
    async createPvEGame(playerId, playerColor, playerElo, aiLevel, dto = {}) {
        const whitePlayerId = playerColor === game_constants_1.PlayerColor.WHITE ? playerId : 'AI';
        const blackPlayerId = playerColor === game_constants_1.PlayerColor.BLACK ? playerId : 'AI';
        const whiteElo = playerColor === game_constants_1.PlayerColor.WHITE ? playerElo : null;
        const blackElo = playerColor === game_constants_1.PlayerColor.BLACK ? playerElo : null;
        const game = new game_entity_1.Game((0, crypto_1.randomUUID)(), whitePlayerId, blackPlayerId, null, null, game_constants_1.GameType.AI, whiteElo, blackElo, aiLevel, dto.initialTimeMs || 600000, undefined);
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
    __param(1, (0, common_1.Inject)((0, common_1.forwardRef)(() => games_gateway_1.GamesGateway))),
    __metadata("design:paramtypes", [Object, games_gateway_1.GamesGateway])
], CreateGameUseCase);
//# sourceMappingURL=create-game.use-case.js.map