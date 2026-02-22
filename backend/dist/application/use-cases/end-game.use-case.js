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
var EndGameUseCase_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EndGameUseCase = void 0;
const common_1 = require("@nestjs/common");
const game_constants_1 = require("../../shared/constants/game.constants");
const rating_service_1 = require("../../domain/game/services/rating.service");
const games_gateway_1 = require("../../infrastructure/messaging/games.gateway");
const game_rules_service_1 = require("../../domain/game/services/game-rules.service");
const game_constants_2 = require("../../shared/constants/game.constants");
let EndGameUseCase = EndGameUseCase_1 = class EndGameUseCase {
    gameRepository;
    moveRepository;
    ratingService;
    gamesGateway;
    gameRulesService;
    logger = new common_1.Logger(EndGameUseCase_1.name);
    constructor(gameRepository, moveRepository, ratingService, gamesGateway) {
        this.gameRepository = gameRepository;
        this.moveRepository = moveRepository;
        this.ratingService = ratingService;
        this.gamesGateway = gamesGateway;
        this.gameRulesService = new game_rules_service_1.GameRulesService();
    }
    async resign(gameId, playerId) {
        const game = await this.gameRepository.findById(gameId);
        if (!game) {
            throw new common_1.BadRequestException('Game not found');
        }
        if (game.whitePlayerId !== playerId && game.blackPlayerId !== playerId) {
            throw new common_1.BadRequestException('Player not in this game');
        }
        const winner = game.whitePlayerId === playerId ? game_constants_1.Winner.BLACK : game_constants_1.Winner.WHITE;
        game.endGame(winner, game_constants_1.EndReason.RESIGN);
        await this.gameRepository.update(game);
        this.gamesGateway.emitGameOver(gameId, {
            winner,
            reason: game_constants_1.EndReason.RESIGN,
            endedBy: playerId,
        });
        const moveCount = await this.moveRepository.countByGameId(gameId);
        if (moveCount > 0) {
            await this.handleRatingUpdate(game, winner);
        }
    }
    async timeout(gameId, playerId) {
        const game = await this.gameRepository.findById(gameId);
        if (!game) {
            throw new common_1.BadRequestException('Game not found');
        }
        if (game.whitePlayerId !== playerId && game.blackPlayerId !== playerId) {
            throw new common_1.BadRequestException('Player not in this game');
        }
        const winner = game.whitePlayerId === playerId ? game_constants_1.Winner.BLACK : game_constants_1.Winner.WHITE;
        const winnerColor = winner === game_constants_1.Winner.WHITE ? game_constants_2.PlayerColor.WHITE : game_constants_2.PlayerColor.BLACK;
        if (this.gameRulesService.isTimeoutDrawByInsufficientMaterial(game.board, winnerColor)) {
            game.endGame(game_constants_1.Winner.DRAW, game_constants_1.EndReason.DRAW);
            await this.gameRepository.update(game);
            this.gamesGateway.emitGameOver(gameId, {
                winner: game_constants_1.Winner.DRAW,
                reason: game_constants_1.EndReason.DRAW,
                endedBy: playerId,
            });
            await this.handleRatingUpdate(game, game_constants_1.Winner.DRAW);
            return;
        }
        game.endGame(winner, game_constants_1.EndReason.TIME);
        await this.gameRepository.update(game);
        this.gamesGateway.emitGameOver(gameId, {
            winner,
            reason: game_constants_1.EndReason.TIME,
            endedBy: playerId,
        });
        await this.handleRatingUpdate(game, winner);
    }
    async drawByAgreement(gameId) {
        const game = await this.gameRepository.findById(gameId);
        if (!game) {
            throw new common_1.BadRequestException('Game not found');
        }
        game.endGame(game_constants_1.Winner.DRAW, game_constants_1.EndReason.DRAW);
        await this.gameRepository.update(game);
        this.gamesGateway.emitGameOver(gameId, {
            winner: game_constants_1.Winner.DRAW,
            reason: game_constants_1.EndReason.DRAW,
        });
        await this.handleRatingUpdate(game, game_constants_1.Winner.DRAW);
    }
    async abort(gameId, playerId) {
        const game = await this.gameRepository.findById(gameId);
        if (!game) {
            throw new common_1.BadRequestException('Game not found');
        }
        if (game.whitePlayerId !== playerId && game.blackPlayerId !== playerId) {
            throw new common_1.BadRequestException('Player not in this game');
        }
        const moveCount = await this.moveRepository.countByGameId(gameId);
        if (moveCount > 0) {
            throw new common_1.BadRequestException('Cannot abort game after moves are made');
        }
        game.abort();
        await this.gameRepository.update(game);
        this.gamesGateway.emitGameOver(gameId, {
            winner: null,
            reason: 'ABORTED',
            endedBy: playerId,
        });
    }
    async disconnectForfeit(gameId, disconnectedPlayerId) {
        const game = await this.gameRepository.findById(gameId);
        if (!game) {
            throw new common_1.BadRequestException('Game not found');
        }
        if (game.whitePlayerId !== disconnectedPlayerId &&
            game.blackPlayerId !== disconnectedPlayerId) {
            throw new common_1.BadRequestException('Player not in this game');
        }
        if (game.status !== game_constants_1.GameStatus.ACTIVE && game.status !== game_constants_1.GameStatus.WAITING) {
            return;
        }
        const moveCount = await this.moveRepository.countByGameId(gameId);
        if (moveCount === 0) {
            this.logger.warn(`Disconnect forfeit result game=${gameId} disconnected=${disconnectedPlayerId} moveCount=0 -> DRAW`);
            game.endGame(game_constants_1.Winner.DRAW, game_constants_1.EndReason.DISCONNECT);
            await this.gameRepository.update(game);
            this.gamesGateway.emitGameOver(gameId, {
                winner: game_constants_1.Winner.DRAW,
                reason: game_constants_1.EndReason.DISCONNECT,
                endedBy: disconnectedPlayerId,
                noMoves: true,
            });
            return;
        }
        const winner = game.whitePlayerId === disconnectedPlayerId ? game_constants_1.Winner.BLACK : game_constants_1.Winner.WHITE;
        this.logger.warn(`Disconnect forfeit result game=${gameId} disconnected=${disconnectedPlayerId} moveCount=${moveCount} -> winner=${winner}`);
        game.endGame(winner, game_constants_1.EndReason.DISCONNECT);
        await this.gameRepository.update(game);
        this.gamesGateway.emitGameOver(gameId, {
            winner,
            reason: game_constants_1.EndReason.DISCONNECT,
            endedBy: disconnectedPlayerId,
            noMoves: false,
        });
        await this.handleRatingUpdate(game, winner);
    }
    async handleRatingUpdate(game, winner) {
        try {
            await this.ratingService.updateRatings(game, winner);
        }
        catch (error) {
            console.error('Failed to update ratings:', error);
        }
    }
};
exports.EndGameUseCase = EndGameUseCase;
exports.EndGameUseCase = EndGameUseCase = EndGameUseCase_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('IGameRepository')),
    __param(1, (0, common_1.Inject)('IMoveRepository')),
    __param(3, (0, common_1.Inject)((0, common_1.forwardRef)(() => games_gateway_1.GamesGateway))),
    __metadata("design:paramtypes", [Object, Object, rating_service_1.RatingService,
        games_gateway_1.GamesGateway])
], EndGameUseCase);
//# sourceMappingURL=end-game.use-case.js.map