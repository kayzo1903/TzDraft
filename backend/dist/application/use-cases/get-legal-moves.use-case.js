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
exports.GetLegalMovesUseCase = void 0;
const common_1 = require("@nestjs/common");
const move_generator_service_1 = require("../../domain/game/services/move-generator.service");
let GetLegalMovesUseCase = class GetLegalMovesUseCase {
    gameRepository;
    moveGeneratorService;
    constructor(gameRepository) {
        this.gameRepository = gameRepository;
        this.moveGeneratorService = new move_generator_service_1.MoveGeneratorService();
    }
    async execute(gameId) {
        const game = await this.gameRepository.findById(gameId);
        if (!game) {
            throw new Error('Game not found');
        }
        return this.moveGeneratorService.generateAllMoves(game, game.currentTurn);
    }
    async executeForPiece(gameId, position) {
        const game = await this.gameRepository.findById(gameId);
        if (!game) {
            throw new Error('Game not found');
        }
        const piece = game.board.getPieceAt({ value: position });
        if (!piece) {
            return [];
        }
        return this.moveGeneratorService.generateMovesForPiece(game, piece);
    }
};
exports.GetLegalMovesUseCase = GetLegalMovesUseCase;
exports.GetLegalMovesUseCase = GetLegalMovesUseCase = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('IGameRepository')),
    __metadata("design:paramtypes", [Object])
], GetLegalMovesUseCase);
//# sourceMappingURL=get-legal-moves.use-case.js.map