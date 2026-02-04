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
exports.GetGameStateUseCase = void 0;
const common_1 = require("@nestjs/common");
let GetGameStateUseCase = class GetGameStateUseCase {
    gameRepository;
    moveRepository;
    constructor(gameRepository, moveRepository) {
        this.gameRepository = gameRepository;
        this.moveRepository = moveRepository;
    }
    async execute(gameId) {
        const game = await this.gameRepository.findById(gameId);
        if (!game) {
            throw new Error('Game not found');
        }
        const moves = await this.moveRepository.findByGameId(gameId);
        return {
            game,
            moves,
        };
    }
    async executeWithPagination(gameId, skip, take) {
        const game = await this.gameRepository.findById(gameId);
        if (!game) {
            throw new Error('Game not found');
        }
        const [moves, totalMoves] = await Promise.all([
            this.moveRepository.findByGameIdPaginated(gameId, skip, take),
            this.moveRepository.countByGameId(gameId),
        ]);
        return {
            game,
            moves,
            totalMoves,
        };
    }
};
exports.GetGameStateUseCase = GetGameStateUseCase;
exports.GetGameStateUseCase = GetGameStateUseCase = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('IGameRepository')),
    __param(1, (0, common_1.Inject)('IMoveRepository')),
    __metadata("design:paramtypes", [Object, Object])
], GetGameStateUseCase);
//# sourceMappingURL=get-game-state.use-case.js.map