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
exports.AiController = exports.AiMoveRequestDto = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const get_ai_move_use_case_1 = require("../../../application/use-cases/get-ai-move.use-case");
class AiMoveRequestDto {
    boardStatePieces;
    currentPlayer;
    aiLevel;
    timeLimitMs;
    mustContinueFrom;
}
exports.AiMoveRequestDto = AiMoveRequestDto;
let AiController = class AiController {
    getAiMoveUseCase;
    constructor(getAiMoveUseCase) {
        this.getAiMoveUseCase = getAiMoveUseCase;
    }
    async getMove(dto) {
        const move = await this.getAiMoveUseCase.execute({
            boardStatePieces: dto.boardStatePieces,
            currentPlayer: dto.currentPlayer,
            aiLevel: dto.aiLevel,
            timeLimitMs: dto.timeLimitMs || 3000,
            mustContinueFrom: dto.mustContinueFrom ?? null,
        });
        return {
            success: true,
            data: move,
        };
    }
};
exports.AiController = AiController;
__decorate([
    (0, common_1.Post)('move'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Calculate best AI move for a given board state' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Move calculated' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [AiMoveRequestDto]),
    __metadata("design:returntype", Promise)
], AiController.prototype, "getMove", null);
exports.AiController = AiController = __decorate([
    (0, swagger_1.ApiTags)('ai'),
    (0, common_1.Controller)('ai'),
    __metadata("design:paramtypes", [get_ai_move_use_case_1.GetAiMoveUseCase])
], AiController);
//# sourceMappingURL=ai.controller.js.map