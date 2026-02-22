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
exports.BotMoveUseCase = void 0;
const common_1 = require("@nestjs/common");
const game_constants_1 = require("../../shared/constants/game.constants");
const kallisto_engine_service_1 = require("../engines/kallisto-engine.service");
const egtb_service_1 = require("../engines/egtb.service");
const make_move_use_case_1 = require("./make-move.use-case");
const game_state_cache_service_1 = require("../services/game-state-cache.service");
let BotMoveUseCase = class BotMoveUseCase {
    gameRepository;
    kallistoService;
    egtbService;
    makeMoveUseCase;
    gameStateCache;
    constructor(gameRepository, kallistoService, egtbService, makeMoveUseCase, gameStateCache) {
        this.gameRepository = gameRepository;
        this.kallistoService = kallistoService;
        this.egtbService = egtbService;
        this.makeMoveUseCase = makeMoveUseCase;
        this.gameStateCache = gameStateCache;
    }
    async execute(gameId) {
        const game = this.gameStateCache.get(gameId) ??
            (await this.gameRepository.findById(gameId));
        if (!game) {
            console.warn(`[BotMove] Game ${gameId} not found`);
            return;
        }
        if (game.status !== game_constants_1.GameStatus.ACTIVE) {
            console.log(`[BotMove] Game ${gameId} not active — skipping`);
            return;
        }
        const botColor = this.getBotColor(game);
        if (!botColor) {
            console.warn(`[BotMove] No AI player in game ${gameId}`);
            return;
        }
        if (game.currentTurn !== botColor) {
            console.log(`[BotMove] Not bot's turn in game ${gameId}`);
            return;
        }
        const aiLevel = game.aiLevel ?? 6;
        const timeLimitMs = this.timeLimitForLevel(aiLevel);
        console.log(`[BotMove] Game ${gameId} — bot color=${botColor} level=${aiLevel} timeMs=${timeLimitMs}`);
        const board = game.board;
        const pieces = board.getAllPieces().map((p) => ({
            type: p.type,
            color: p.color,
            position: p.position.value,
        }));
        const sideStr = botColor === game_constants_1.PlayerColor.WHITE ? 'WHITE' : 'BLACK';
        const egtbMove = await this.egtbService.getBestMove(pieces, sideStr, game.getMoveCount());
        if (egtbMove) {
            console.log(`[BotMove] EGTB move for game ${gameId}: ${egtbMove.from} → ${egtbMove.to}`);
            try {
                await this.makeMoveUseCase.execute(gameId, 'AI', egtbMove.from, egtbMove.to);
                console.log(`[BotMove] EGTB move submitted for game ${gameId}`);
            }
            catch (err) {
                console.error(`[BotMove] EGTB move failed for game ${gameId}:`, err);
            }
            return;
        }
        const moveRequest = {
            pieces,
            currentPlayer: botColor,
            moveCount: game.getMoveCount(),
            timeLimitMs,
        };
        const engineMove = await this.kallistoService.getMove(moveRequest);
        if (!engineMove || engineMove.from < 1 || engineMove.to < 1) {
            console.warn(`[BotMove] Kallisto returned no valid move for game ${gameId}`);
            return;
        }
        console.log(`[BotMove] Submitting move: ${engineMove.from} → ${engineMove.to}`);
        try {
            await this.makeMoveUseCase.execute(gameId, 'AI', engineMove.from, engineMove.to);
            console.log(`[BotMove] Move submitted successfully for game ${gameId}`);
        }
        catch (err) {
            console.error(`[BotMove] Failed to submit move for game ${gameId}:`, err);
        }
    }
    getBotColor(game) {
        if (game.whitePlayerId === 'AI')
            return game_constants_1.PlayerColor.WHITE;
        if (game.blackPlayerId === 'AI')
            return game_constants_1.PlayerColor.BLACK;
        return null;
    }
    timeLimitForLevel(level) {
        if (level <= 1)
            return 200;
        if (level === 2)
            return 300;
        if (level === 3)
            return 500;
        if (level === 4)
            return 700;
        if (level === 5)
            return 1000;
        if (level === 6)
            return 1500;
        if (level === 7)
            return 3000;
        if (level === 8)
            return 5000;
        return 12000;
    }
};
exports.BotMoveUseCase = BotMoveUseCase;
exports.BotMoveUseCase = BotMoveUseCase = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('IGameRepository')),
    __param(3, (0, common_1.Inject)((0, common_1.forwardRef)(() => make_move_use_case_1.MakeMoveUseCase))),
    __metadata("design:paramtypes", [Object, kallisto_engine_service_1.KallistoEngineService,
        egtb_service_1.EgtbService,
        make_move_use_case_1.MakeMoveUseCase,
        game_state_cache_service_1.GameStateCacheService])
], BotMoveUseCase);
//# sourceMappingURL=bot-move.use-case.js.map