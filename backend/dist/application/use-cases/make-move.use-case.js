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
const games_gateway_1 = require("../../infrastructure/messaging/games.gateway");
const move_validation_service_1 = require("../../domain/game/services/move-validation.service");
const game_rules_service_1 = require("../../domain/game/services/game-rules.service");
const position_vo_1 = require("../../domain/game/value-objects/position.vo");
const game_constants_1 = require("../../shared/constants/game.constants");
const prisma_service_1 = require("../../infrastructure/database/prisma/prisma.service");
const rating_service_1 = require("../../domain/game/services/rating.service");
const game_state_cache_service_1 = require("../services/game-state-cache.service");
let MakeMoveUseCase = class MakeMoveUseCase {
    gameRepository;
    gamesGateway;
    prisma;
    ratingService;
    gameStateCache;
    moveValidationService;
    gameRulesService;
    persistQueue = new Map();
    constructor(gameRepository, gamesGateway, prisma, ratingService, gameStateCache) {
        this.gameRepository = gameRepository;
        this.gamesGateway = gamesGateway;
        this.prisma = prisma;
        this.ratingService = ratingService;
        this.gameStateCache = gameStateCache;
        this.moveValidationService = new move_validation_service_1.MoveValidationService();
        this.gameRulesService = new game_rules_service_1.GameRulesService();
    }
    async execute(gameId, playerId, from, to, path) {
        const game = this.gameStateCache.get(gameId) ??
            (await this.gameRepository.findById(gameId));
        if (!game) {
            throw new common_1.BadRequestException('Game not found');
        }
        const playerColor = this.getPlayerColor(game, playerId);
        const moveNumber = game.getMoveCount() + 1;
        const fromPos = new position_vo_1.Position(from);
        const toPos = new position_vo_1.Position(to);
        const pathPos = path?.map((p) => new position_vo_1.Position(p));
        const moveResult = this.moveValidationService.validateMove(game, playerColor, fromPos, toPos, pathPos);
        if (!moveResult.isValid || !moveResult.move || !moveResult.newBoardState) {
            throw new common_1.BadRequestException(moveResult.error?.message || 'Invalid move');
        }
        const correctedMove = new moveResult.move.constructor(moveResult.move.id, moveResult.move.gameId, moveNumber, moveResult.move.player, moveResult.move.from, moveResult.move.to, moveResult.move.capturedSquares, moveResult.move.isPromotion, moveResult.move.notation, moveResult.move.createdAt);
        if (game.status === 'ACTIVE' && game.clockInfo) {
            const now = Date.now();
            const lastMoveTime = game.clockInfo.lastMoveAt instanceof Date
                ? game.clockInfo.lastMoveAt.getTime()
                : new Date(game.clockInfo.lastMoveAt).getTime();
            const elapsed = Math.max(0, now - lastMoveTime);
            game.updateClock(elapsed);
        }
        else if (game.status === 'ACTIVE' && !game.clockInfo) {
            game.updateClock(0);
        }
        game.applyMove(correctedMove);
        this.gameStateCache.set(game);
        const evaluation = this.gameRulesService.evaluatePostMove(game);
        if (evaluation.outcome) {
            game.endGame(evaluation.outcome.winner, evaluation.outcome.reason);
        }
        const broadcastPayload = {
            id: game.id,
            status: game.status,
            gameType: game.gameType,
            whitePlayerId: game.whitePlayerId,
            blackPlayerId: game.blackPlayerId,
            whiteGuestName: game.whiteGuestName,
            blackGuestName: game.blackGuestName,
            winner: game.winner,
            endReason: game.endReason,
            currentTurn: game.currentTurn,
            clockInfo: game.clockInfo,
            serverTimeMs: Date.now(),
            board: game.board?.toJSON ? game.board.toJSON() : game.board,
            lastMove: {
                id: correctedMove.id,
                player: correctedMove.player,
                from: correctedMove.from.value,
                to: correctedMove.to.value,
                notation: correctedMove.notation,
                isPromotion: correctedMove.isPromotion,
                capturedSquares: correctedMove.capturedSquares.map((p) => p.value),
                moveNumber: correctedMove.moveNumber,
                createdAt: correctedMove.createdAt,
            },
            drawClaimAvailable: evaluation.drawClaimAvailable,
        };
        this.gamesGateway.emitGameStateUpdate(gameId, broadcastPayload);
        if (game.status === 'FINISHED') {
            this.gamesGateway.emitGameOver(gameId, {
                winner: game.winner,
                reason: game.endReason,
                noMoves: evaluation.outcome?.noMoves === true,
            });
        }
        if (game.clockInfo && game.status === 'ACTIVE') {
            const nextPlayer = game.currentTurn;
            const timeForNextPlayer = nextPlayer === game_constants_1.PlayerColor.WHITE
                ? game.clockInfo.whiteTimeMs
                : game.clockInfo.blackTimeMs;
            const nextPlayerId = nextPlayer === game_constants_1.PlayerColor.WHITE
                ? game.whitePlayerId
                : game.blackPlayerId;
            if (nextPlayerId) {
                this.gamesGateway.scheduleGameTimeout(game.id, timeForNextPlayer, nextPlayerId);
            }
        }
        const prior = this.persistQueue.get(gameId) ?? Promise.resolve();
        const next = prior
            .then(() => this.persistMoveAsync(game, correctedMove, evaluation))
            .catch((err) => {
            console.error(`persistMoveAsync failed game=${gameId}:`, err);
            this.gameStateCache.invalidate(gameId);
            this.gamesGateway.emitMoveRollback(gameId, {
                from: correctedMove.from.value,
                to: correctedMove.to.value,
            });
        });
        this.persistQueue.set(gameId, next);
        if (game.status === 'FINISHED') {
            next.finally(() => {
                this.persistQueue.delete(gameId);
                this.gameStateCache.invalidate(gameId);
            });
        }
        return {
            game,
            move: correctedMove,
        };
    }
    async persistMoveAsync(game, correctedMove, evaluation) {
        await this.prisma.$transaction(async (tx) => {
            await tx.game.update({
                where: { id: game.id },
                data: {
                    status: game.status,
                    winner: game.winner,
                    endReason: game.endReason,
                    startedAt: game.startedAt,
                    endedAt: game.endedAt,
                },
            });
            if (game.clockInfo) {
                const whiteTimeMs = BigInt(Math.max(0, Math.floor(game.clockInfo.whiteTimeMs)));
                const blackTimeMs = BigInt(Math.max(0, Math.floor(game.clockInfo.blackTimeMs)));
                const lastMoveAt = game.clockInfo.lastMoveAt instanceof Date
                    ? game.clockInfo.lastMoveAt
                    : new Date(game.clockInfo.lastMoveAt);
                await tx.clock.upsert({
                    where: { gameId: game.id },
                    create: {
                        gameId: game.id,
                        whiteTimeMs,
                        blackTimeMs,
                        lastMoveAt,
                    },
                    update: {
                        whiteTimeMs,
                        blackTimeMs,
                        lastMoveAt,
                    },
                });
            }
            await tx.move.create({
                data: {
                    id: correctedMove.id,
                    gameId: correctedMove.gameId,
                    moveNumber: correctedMove.moveNumber,
                    player: correctedMove.player,
                    fromSquare: correctedMove.from.value,
                    toSquare: correctedMove.to.value,
                    capturedSquares: correctedMove.capturedSquares.map((p) => p.value),
                    isPromotion: correctedMove.isPromotion,
                    isMultiCapture: correctedMove.isMultiCapture(),
                    notation: correctedMove.notation,
                    createdAt: correctedMove.createdAt,
                },
            });
        });
        if (game.status === 'FINISHED' && game.winner) {
            try {
                await this.ratingService.updateRatings(game, game.winner);
            }
            catch (error) {
                console.error('Failed to update ratings:', error);
            }
        }
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
    __param(1, (0, common_1.Inject)((0, common_1.forwardRef)(() => games_gateway_1.GamesGateway))),
    __metadata("design:paramtypes", [Object, games_gateway_1.GamesGateway,
        prisma_service_1.PrismaService,
        rating_service_1.RatingService,
        game_state_cache_service_1.GameStateCacheService])
], MakeMoveUseCase);
//# sourceMappingURL=make-move.use-case.js.map