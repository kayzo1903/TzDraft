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
var MatchmakingService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MatchmakingService = void 0;
const common_1 = require("@nestjs/common");
const create_game_use_case_1 = require("../use-cases/create-game.use-case");
const game_constants_1 = require("../../shared/constants/game.constants");
const common_2 = require("@nestjs/common");
const games_gateway_1 = require("../../infrastructure/messaging/games.gateway");
const prisma_service_1 = require("../../infrastructure/database/prisma/prisma.service");
let MatchmakingService = MatchmakingService_1 = class MatchmakingService {
    createGameUseCase;
    prisma;
    gamesGateway;
    logger = new common_1.Logger(MatchmakingService_1.name);
    queue = [];
    interval;
    constructor(createGameUseCase, prisma, gamesGateway) {
        this.createGameUseCase = createGameUseCase;
        this.prisma = prisma;
        this.gamesGateway = gamesGateway;
        this.startMatchmakingLoop();
    }
    joinQueue(client, mode, guestName) {
        const userId = client.data.user?.id;
        const participantId = userId || client.data.guestId;
        const isGuest = !userId;
        const rating = mode === game_constants_1.GameType.RANKED
            ? (client.data.user?.rating?.rating ?? 1200)
            : 500;
        if (!participantId) {
            this.logger.warn(`Queue join rejected: missing participant identity (${client.id})`);
            return false;
        }
        this.leaveQueue(client.id);
        const player = {
            socketId: client.id,
            participantId,
            rating,
            isGuest,
            guestName,
            mode,
            joinedAt: Date.now(),
        };
        this.queue.push(player);
        this.logger.log(`Player joined queue: ${guestName || participantId} (${mode})`);
        this.processQueue();
        return true;
    }
    leaveQueue(socketId) {
        const index = this.queue.findIndex((p) => p.socketId === socketId);
        if (index !== -1) {
            this.queue.splice(index, 1);
            this.logger.log(`Player left queue: ${socketId}`);
        }
    }
    startMatchmakingLoop() {
        this.interval = setInterval(() => this.processQueue(), 5000);
    }
    async processQueue() {
        if (this.queue.length === 0) {
            return;
        }
        this.logger.debug(`Processing queue. Current size: ${this.queue.length}`);
        this.queue.forEach((p) => this.logger.debug(`In queue: ${p.socketId} (${p.mode}) - Participant: ${p.participantId}`));
        if (this.queue.length < 2)
            return;
        const rankedQueue = this.queue.filter((p) => p.mode === game_constants_1.GameType.RANKED);
        const casualRegisteredQueue = this.queue.filter((p) => p.mode === game_constants_1.GameType.CASUAL && !p.isGuest);
        const casualGuestQueue = this.queue.filter((p) => p.mode === game_constants_1.GameType.CASUAL && p.isGuest);
        this.logger.debug(`Ranked: ${rankedQueue.length}, Casual(registered): ${casualRegisteredQueue.length}, Casual(guest): ${casualGuestQueue.length}`);
        await this.processSubQueue(rankedQueue);
        await this.processSubQueue(casualRegisteredQueue);
        await this.processSubQueue(casualGuestQueue);
    }
    async processSubQueue(subQueue) {
        while (subQueue.length >= 2) {
            const player1 = subQueue.shift();
            const player2 = subQueue.shift();
            if (!player1 || !player2)
                break;
            this.leaveQueue(player1.socketId);
            this.leaveQueue(player2.socketId);
            try {
                await this.createGame(player1, player2);
            }
            catch (error) {
                this.logger.error('Error creating game match', error);
            }
        }
    }
    async createGame(p1, p2) {
        this.logger.log(`Creating game for ${p1.socketId} and ${p2.socketId}`);
        try {
            let game;
            const isRanked = p1.mode === game_constants_1.GameType.RANKED;
            if (p1.mode !== p2.mode) {
                this.logger.error('Mode mismatch in matching? Should be filtered by processSubQueue');
                return;
            }
            await Promise.all([
                this.ensureGuestParticipantRecord(p1),
                this.ensureGuestParticipantRecord(p2),
            ]);
            game = await this.createGameUseCase.createPvPGame(p1.participantId, p2.participantId, isRanked ? p1.rating : 500, isRanked ? p2.rating : 500, p1.guestName, p2.guestName, p1.mode);
            this.gamesGateway.server.in(p1.socketId).socketsJoin(game.id);
            this.gamesGateway.server.in(p2.socketId).socketsJoin(game.id);
            const payload = {
                gameId: game.id,
                whiteId: game.whitePlayerId,
                blackId: game.blackPlayerId,
                whiteName: p1.guestName || 'White',
                blackName: p2.guestName || 'Black',
            };
            this.gamesGateway.server.to(game.id).emit('gameFound', payload);
            this.gamesGateway.server.to(p1.socketId).emit('gameStarted', {
                ...payload,
                playerColor: 'WHITE',
            });
            this.gamesGateway.server.to(p2.socketId).emit('gameStarted', {
                ...payload,
                playerColor: 'BLACK',
            });
            this.logger.log(`Game match created: ${game.id}`);
        }
        catch (error) {
            this.logger.error('Failed to create game match', error);
        }
    }
    async ensureGuestParticipantRecord(player) {
        if (!player.isGuest) {
            return;
        }
        const participantToken = player.participantId.replace(/[^a-zA-Z0-9_-]/g, '_');
        const fallbackName = `Guest-${participantToken.slice(0, 8)}`;
        const displayName = player.guestName?.trim() || fallbackName;
        await this.prisma.user.upsert({
            where: { id: player.participantId },
            update: {},
            create: {
                id: player.participantId,
                phoneNumber: `guest-${participantToken}`,
                username: `guest_${participantToken}`,
                displayName,
                passwordHash: null,
            },
        });
    }
};
exports.MatchmakingService = MatchmakingService;
exports.MatchmakingService = MatchmakingService = MatchmakingService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(2, (0, common_2.Inject)((0, common_2.forwardRef)(() => games_gateway_1.GamesGateway))),
    __metadata("design:paramtypes", [create_game_use_case_1.CreateGameUseCase,
        prisma_service_1.PrismaService,
        games_gateway_1.GamesGateway])
], MatchmakingService);
//# sourceMappingURL=matchmaking.service.js.map