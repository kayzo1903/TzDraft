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
exports.EndGameUseCase = void 0;
const common_1 = require("@nestjs/common");
const game_constants_1 = require("../../shared/constants/game.constants");
let EndGameUseCase = class EndGameUseCase {
    gameRepository;
    constructor(gameRepository) {
        this.gameRepository = gameRepository;
    }
    async resign(gameId, playerId) {
        const game = await this.gameRepository.findById(gameId);
        if (!game) {
            throw new common_1.BadRequestException('Game not found');
        }
        const winner = game.whitePlayerId === playerId ? game_constants_1.Winner.BLACK : game_constants_1.Winner.WHITE;
        game.endGame(winner, game_constants_1.EndReason.RESIGN);
        await this.gameRepository.update(game);
    }
    async timeout(gameId, playerId) {
        const game = await this.gameRepository.findById(gameId);
        if (!game) {
            throw new common_1.BadRequestException('Game not found');
        }
        const winner = game.whitePlayerId === playerId ? game_constants_1.Winner.BLACK : game_constants_1.Winner.WHITE;
        game.endGame(winner, game_constants_1.EndReason.TIME);
        await this.gameRepository.update(game);
    }
    async drawByAgreement(gameId) {
        const game = await this.gameRepository.findById(gameId);
        if (!game) {
            throw new common_1.BadRequestException('Game not found');
        }
        game.endGame(game_constants_1.Winner.DRAW, game_constants_1.EndReason.DRAW);
        await this.gameRepository.update(game);
    }
    async abort(gameId) {
        const game = await this.gameRepository.findById(gameId);
        if (!game) {
            throw new common_1.BadRequestException('Game not found');
        }
        if (game.getMoveCount() > 0) {
            throw new common_1.BadRequestException('Cannot abort game after moves are made');
        }
        game.abort();
        await this.gameRepository.update(game);
    }
};
exports.EndGameUseCase = EndGameUseCase;
exports.EndGameUseCase = EndGameUseCase = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('IGameRepository')),
    __metadata("design:paramtypes", [Object])
], EndGameUseCase);
//# sourceMappingURL=end-game.use-case.js.map