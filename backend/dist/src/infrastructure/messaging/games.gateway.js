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
exports.GamesGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const socket_io_1 = require("socket.io");
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const ws_jwt_guard_1 = require("../../auth/guards/ws-jwt.guard");
const make_move_use_case_1 = require("../../application/use-cases/make-move.use-case");
const end_game_use_case_1 = require("../../application/use-cases/end-game.use-case");
const create_game_use_case_1 = require("../../application/use-cases/create-game.use-case");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const game_constants_1 = require("../../shared/constants/game.constants");
const ABANDON_TIMEOUT_MS = 60_000;
const ABANDON_TICK_MS = 1_000;
let GamesGateway = class GamesGateway {
    moduleRef;
    server;
    logger = new common_1.Logger('GamesGateway');
    pendingDrawOffers = new Map();
    pendingRematchOffers = new Map();
    userGameMap = new Map();
    disconnectTimers = new Map();
    disconnectTickIntervals = new Map();
    userConnectionCounts = new Map();
    constructor(moduleRef) {
        this.moduleRef = moduleRef;
    }
    handleConnection(client) {
        try {
            const jwtService = this.moduleRef.get(jwt_1.JwtService, { strict: false });
            const configService = this.moduleRef.get(config_1.ConfigService, {
                strict: false,
            });
            const token = client.handshake.auth?.token ??
                (() => {
                    const header = client.handshake.headers.authorization ?? '';
                    const [type, t] = header.split(' ');
                    return type === 'Bearer' ? t : null;
                })();
            if (!token) {
                this.logger.warn(`Socket ${client.id} rejected: no token`);
                client.disconnect();
                return;
            }
            const payload = jwtService.verify(token, {
                secret: configService.get('JWT_SECRET'),
            });
            client.data.user = { id: payload.sub };
            const existingConnections = this.userConnectionCounts.get(payload.sub) ?? 0;
            this.userConnectionCounts.set(payload.sub, existingConnections + 1);
            this.logger.log(`Client connected: ${client.id} (User: ${payload.sub})`);
        }
        catch {
            this.logger.warn(`Socket ${client.id} rejected: invalid token`);
            client.disconnect();
        }
    }
    handleDisconnect(client) {
        const userId = client.data.user?.id;
        this.logger.log(`Client disconnected: ${client.id} (User: ${userId || 'unknown'})`);
        if (!userId)
            return;
        const existingConnections = this.userConnectionCounts.get(userId) ?? 0;
        const remainingConnections = Math.max(0, existingConnections - 1);
        if (remainingConnections === 0) {
            this.userConnectionCounts.delete(userId);
        }
        else {
            this.userConnectionCounts.set(userId, remainingConnections);
            return;
        }
        const gameId = this.userGameMap.get(userId);
        if (!gameId)
            return;
        const existingTimer = this.disconnectTimers.get(userId);
        if (existingTimer) {
            clearTimeout(existingTimer);
            this.disconnectTimers.delete(userId);
        }
        const existingTick = this.disconnectTickIntervals.get(userId);
        if (existingTick) {
            clearInterval(existingTick);
            this.disconnectTickIntervals.delete(userId);
        }
        this.server.to(gameId).emit('opponentDisconnected', {
            userId,
            secondsRemaining: Math.round(ABANDON_TIMEOUT_MS / 1000),
        });
        let secondsLeft = Math.round(ABANDON_TIMEOUT_MS / 1000);
        const tickInterval = setInterval(() => {
            secondsLeft -= 1;
            if (secondsLeft > 0) {
                this.server
                    .to(gameId)
                    .emit('opponentDisconnectCountdown', {
                    userId,
                    secondsRemaining: secondsLeft,
                });
            }
            else {
                clearInterval(tickInterval);
                this.disconnectTickIntervals.delete(userId);
            }
        }, ABANDON_TICK_MS);
        this.disconnectTickIntervals.set(userId, tickInterval);
        const timer = setTimeout(async () => {
            this.disconnectTimers.delete(userId);
            this.userGameMap.delete(userId);
            const tick = this.disconnectTickIntervals.get(userId);
            if (tick) {
                clearInterval(tick);
                this.disconnectTickIntervals.delete(userId);
            }
            try {
                const repo = this.moduleRef.get('IGameRepository', {
                    strict: false,
                });
                const game = await repo.findById(gameId);
                if (!game ||
                    game.status !== game_constants_1.GameStatus.ACTIVE ||
                    game.gameType === game_constants_1.GameType.AI) {
                    return;
                }
                const endGameUseCase = this.moduleRef.get(end_game_use_case_1.EndGameUseCase, {
                    strict: false,
                });
                const { winner } = await endGameUseCase.resign(gameId, userId);
                this.emitGameOver(gameId, {
                    gameId,
                    winner: winner.toString(),
                    reason: 'abandon',
                });
                this.logger.log(`Auto-resigned user ${userId} from game ${gameId} (abandoned)`);
            }
            catch (err) {
                this.logger.error(`Auto-resign failed for game ${gameId}`, err);
            }
        }, ABANDON_TIMEOUT_MS);
        this.disconnectTimers.set(userId, timer);
    }
    handleJoinGame(gameId, client) {
        if (!gameId) {
            return { status: 'error', message: 'Game ID required' };
        }
        const userId = client.data.user?.id;
        client.join(gameId);
        this.logger.log(`Client ${client.id} (User: ${userId}) joined game room: ${gameId}`);
        if (userId) {
            const existingTimer = this.disconnectTimers.get(userId);
            if (existingTimer) {
                clearTimeout(existingTimer);
                this.disconnectTimers.delete(userId);
                const existingTick = this.disconnectTickIntervals.get(userId);
                if (existingTick) {
                    clearInterval(existingTick);
                    this.disconnectTickIntervals.delete(userId);
                }
                this.server.to(gameId).emit('opponentReconnected', { userId });
                this.logger.log(`User ${userId} reconnected to game ${gameId}`);
            }
            this.userGameMap.set(userId, gameId);
        }
        return { status: 'success', message: `Joined game ${gameId}` };
    }
    async handleMakeMove(data, client) {
        const userId = client.data.user?.id;
        if (!userId)
            return { error: 'Not authenticated' };
        try {
            const makeMoveUseCase = this.moduleRef.get(make_move_use_case_1.MakeMoveUseCase, {
                strict: false,
            });
            await makeMoveUseCase.execute(data.gameId, userId, data.from, data.to);
            return {};
        }
        catch (err) {
            const message = err?.response?.message || err?.message || 'Invalid move';
            return { error: message };
        }
    }
    async handleOfferDraw(data, client) {
        const userId = client.data.user?.id;
        if (!userId)
            return { error: 'Not authenticated' };
        const existing = this.pendingDrawOffers.get(data.gameId);
        if (existing === userId) {
            return { error: 'You already have a pending draw offer' };
        }
        this.pendingDrawOffers.set(data.gameId, userId);
        this.logger.log(`Draw offered in game ${data.gameId} by ${userId}`);
        this.server.to(data.gameId).emit('drawOffered', {
            gameId: data.gameId,
            offeredByUserId: userId,
        });
        return {};
    }
    async handleAcceptDraw(data, client) {
        const userId = client.data.user?.id;
        if (!userId)
            return { error: 'Not authenticated' };
        const offeredBy = this.pendingDrawOffers.get(data.gameId);
        if (!offeredBy)
            return { error: 'No pending draw offer' };
        if (offeredBy === userId)
            return { error: 'Cannot accept your own draw offer' };
        this.pendingDrawOffers.delete(data.gameId);
        try {
            const endGameUseCase = this.moduleRef.get(end_game_use_case_1.EndGameUseCase, {
                strict: false,
            });
            await endGameUseCase.drawByAgreement(data.gameId, userId);
            this.emitGameOver(data.gameId, {
                gameId: data.gameId,
                winner: 'DRAW',
                reason: 'draw_agreement',
            });
            return {};
        }
        catch (err) {
            return { error: err?.message || 'Failed to end game as draw' };
        }
    }
    handleDeclineDraw(data, client) {
        const userId = client.data.user?.id;
        if (!userId)
            return { error: 'Not authenticated' };
        const offeredBy = this.pendingDrawOffers.get(data.gameId);
        if (!offeredBy)
            return { error: 'No pending draw offer' };
        if (offeredBy === userId)
            return { error: 'Cannot decline your own draw offer' };
        this.pendingDrawOffers.delete(data.gameId);
        this.logger.log(`Draw declined in game ${data.gameId} by ${userId}`);
        this.server.to(data.gameId).emit('drawDeclined', {
            gameId: data.gameId,
            declinedByUserId: userId,
        });
        return {};
    }
    handleCancelDraw(data, client) {
        const userId = client.data.user?.id;
        if (!userId)
            return { error: 'Not authenticated' };
        const offeredBy = this.pendingDrawOffers.get(data.gameId);
        if (offeredBy !== userId)
            return { error: 'No draw offer to cancel' };
        this.pendingDrawOffers.delete(data.gameId);
        this.server.to(data.gameId).emit('drawCancelled', { gameId: data.gameId });
        return {};
    }
    handleOfferRematch(data, client) {
        const userId = client.data.user?.id;
        if (!userId)
            return { error: 'Not authenticated' };
        if (this.pendingRematchOffers.get(data.gameId) === userId) {
            return { error: 'You already offered a rematch' };
        }
        this.pendingRematchOffers.set(data.gameId, userId);
        this.server
            .to(data.gameId)
            .emit('rematchOffered', { offeredByUserId: userId });
        this.logger.log(`Rematch offered in game ${data.gameId} by ${userId}`);
        return {};
    }
    async handleAcceptRematch(data, client) {
        const userId = client.data.user?.id;
        if (!userId)
            return { error: 'Not authenticated' };
        const offeredBy = this.pendingRematchOffers.get(data.gameId);
        if (!offeredBy)
            return { error: 'No pending rematch offer' };
        if (offeredBy === userId)
            return { error: 'Cannot accept your own rematch offer' };
        this.pendingRematchOffers.delete(data.gameId);
        try {
            const createGameUseCase = this.moduleRef.get(create_game_use_case_1.CreateGameUseCase, {
                strict: false,
            });
            const newGame = await createGameUseCase.createRematch(data.gameId);
            this.server
                .to(data.gameId)
                .emit('rematchAccepted', { newGameId: newGame.id });
            this.logger.log(`Rematch accepted for game ${data.gameId} → new game ${newGame.id}`);
            return {};
        }
        catch (err) {
            return { error: err?.message || 'Failed to create rematch' };
        }
    }
    handleDeclineRematch(data, client) {
        const userId = client.data.user?.id;
        if (!userId)
            return { error: 'Not authenticated' };
        this.pendingRematchOffers.delete(data.gameId);
        this.server
            .to(data.gameId)
            .emit('rematchDeclined', { declinedByUserId: userId });
        return {};
    }
    handleCancelRematch(data, client) {
        const userId = client.data.user?.id;
        if (!userId)
            return { error: 'Not authenticated' };
        if (this.pendingRematchOffers.get(data.gameId) !== userId) {
            return { error: 'No rematch offer to cancel' };
        }
        this.pendingRematchOffers.delete(data.gameId);
        this.server.to(data.gameId).emit('rematchCancelled', {});
        return {};
    }
    isInRoom(client, gameId) {
        const userId = client.data.user?.id;
        return !!userId && this.userGameMap.get(userId) === gameId;
    }
    handleVoiceRing(data, client) {
        if (!this.isInRoom(client, data.gameId))
            return;
        client.to(data.gameId).emit('voice:ring', {});
    }
    handleVoiceAccept(data, client) {
        if (!this.isInRoom(client, data.gameId))
            return;
        client.to(data.gameId).emit('voice:accept', {});
    }
    handleVoiceDecline(data, client) {
        if (!this.isInRoom(client, data.gameId))
            return;
        client.to(data.gameId).emit('voice:decline', {});
    }
    handleVoiceOffer(data, client) {
        if (!this.isInRoom(client, data.gameId))
            return;
        client.to(data.gameId).emit('voice:offer', { sdp: data.sdp });
    }
    handleVoiceAnswer(data, client) {
        if (!this.isInRoom(client, data.gameId))
            return;
        client.to(data.gameId).emit('voice:answer', { sdp: data.sdp });
    }
    handleVoiceIceCandidate(data, client) {
        if (!this.isInRoom(client, data.gameId))
            return;
        client
            .to(data.gameId)
            .emit('voice:ice-candidate', { candidate: data.candidate });
    }
    handleVoiceHangup(data, client) {
        if (!this.isInRoom(client, data.gameId))
            return;
        client.to(data.gameId).emit('voice:hangup', {});
    }
    async handleClaimTimeout(data, client) {
        const userId = client.data.user?.id;
        if (!userId)
            return { error: 'Not authenticated' };
        try {
            const repo = this.moduleRef.get('IGameRepository', {
                strict: false,
            });
            const game = await repo.findById(data.gameId);
            if (!game ||
                game.status !== game_constants_1.GameStatus.ACTIVE ||
                game.gameType === game_constants_1.GameType.AI) {
                return {};
            }
            const clock = game.clockInfo;
            if (!clock)
                return {};
            const now = Date.now();
            const elapsed = now - new Date(clock.lastMoveAt).getTime();
            const moveCount = game.getMoveCount ? game.getMoveCount() : 0;
            const activeIsWhite = moveCount % 2 === 0;
            const whiteMs = activeIsWhite
                ? Math.max(0, clock.whiteTimeMs - elapsed)
                : clock.whiteTimeMs;
            const blackMs = activeIsWhite
                ? clock.blackTimeMs
                : Math.max(0, clock.blackTimeMs - elapsed);
            let timedOutPlayerId = null;
            let winner = null;
            if (whiteMs <= 0) {
                timedOutPlayerId = game.whitePlayerId;
                winner = 'BLACK';
            }
            else if (blackMs <= 0) {
                timedOutPlayerId = game.blackPlayerId;
                winner = 'WHITE';
            }
            if (!timedOutPlayerId || !winner)
                return {};
            const endGameUseCase = this.moduleRef.get(end_game_use_case_1.EndGameUseCase, {
                strict: false,
            });
            await endGameUseCase.timeout(data.gameId, timedOutPlayerId);
            this.emitGameOver(data.gameId, {
                gameId: data.gameId,
                winner,
                reason: 'timeout',
            });
            this.logger.log(`Timeout claimed for game ${data.gameId}: winner=${winner} (claimed by ${userId})`);
            return {};
        }
        catch (err) {
            this.logger.error(`claimTimeout failed for game ${data.gameId}`, err);
            return { error: err?.message || 'Claim failed' };
        }
    }
    emitMatchFound(socketId, gameId) {
        this.server.to(socketId).emit("matchFound", { gameId });
        this.logger.log(`Emitted matchFound to socket ${socketId} for game ${gameId}`);
    }
    emitGameStateUpdate(gameId, gameState) {
        this.server.to(gameId).emit('gameStateUpdated', gameState);
        this.logger.log(`Emitted gameStateUpdated for game: ${gameId}`);
    }
    emitGameOver(gameId, result) {
        this.pendingDrawOffers.delete(gameId);
        this.pendingRematchOffers.delete(gameId);
        for (const [userId, gid] of this.userGameMap.entries()) {
            if (gid === gameId) {
                const timer = this.disconnectTimers.get(userId);
                if (timer) {
                    clearTimeout(timer);
                    this.disconnectTimers.delete(userId);
                }
                const tick = this.disconnectTickIntervals.get(userId);
                if (tick) {
                    clearInterval(tick);
                    this.disconnectTickIntervals.delete(userId);
                }
                this.userGameMap.delete(userId);
            }
        }
        this.server.to(gameId).emit('gameOver', result);
        this.logger.log(`Emitted gameOver for game: ${gameId}`);
    }
};
exports.GamesGateway = GamesGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], GamesGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('joinGame'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, socket_io_1.Socket]),
    __metadata("design:returntype", void 0)
], GamesGateway.prototype, "handleJoinGame", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('makeMove'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", Promise)
], GamesGateway.prototype, "handleMakeMove", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('offerDraw'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", Promise)
], GamesGateway.prototype, "handleOfferDraw", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('acceptDraw'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", Promise)
], GamesGateway.prototype, "handleAcceptDraw", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('declineDraw'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", Object)
], GamesGateway.prototype, "handleDeclineDraw", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('cancelDraw'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", Object)
], GamesGateway.prototype, "handleCancelDraw", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('offerRematch'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", Object)
], GamesGateway.prototype, "handleOfferRematch", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('acceptRematch'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", Promise)
], GamesGateway.prototype, "handleAcceptRematch", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('declineRematch'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", Object)
], GamesGateway.prototype, "handleDeclineRematch", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('cancelRematch'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", Object)
], GamesGateway.prototype, "handleCancelRematch", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('voice:ring'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", void 0)
], GamesGateway.prototype, "handleVoiceRing", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('voice:accept'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", void 0)
], GamesGateway.prototype, "handleVoiceAccept", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('voice:decline'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", void 0)
], GamesGateway.prototype, "handleVoiceDecline", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('voice:offer'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", void 0)
], GamesGateway.prototype, "handleVoiceOffer", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('voice:answer'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", void 0)
], GamesGateway.prototype, "handleVoiceAnswer", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('voice:ice-candidate'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", void 0)
], GamesGateway.prototype, "handleVoiceIceCandidate", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('voice:hangup'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", void 0)
], GamesGateway.prototype, "handleVoiceHangup", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('claimTimeout'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", Promise)
], GamesGateway.prototype, "handleClaimTimeout", null);
exports.GamesGateway = GamesGateway = __decorate([
    (0, websockets_1.WebSocketGateway)({
        cors: {
            origin: process.env.FRONTEND_URL || 'http://localhost:3000',
            credentials: true,
        },
        namespace: 'games',
    }),
    (0, common_1.UseGuards)(ws_jwt_guard_1.WsJwtGuard),
    __metadata("design:paramtypes", [core_1.ModuleRef])
], GamesGateway);
//# sourceMappingURL=games.gateway.js.map