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
exports.GameController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const jwt_auth_guard_1 = require("../../../auth/guards/jwt-auth.guard");
const public_decorator_1 = require("../../../auth/decorators/public.decorator");
const current_user_decorator_1 = require("../../../auth/decorators/current-user.decorator");
const create_game_use_case_1 = require("../../../application/use-cases/create-game.use-case");
const get_game_state_use_case_1 = require("../../../application/use-cases/get-game-state.use-case");
const create_game_dto_1 = require("../dtos/create-game.dto");
let GameController = class GameController {
    createGameUseCase;
    getGameStateUseCase;
    constructor(createGameUseCase, getGameStateUseCase) {
        this.createGameUseCase = createGameUseCase;
        this.getGameStateUseCase = getGameStateUseCase;
    }
    async createPvPGame(user, dto) {
        const game = await this.createGameUseCase.createPvPGame(user.id, dto.blackPlayerId, user.rating?.rating || 1200, dto.blackElo || 1200);
        return {
            success: true,
            data: game,
        };
    }
    async createPvEGame(user, dto) {
        const game = await this.createGameUseCase.createPvEGame(user.id, dto.playerColor, user.rating?.rating || 1200, dto.aiLevel);
        return {
            success: true,
            data: game,
        };
    }
    async getGame(id) {
        const { game, moves, players } = await this.getGameStateUseCase.execute(id);
        return {
            success: true,
            data: {
                game: this.serializeGame(game),
                moves,
                players,
            },
        };
    }
    async getGameClock(id) {
        const { game } = await this.getGameStateUseCase.execute(id);
        const serialized = this.serializeGame(game);
        return {
            success: true,
            data: {
                id: serialized.id,
                status: serialized.status,
                currentTurn: serialized.currentTurn,
                clockInfo: serialized.clockInfo,
                serverTimeMs: Date.now(),
            },
        };
    }
    async getGameState(id, skip = 0, take = 50) {
        const result = await this.getGameStateUseCase.executeWithPagination(id, skip, take);
        return {
            success: true,
            data: {
                ...result,
                game: this.serializeGame(result.game),
            },
        };
    }
    serializeGame(game) {
        const clockInfo = this.computeEffectiveClock(game);
        return {
            id: game.id,
            status: game.status,
            gameType: game.gameType,
            ruleVersion: game.ruleVersion,
            whitePlayerId: game.whitePlayerId,
            blackPlayerId: game.blackPlayerId,
            whiteGuestName: game.whiteGuestName,
            blackGuestName: game.blackGuestName,
            whiteElo: game.whiteElo,
            blackElo: game.blackElo,
            aiLevel: game.aiLevel,
            winner: game.winner,
            endReason: game.endReason,
            createdAt: game.createdAt,
            startedAt: game.startedAt,
            endedAt: game.endedAt,
            currentTurn: game.currentTurn,
            clockInfo,
            board: game.board?.toJSON ? game.board.toJSON() : game.board,
        };
    }
    computeEffectiveClock(game) {
        if (!game?.clockInfo)
            return null;
        const whiteTimeMs = Number(game.clockInfo.whiteTimeMs);
        const blackTimeMs = Number(game.clockInfo.blackTimeMs);
        const lastMoveAt = game.clockInfo.lastMoveAt instanceof Date
            ? game.clockInfo.lastMoveAt
            : new Date(game.clockInfo.lastMoveAt);
        if (game.status !== 'ACTIVE' ||
            !Number.isFinite(whiteTimeMs) ||
            !Number.isFinite(blackTimeMs) ||
            Number.isNaN(lastMoveAt.getTime())) {
            return {
                whiteTimeMs,
                blackTimeMs,
                lastMoveAt: lastMoveAt.toISOString(),
            };
        }
        const elapsedMs = Math.max(0, Date.now() - lastMoveAt.getTime());
        const turn = game.currentTurn === 'BLACK' ? 'BLACK' : 'WHITE';
        return {
            whiteTimeMs: turn === 'WHITE' ? Math.max(0, whiteTimeMs - elapsedMs) : whiteTimeMs,
            blackTimeMs: turn === 'BLACK' ? Math.max(0, blackTimeMs - elapsedMs) : blackTimeMs,
            lastMoveAt: lastMoveAt.toISOString(),
        };
    }
};
exports.GameController = GameController;
__decorate([
    (0, common_1.Post)('pvp'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new Player vs Player game' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Game created successfully' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_game_dto_1.CreatePvPGameDto]),
    __metadata("design:returntype", Promise)
], GameController.prototype, "createPvPGame", null);
__decorate([
    (0, common_1.Post)('pve'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new Player vs AI game' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Game created successfully' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_game_dto_1.CreatePvEGameDto]),
    __metadata("design:returntype", Promise)
], GameController.prototype, "createPvEGame", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, public_decorator_1.Public)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get game by ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Game found' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Game not found' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], GameController.prototype, "getGame", null);
__decorate([
    (0, common_1.Get)(':id/clock'),
    (0, public_decorator_1.Public)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get server-authoritative game clock' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Clock retrieved' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], GameController.prototype, "getGameClock", null);
__decorate([
    (0, common_1.Get)(':id/state'),
    (0, public_decorator_1.Public)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get game state with paginated moves' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Game state retrieved' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('skip')),
    __param(2, (0, common_1.Param)('take')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number, Number]),
    __metadata("design:returntype", Promise)
], GameController.prototype, "getGameState", null);
exports.GameController = GameController = __decorate([
    (0, swagger_1.ApiTags)('games'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('games'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [create_game_use_case_1.CreateGameUseCase,
        get_game_state_use_case_1.GetGameStateUseCase])
], GameController);
//# sourceMappingURL=game.controller.js.map