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
exports.MoveController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const make_move_use_case_1 = require("../../../application/use-cases/make-move.use-case");
const get_legal_moves_use_case_1 = require("../../../application/use-cases/get-legal-moves.use-case");
const end_game_use_case_1 = require("../../../application/use-cases/end-game.use-case");
const make_move_dto_1 = require("../dtos/make-move.dto");
let MoveController = class MoveController {
    makeMoveUseCase;
    getLegalMovesUseCase;
    endGameUseCase;
    constructor(makeMoveUseCase, getLegalMovesUseCase, endGameUseCase) {
        this.makeMoveUseCase = makeMoveUseCase;
        this.getLegalMovesUseCase = getLegalMovesUseCase;
        this.endGameUseCase = endGameUseCase;
    }
    async makeMove(gameId, playerId, dto) {
        const result = await this.makeMoveUseCase.execute(gameId, playerId, dto.from, dto.to, dto.path);
        return {
            success: true,
            data: result,
        };
    }
    async getLegalMoves(gameId) {
        const moves = await this.getLegalMovesUseCase.execute(gameId);
        return {
            success: true,
            data: moves,
        };
    }
    async getLegalMovesForPiece(gameId, position) {
        const moves = await this.getLegalMovesUseCase.executeForPiece(gameId, position);
        return {
            success: true,
            data: moves,
        };
    }
    async resign(gameId, playerId) {
        await this.endGameUseCase.resign(gameId, playerId);
        return {
            success: true,
            message: 'Game resigned successfully',
        };
    }
    async draw(gameId) {
        await this.endGameUseCase.drawByAgreement(gameId);
        return {
            success: true,
            message: 'Game ended in draw',
        };
    }
    async abort(gameId) {
        await this.endGameUseCase.abort(gameId);
        return {
            success: true,
            message: 'Game aborted successfully',
        };
    }
};
exports.MoveController = MoveController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Make a move in the game' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Move executed successfully' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Invalid move' }),
    __param(0, (0, common_1.Param)('gameId')),
    __param(1, (0, common_1.Query)('playerId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, make_move_dto_1.MakeMoveDto]),
    __metadata("design:returntype", Promise)
], MoveController.prototype, "makeMove", null);
__decorate([
    (0, common_1.Get)('legal'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all legal moves for current player' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Legal moves retrieved' }),
    __param(0, (0, common_1.Param)('gameId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MoveController.prototype, "getLegalMoves", null);
__decorate([
    (0, common_1.Get)('legal/:position'),
    (0, swagger_1.ApiOperation)({ summary: 'Get legal moves for a specific piece' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Legal moves retrieved' }),
    __param(0, (0, common_1.Param)('gameId')),
    __param(1, (0, common_1.Param)('position')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number]),
    __metadata("design:returntype", Promise)
], MoveController.prototype, "getLegalMovesForPiece", null);
__decorate([
    (0, common_1.Post)('resign'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Resign from the game' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Game resigned' }),
    __param(0, (0, common_1.Param)('gameId')),
    __param(1, (0, common_1.Query)('playerId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], MoveController.prototype, "resign", null);
__decorate([
    (0, common_1.Post)('draw'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'End game by draw agreement' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Draw accepted' }),
    __param(0, (0, common_1.Param)('gameId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MoveController.prototype, "draw", null);
__decorate([
    (0, common_1.Post)('abort'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Abort the game' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Game aborted' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Cannot abort game after moves' }),
    __param(0, (0, common_1.Param)('gameId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MoveController.prototype, "abort", null);
exports.MoveController = MoveController = __decorate([
    (0, swagger_1.ApiTags)('moves'),
    (0, common_1.Controller)('games/:gameId/moves'),
    __metadata("design:paramtypes", [make_move_use_case_1.MakeMoveUseCase,
        get_legal_moves_use_case_1.GetLegalMovesUseCase,
        end_game_use_case_1.EndGameUseCase])
], MoveController);
//# sourceMappingURL=move.controller.js.map