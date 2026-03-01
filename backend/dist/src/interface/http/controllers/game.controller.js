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
const current_user_decorator_1 = require("../../../auth/decorators/current-user.decorator");
const create_game_use_case_1 = require("../../../application/use-cases/create-game.use-case");
const get_game_state_use_case_1 = require("../../../application/use-cases/get-game-state.use-case");
const end_game_use_case_1 = require("../../../application/use-cases/end-game.use-case");
const create_game_dto_1 = require("../dtos/create-game.dto");
const game_constants_1 = require("../../../shared/constants/game.constants");
const games_gateway_1 = require("../../../infrastructure/messaging/games.gateway");
let GameController = class GameController {
    createGameUseCase;
    getGameStateUseCase;
    endGameUseCase;
    gamesGateway;
    constructor(createGameUseCase, getGameStateUseCase, endGameUseCase, gamesGateway) {
        this.createGameUseCase = createGameUseCase;
        this.getGameStateUseCase = getGameStateUseCase;
        this.endGameUseCase = endGameUseCase;
        this.gamesGateway = gamesGateway;
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
    async createInviteGame(user, dto) {
        const resolvedColor = dto.color === 'RANDOM'
            ? Math.random() < 0.5
                ? game_constants_1.PlayerColor.WHITE
                : game_constants_1.PlayerColor.BLACK
            : dto.color;
        const { game, inviteCode } = await this.createGameUseCase.createInviteGame(user.id, resolvedColor, user.rating?.rating || 1200, dto.timeMs ?? 600000);
        return {
            success: true,
            data: { gameId: game.id, inviteCode },
        };
    }
    async joinInviteGame(user, code) {
        const game = await this.createGameUseCase.joinInviteGame(code.toUpperCase(), user.id);
        this.gamesGateway.emitGameStateUpdate(game.id, { gameId: game.id });
        return {
            success: true,
            data: { gameId: game.id },
        };
    }
    async getGame(id) {
        const { game, moves, players } = await this.getGameStateUseCase.execute(id);
        return {
            success: true,
            data: {
                game,
                moves,
                players,
            },
        };
    }
    async resignGame(user, id) {
        const { winner } = await this.endGameUseCase.resign(id, user.id);
        this.gamesGateway.emitGameOver(id, {
            gameId: id,
            winner: winner.toString(),
            reason: 'resign',
        });
        return { success: true };
    }
    async drawGame(user, id) {
        await this.endGameUseCase.drawByAgreement(id, user.id);
        this.gamesGateway.emitGameOver(id, {
            gameId: id,
            winner: 'DRAW',
            reason: 'draw',
        });
        return { success: true };
    }
    async abortGame(user, id) {
        await this.endGameUseCase.abort(id, user.id);
        this.gamesGateway.emitGameOver(id, {
            gameId: id,
            winner: null,
            reason: 'aborted',
        });
        return { success: true };
    }
    async getGameState(id, skip = 0, take = 50) {
        const result = await this.getGameStateUseCase.executeWithPagination(id, skip, take);
        return {
            success: true,
            data: result,
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
    (0, common_1.Post)('invite'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, swagger_1.ApiOperation)({ summary: 'Create an invite game and get invite code' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Invite game created' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_game_dto_1.CreateInviteGameDto]),
    __metadata("design:returntype", Promise)
], GameController.prototype, "createInviteGame", null);
__decorate([
    (0, common_1.Post)('invite/:code/join'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Join an invite game using its code' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Joined game successfully' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('code')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], GameController.prototype, "joinInviteGame", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get game by ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Game found' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Game not found' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], GameController.prototype, "getGame", null);
__decorate([
    (0, common_1.Post)(':id/resign'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Resign from a game' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], GameController.prototype, "resignGame", null);
__decorate([
    (0, common_1.Post)(':id/draw'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'End game as a draw' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], GameController.prototype, "drawGame", null);
__decorate([
    (0, common_1.Post)(':id/abort'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Abort a game before it starts' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], GameController.prototype, "abortGame", null);
__decorate([
    (0, common_1.Get)(':id/state'),
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
        get_game_state_use_case_1.GetGameStateUseCase,
        end_game_use_case_1.EndGameUseCase,
        games_gateway_1.GamesGateway])
], GameController);
//# sourceMappingURL=game.controller.js.map