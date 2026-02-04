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
exports.MakeMoveUseCase = void 0;
const common_1 = require("@nestjs/common");
const move_validation_service_1 = require("../../domain/game/services/move-validation.service");
const game_rules_service_1 = require("../../domain/game/services/game-rules.service");
const position_vo_1 = require("../../domain/game/value-objects/position.vo");
const game_constants_1 = require("../../shared/constants/game.constants");
let MakeMoveUseCase = class MakeMoveUseCase {
    gameRepository;
    moveRepository;
    moveValidationService;
    gameRulesService;
    constructor(gameRepository, moveRepository) {
        this.gameRepository = gameRepository;
        this.moveRepository = moveRepository;
        this.moveValidationService = new move_validation_service_1.MoveValidationService();
        this.gameRulesService = new game_rules_service_1.GameRulesService();
    }
    async execute(gameId, playerId, from, to, path) {
        const game = await this.gameRepository.findById(gameId);
        if (!game) {
            throw new common_1.BadRequestException('Game not found');
        }
        const playerColor = this.getPlayerColor(game, playerId);
        const existingMoves = await this.moveRepository.findByGameId(gameId);
        const moveNumber = existingMoves.length + 1;
        const fromPos = new position_vo_1.Position(from);
        const toPos = new position_vo_1.Position(to);
        const pathPos = path?.map((p) => new position_vo_1.Position(p));
        const moveResult = this.moveValidationService.validateMove(game, playerColor, fromPos, toPos, pathPos);
        if (!moveResult.isValid || !moveResult.move || !moveResult.newBoardState) {
            throw new common_1.BadRequestException(moveResult.error?.message || 'Invalid move');
        }
        const correctedMove = new moveResult.move.constructor(moveResult.move.id, moveResult.move.gameId, moveNumber, moveResult.move.player, moveResult.move.from, moveResult.move.to, moveResult.move.capturedSquares, moveResult.move.isPromotion, moveResult.move.notation, moveResult.move.createdAt);
        game.applyMove(correctedMove);
        await this.gameRepository.update(game);
        await this.moveRepository.create(correctedMove);
        return {
            game,
            move: correctedMove,
        };
    }
    getPlayerColor(game, playerId) {
        if (game.whitePlayerId === playerId) {
            return game_constants_1.PlayerColor.WHITE;
        }
        if (game.blackPlayerId === playerId) {
            return game_constants_1.PlayerColor.BLACK;
        }
        throw new common_1.BadRequestException('Player not in this game');
    }
};
exports.MakeMoveUseCase = MakeMoveUseCase;
exports.MakeMoveUseCase = MakeMoveUseCase = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('IGameRepository')),
    __param(1, (0, common_1.Inject)('IMoveRepository')),
    __metadata("design:paramtypes", [Object, Object])
], MakeMoveUseCase);
//# sourceMappingURL=make-move.use-case.js.map