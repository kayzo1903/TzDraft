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
const ws_optional_jwt_guard_1 = require("../../auth/guards/ws-optional-jwt.guard");
const matchmaking_service_1 = require("../../application/services/matchmaking.service");
const game_constants_1 = require("../../shared/constants/game.constants");
const common_2 = require("@nestjs/common");
const end_game_use_case_1 = require("../../application/use-cases/end-game.use-case");
const make_move_use_case_1 = require("../../application/use-cases/make-move.use-case");
const bot_move_use_case_1 = require("../../application/use-cases/bot-move.use-case");
const create_game_use_case_1 = require("../../application/use-cases/create-game.use-case");
const prisma_service_1 = require("../database/prisma/prisma.service");
let GamesGateway = class GamesGateway {
    matchmakingService;
    endGameUseCase;
    makeMoveUseCase;
    botMoveUseCase;
    createGameUseCase;
    prisma;
    gameRepository;
    server;
    logger = new common_1.Logger('GamesGateway');
    disconnectTimers = new Map();
    disconnectState = new Map();
    gameTimers = new Map();
    DISCONNECT_GRACE_MS = 60_000;
    drawOffers = new Map();
    DRAW_OFFER_TTL_MS = 60_000;
    rematchRequests = new Map();
    REMATCH_TTL_MS = 60_000;
    readyStates = new Map();
    constructor(matchmakingService, endGameUseCase, makeMoveUseCase, botMoveUseCase, createGameUseCase, prisma, gameRepository) {
        this.matchmakingService = matchmakingService;
        this.endGameUseCase = endGameUseCase;
        this.makeMoveUseCase = makeMoveUseCase;
        this.botMoveUseCase = botMoveUseCase;
        this.createGameUseCase = createGameUseCase;
        this.prisma = prisma;
        this.gameRepository = gameRepository;
    }
    handleConnection(client) {
        const participantId = this.getSocketParticipantId(client);
        this.logger.log(`Client connected: ${client.id} (Participant: ${participantId || 'unknown'})`);
        if (participantId) {
            this.clearDisconnectForfeit(participantId);
        }
    }
    handleDisconnect(client) {
        const participantId = this.getSocketParticipantId(client);
        this.logger.log(`Client disconnected: ${client.id} (Participant: ${participantId || 'unknown'})`);
        this.matchmakingService.leaveQueue(client.id);
        if (participantId) {
            this.scheduleDisconnectForfeit(participantId);
        }
    }
    clearDrawOffer(gameId) {
        const offer = this.drawOffers.get(gameId);
        if (!offer)
            return;
        clearTimeout(offer.timer);
        this.drawOffers.delete(gameId);
    }
    clearRematchRequest(gameId) {
        const pending = this.rematchRequests.get(gameId);
        if (!pending)
            return;
        clearTimeout(pending.timer);
        this.rematchRequests.delete(gameId);
    }
    async getSocketsByParticipant(participantId) {
        const sockets = await this.server.fetchSockets();
        return sockets.filter((socket) => this.getSocketParticipantId(socket) === participantId);
    }
    async ensureParticipantRecord(participantId, guestName) {
        const existing = await this.prisma.user.findUnique({
            where: { id: participantId },
            select: { id: true },
        });
        if (existing)
            return;
        const token = participantId.replace(/[^a-zA-Z0-9_-]/g, '_');
        const baseName = guestName?.trim() || 'Guest';
        const displayName = `${baseName}-${token.slice(0, 8)}`;
        await this.prisma.user.create({
            data: {
                id: participantId,
                phoneNumber: `guest-${token}`,
                username: `guest_${token}`,
                displayName,
                passwordHash: null,
            },
        });
    }
    async handleRequestDraw(data, client) {
        const participantId = this.getSocketParticipantId(client);
        if (!participantId) {
            return { status: 'error', message: 'Participant not identified' };
        }
        const gameId = data?.gameId;
        if (!gameId) {
            return { status: 'error', message: 'Game ID required' };
        }
        try {
            const game = await this.gameRepository.findById(gameId);
            if (!game)
                return { status: 'error', message: 'Game not found' };
            if (game.whitePlayerId !== participantId &&
                game.blackPlayerId !== participantId) {
                return { status: 'error', message: 'Player not in this game' };
            }
            if (game.status !== 'ACTIVE') {
                return { status: 'error', message: 'Game is not active' };
            }
            const offeringColor = game.whitePlayerId === participantId
                ? game_constants_1.PlayerColor.WHITE
                : game_constants_1.PlayerColor.BLACK;
            if (game.currentTurn === offeringColor) {
                return {
                    status: 'error',
                    message: 'Draw offer must be made after completing your move',
                };
            }
            const existing = this.drawOffers.get(gameId);
            if (existing) {
                if (existing.offeredBy === participantId) {
                    return { status: 'success', message: 'Draw already offered' };
                }
                await this.endGameUseCase.drawByAgreement(gameId);
                this.clearDrawOffer(gameId);
                return { status: 'success', message: 'Draw accepted' };
            }
            const expiresAt = Date.now() + this.DRAW_OFFER_TTL_MS;
            const timer = setTimeout(() => {
                this.drawOffers.delete(gameId);
                this.server.to(gameId).emit('drawOfferExpired', { gameId });
            }, this.DRAW_OFFER_TTL_MS);
            this.drawOffers.set(gameId, {
                offeredBy: participantId,
                expiresAt,
                timer,
            });
            this.server.to(gameId).emit('drawOffered', {
                gameId,
                offeredBy: participantId,
                expiresAt,
            });
            return { status: 'success' };
        }
        catch (error) {
            this.logger.warn(`requestDraw failed game=${gameId} player=${participantId}`, error);
            return { status: 'error', message: 'Failed to request draw' };
        }
    }
    async handleRespondDraw(data, client) {
        const participantId = this.getSocketParticipantId(client);
        if (!participantId) {
            return { status: 'error', message: 'Participant not identified' };
        }
        const gameId = data?.gameId;
        if (!gameId) {
            return { status: 'error', message: 'Game ID required' };
        }
        const offer = this.drawOffers.get(gameId);
        if (!offer) {
            return { status: 'error', message: 'No active draw offer' };
        }
        if (offer.offeredBy === participantId) {
            return {
                status: 'error',
                message: 'Cannot respond to your own draw offer',
            };
        }
        if (data.accept) {
            try {
                await this.endGameUseCase.drawByAgreement(gameId);
                this.clearDrawOffer(gameId);
                return { status: 'success' };
            }
            catch (error) {
                this.logger.warn(`respondDraw accept failed game=${gameId} player=${participantId}`, error);
                return { status: 'error', message: 'Failed to accept draw' };
            }
        }
        this.clearDrawOffer(gameId);
        this.server.to(gameId).emit('drawDeclined', {
            gameId,
            declinedBy: participantId,
        });
        return { status: 'success' };
    }
    async handleCancelDraw(data, client) {
        const participantId = this.getSocketParticipantId(client);
        if (!participantId) {
            return { status: 'error', message: 'Participant not identified' };
        }
        const gameId = data?.gameId;
        if (!gameId) {
            return { status: 'error', message: 'Game ID required' };
        }
        const offer = this.drawOffers.get(gameId);
        if (!offer)
            return { status: 'success' };
        if (offer.offeredBy !== participantId) {
            return { status: 'error', message: 'Only offerer can cancel' };
        }
        this.clearDrawOffer(gameId);
        this.server.to(gameId).emit('drawCancelled', {
            gameId,
            cancelledBy: participantId,
        });
        return { status: 'success' };
    }
    async handleJoinWaitingRoom(data, client) {
        const inviteId = data?.inviteId;
        if (!inviteId)
            return { status: 'error', message: 'inviteId required' };
        const participantId = this.getSocketParticipantId(client);
        const room = `waitroom-${inviteId}`;
        client.join(room);
        this.logger.log(`Client ${client.id} (${participantId ?? 'unknown'}) joined waiting room ${room}`);
        this.server.to(room).emit('waitingRoomPresence', {
            inviteId,
            participantId,
            displayName: data?.displayName,
        });
        try {
            const invite = await this.prisma.friendlyMatch.findUnique({
                where: { id: inviteId },
                select: { gameId: true },
            });
            const gameId = invite?.gameId;
            if (gameId) {
                const game = await this.gameRepository.findById(gameId);
                if (!game || game.status !== game_constants_1.GameStatus.ACTIVE) {
                    return { status: 'success' };
                }
                const activeEntries = [...this.disconnectState.values()].filter((entry) => entry.gameId === gameId && Date.now() < entry.deadlineMs);
                for (const entry of activeEntries) {
                    client.emit('playerDisconnected', {
                        gameId,
                        playerId: entry.playerId,
                        timeoutSec: Math.max(1, Math.ceil((entry.deadlineMs - Date.now()) / 1000)),
                        deadlineMs: entry.deadlineMs,
                    });
                }
            }
        }
        catch (error) {
            this.logger.warn(`Failed to replay disconnect state for waiting room invite=${inviteId}`, error);
        }
        return { status: 'success' };
    }
    async handleReadyForGame(data, client) {
        const participantId = this.getSocketParticipantId(client);
        if (!participantId) {
            return { status: 'error', message: 'Participant not identified' };
        }
        const gameId = data?.gameId;
        if (!gameId)
            return { status: 'error', message: 'gameId required' };
        try {
            const game = await this.gameRepository.findById(gameId);
            if (!game)
                return { status: 'error', message: 'Game not found' };
            if (game.status !== 'WAITING') {
                return { status: 'already_active', gameId };
            }
            if (game.whitePlayerId !== participantId &&
                game.blackPlayerId !== participantId) {
                return { status: 'error', message: 'Player not in this game' };
            }
            const waitroom = data?.inviteId ? `waitroom-${data.inviteId}` : null;
            if (data?.inviteId) {
                const invite = await this.prisma.friendlyMatch.findUnique({
                    where: { id: data.inviteId },
                    select: {
                        hostId: true,
                        guestId: true,
                        gameId: true,
                        status: true,
                    },
                });
                const inviteMatchesGame = invite &&
                    invite.status === 'ACCEPTED' &&
                    invite.gameId === gameId &&
                    invite.guestId;
                if (inviteMatchesGame) {
                    if (participantId !== invite.hostId) {
                        return {
                            status: 'waiting_host',
                            message: 'Only host can start this match',
                        };
                    }
                    this.readyStates.delete(gameId);
                    game.start();
                    await this.gameRepository.update(game);
                    this.logger.log(`Friendly game ${gameId} activated by host`);
                    this.scheduleGameTimeout(gameId, game.initialTimeMs, game.whitePlayerId);
                    const readyPayload = {
                        gameId,
                        readyPlayers: [invite.hostId, invite.guestId],
                    };
                    this.server.to(gameId).emit('readyStateUpdated', readyPayload);
                    if (waitroom) {
                        this.server.to(waitroom).emit('readyStateUpdated', readyPayload);
                    }
                    const activatedPayload = {
                        gameId,
                        status: 'ACTIVE',
                        currentTurn: 'WHITE',
                        clockInfo: {
                            whiteTimeMs: game.initialTimeMs,
                            blackTimeMs: game.initialTimeMs,
                        },
                        serverTimeMs: Date.now(),
                    };
                    this.server.to(gameId).emit('gameActivated', activatedPayload);
                    if (waitroom) {
                        this.server.to(waitroom).emit('gameActivated', activatedPayload);
                    }
                    return { status: 'success', mode: 'host_start' };
                }
            }
            if (!this.readyStates.has(gameId)) {
                this.readyStates.set(gameId, new Set());
            }
            this.readyStates.get(gameId).add(participantId);
            const readySet = this.readyStates.get(gameId);
            const readyPayload = {
                gameId,
                readyPlayers: [...readySet],
            };
            this.server.to(gameId).emit('readyStateUpdated', readyPayload);
            if (waitroom) {
                this.server.to(waitroom).emit('readyStateUpdated', readyPayload);
            }
            const bothReady = game.whitePlayerId &&
                game.blackPlayerId &&
                readySet.has(game.whitePlayerId) &&
                readySet.has(game.blackPlayerId);
            if (bothReady) {
                this.readyStates.delete(gameId);
                game.start();
                await this.gameRepository.update(game);
                this.logger.log(`Friendly game ${gameId} activated via readyForGame`);
                this.scheduleGameTimeout(gameId, game.initialTimeMs, game.whitePlayerId);
                const activatedPayload = {
                    gameId,
                    status: 'ACTIVE',
                    currentTurn: 'WHITE',
                    clockInfo: {
                        whiteTimeMs: game.initialTimeMs,
                        blackTimeMs: game.initialTimeMs,
                    },
                    serverTimeMs: Date.now(),
                };
                this.server.to(gameId).emit('gameActivated', activatedPayload);
                if (waitroom) {
                    this.server.to(waitroom).emit('gameActivated', activatedPayload);
                }
            }
            return { status: 'success', readyCount: readySet.size };
        }
        catch (err) {
            this.logger.warn(`readyForGame failed game=${gameId}`, err);
            return { status: 'error', message: 'Failed to process readyForGame' };
        }
    }
    async handleJoinGame(payload, client) {
        const gameId = typeof payload === 'string' ? payload : payload?.gameId;
        if (!gameId) {
            return { status: 'error', message: 'Game ID required' };
        }
        const participantId = this.getSocketParticipantId(client);
        if (participantId) {
            this.clearDisconnectForfeit(participantId);
        }
        client.join(gameId);
        this.logger.log(`Client ${client.id} (Participant: ${participantId}) joined game room: ${gameId}`);
        let resolvedPlayerColor = null;
        if (participantId) {
            try {
                const game = await this.gameRepository.findById(gameId);
                const playerColor = game?.whitePlayerId === participantId
                    ? 'WHITE'
                    : game?.blackPlayerId === participantId
                        ? 'BLACK'
                        : null;
                resolvedPlayerColor = playerColor;
                if (playerColor) {
                    client.emit('joinedGame', { gameId, playerColor });
                }
                const disconnectEntries = [...this.disconnectState.values()].filter((entry) => entry.gameId === gameId &&
                    Date.now() < entry.deadlineMs &&
                    entry.playerId !== participantId);
                for (const entry of disconnectEntries) {
                    client.emit('playerDisconnected', {
                        gameId,
                        playerId: entry.playerId,
                        timeoutSec: Math.max(1, Math.ceil((entry.deadlineMs - Date.now()) / 1000)),
                        deadlineMs: entry.deadlineMs,
                    });
                }
            }
            catch (error) {
                this.logger.warn(`Failed to resolve playerColor for joinGame game=${gameId} player=${participantId}`, error);
            }
        }
        return {
            status: 'success',
            message: `Joined game ${gameId}`,
            playerColor: resolvedPlayerColor,
            participantId,
        };
    }
    async handleMakeMove(data, client) {
        const participantId = this.getSocketParticipantId(client);
        if (!participantId) {
            return { status: 'error', message: 'Participant not identified' };
        }
        this.logger.log(`Make move request from ${participantId} in game ${data.gameId}: ${data.from} -> ${data.to}`);
        try {
            const result = await this.makeMoveUseCase.execute(data.gameId, participantId, data.from, data.to);
            if (result.game.isPvE() && result.game.status === 'ACTIVE') {
                setImmediate(() => {
                    this.botMoveUseCase.execute(data.gameId).catch((err) => {
                        this.logger.error(`Bot move failed for game ${data.gameId}: ${err?.message}`);
                    });
                });
            }
            return { status: 'success' };
        }
        catch (error) {
            this.logger.error(`Move failed: ${error.message}`);
            client.emit('moveRejected', {
                gameId: data.gameId,
                from: data.from,
                to: data.to,
                message: error.message,
            });
            return { status: 'error', message: error.message };
        }
    }
    handleFindMatch(data, client) {
        this.logger.log(`Client ${client.id} requesting match: ${JSON.stringify(data)}`);
        const userId = client.data.user?.id;
        const participantId = this.getSocketParticipantId(client);
        if (participantId) {
            this.clearDisconnectForfeit(participantId);
        }
        if (data.mode === 'RANKED' && !client.data.user) {
            return { status: 'error', message: 'Must be logged in for Ranked' };
        }
        const gameMode = data.mode === 'RANKED' ? game_constants_1.GameType.RANKED : game_constants_1.GameType.CASUAL;
        if (!this.matchmakingService) {
            this.logger.error('MatchmakingService not initialized');
            return { status: 'error', message: 'Matchmaking unavailable' };
        }
        const joined = this.matchmakingService.joinQueue(client, gameMode, data.guestName);
        if (!joined) {
            return {
                status: 'error',
                message: 'Unable to join queue: missing participant identity',
            };
        }
        return { status: 'success', message: 'Joined matchmaking queue' };
    }
    async handleResignGame(data, client) {
        const participantId = this.getSocketParticipantId(client);
        const gameId = data?.gameId;
        if (!participantId) {
            return { status: 'error', message: 'Participant not identified' };
        }
        if (!gameId) {
            return { status: 'error', message: 'Game ID required' };
        }
        try {
            await this.endGameUseCase.resign(gameId, participantId);
            return { status: 'success' };
        }
        catch (error) {
            this.logger.warn(`resignGame failed game=${gameId} player=${participantId}`, error);
            return { status: 'error', message: error?.message || 'Failed to resign' };
        }
    }
    async handleAbortGame(data, client) {
        const participantId = this.getSocketParticipantId(client);
        const gameId = data?.gameId;
        if (!participantId) {
            return { status: 'error', message: 'Participant not identified' };
        }
        if (!gameId) {
            return { status: 'error', message: 'Game ID required' };
        }
        try {
            await this.endGameUseCase.abort(gameId, participantId);
            return { status: 'success' };
        }
        catch (error) {
            this.logger.warn(`abortGame failed game=${gameId} player=${participantId}`, error);
            return { status: 'error', message: error?.message || 'Failed to abort' };
        }
    }
    handleCancelMatch(client) {
        if (this.matchmakingService) {
            this.matchmakingService.leaveQueue(client.id);
            return { status: 'success', message: 'Left matchmaking queue' };
        }
        return { status: 'error', message: 'Matchmaking unavailable' };
    }
    async handleRequestRematch(data, client) {
        const participantId = this.getSocketParticipantId(client);
        if (!participantId) {
            return { status: 'error', message: 'Participant not identified' };
        }
        const gameId = data?.gameId;
        if (!gameId) {
            return { status: 'error', message: 'Game ID required' };
        }
        const previousGame = await this.gameRepository.findById(gameId);
        if (!previousGame) {
            return { status: 'error', message: 'Game not found' };
        }
        if (previousGame.gameType === game_constants_1.GameType.AI) {
            return {
                status: 'error',
                message: 'Rematch is only available for PvP games',
            };
        }
        if (previousGame.status !== 'FINISHED' &&
            previousGame.status !== 'ABORTED') {
            return {
                status: 'error',
                message: 'Rematch is available after the game ends',
            };
        }
        if (previousGame.whitePlayerId !== participantId &&
            previousGame.blackPlayerId !== participantId) {
            return { status: 'error', message: 'Player not in this game' };
        }
        const opponentId = previousGame.whitePlayerId === participantId
            ? previousGame.blackPlayerId
            : previousGame.whitePlayerId;
        if (!opponentId) {
            return { status: 'error', message: 'Opponent not found for rematch' };
        }
        const pending = this.rematchRequests.get(gameId);
        if (!pending) {
            const timer = setTimeout(() => {
                const stale = this.rematchRequests.get(gameId);
                if (!stale)
                    return;
                this.rematchRequests.delete(gameId);
                this.server.to(gameId).emit('rematchExpired', { gameId });
            }, this.REMATCH_TTL_MS);
            this.rematchRequests.set(gameId, {
                offeredBy: participantId,
                offeredTo: opponentId,
                timer,
            });
            const opponentSockets = await this.getSocketsByParticipant(opponentId);
            for (const socket of opponentSockets) {
                socket.emit('rematchRequested', { gameId, offeredBy: participantId });
            }
            return { status: 'success', state: 'waiting' };
        }
        if (pending.offeredBy === participantId) {
            return { status: 'success', state: 'waiting' };
        }
        if (pending.offeredTo !== participantId) {
            return {
                status: 'error',
                message: 'Rematch request belongs to different players',
            };
        }
        this.clearRematchRequest(gameId);
        try {
            await Promise.all([
                previousGame.whitePlayerId
                    ? this.ensureParticipantRecord(previousGame.whitePlayerId, previousGame.whiteGuestName)
                    : Promise.resolve(),
                previousGame.blackPlayerId
                    ? this.ensureParticipantRecord(previousGame.blackPlayerId, previousGame.blackGuestName)
                    : Promise.resolve(),
            ]);
            const linkedFriendlyMatch = await this.prisma.friendlyMatch.findFirst({
                where: { gameId },
                select: { initialTimeMs: true },
                orderBy: { createdAt: 'desc' },
            });
            const initialTimeMs = Math.max(60_000, Number(linkedFriendlyMatch?.initialTimeMs || 600_000));
            const rematchGame = await this.createGameUseCase.createPvPGame(previousGame.blackPlayerId, previousGame.whitePlayerId, previousGame.blackElo, previousGame.whiteElo, previousGame.blackGuestName || undefined, previousGame.whiteGuestName || undefined, previousGame.gameType, initialTimeMs);
            const whiteId = rematchGame.whitePlayerId;
            const blackId = rematchGame.blackPlayerId;
            if (!whiteId || !blackId) {
                return {
                    status: 'error',
                    message: 'Failed to initialize rematch players',
                };
            }
            const [whiteSockets, blackSockets] = await Promise.all([
                this.getSocketsByParticipant(whiteId),
                this.getSocketsByParticipant(blackId),
            ]);
            for (const socket of whiteSockets) {
                socket.join(rematchGame.id);
                socket.emit('gameStarted', {
                    gameId: rematchGame.id,
                    whiteId,
                    blackId,
                    playerColor: 'WHITE',
                });
            }
            for (const socket of blackSockets) {
                socket.join(rematchGame.id);
                socket.emit('gameStarted', {
                    gameId: rematchGame.id,
                    whiteId,
                    blackId,
                    playerColor: 'BLACK',
                });
            }
            return { status: 'success', state: 'matched', gameId: rematchGame.id };
        }
        catch (error) {
            this.logger.error(`Failed to create rematch for game=${gameId} player=${participantId}`, error);
            return { status: 'error', message: 'Failed to create rematch' };
        }
    }
    emitGameStateUpdate(gameId, gameState) {
        this.server.to(gameId).emit('gameStateUpdated', gameState);
        this.logger.log(`Emitted gameStateUpdated for game: ${gameId}`);
    }
    emitMoveRollback(gameId, move) {
        this.server.to(gameId).emit('moveRollback', { gameId, move });
        this.logger.warn(`Emitted moveRollback for game: ${gameId} move=${move.from}->${move.to}`);
    }
    emitGameOver(gameId, result) {
        this.clearGameTimer(gameId);
        this.server.to(gameId).emit('gameOver', result);
        this.logger.log(`Emitted gameOver for game: ${gameId} | reason=${result?.reason ?? 'UNKNOWN'} | winner=${result?.winner ?? 'null'} | endedBy=${result?.endedBy ?? 'n/a'} | noMoves=${result?.noMoves ?? 'n/a'}`);
    }
    emitGameStart(gameId, players) {
        this.server.to(gameId).emit('gameStarted', { gameId });
        this.logger.log(`Emitted gameStarted for game: ${gameId}`);
    }
    async isParticipantOnline(participantId) {
        return this.hasConnectedSocket(participantId);
    }
    async getOnlineParticipantIds(participantIds) {
        const sockets = await this.server.fetchSockets();
        const onlineSet = new Set(sockets
            .map((socket) => this.getSocketParticipantId(socket))
            .filter((id) => Boolean(id)));
        return participantIds.filter((id) => onlineSet.has(id));
    }
    async emitToParticipant(participantId, event, payload) {
        const sockets = await this.getSocketsByParticipant(participantId);
        for (const socket of sockets) {
            socket.emit(event, payload);
        }
    }
    async notifyFriendlyMatchStarted(gameId, whiteId, blackId, inviteId) {
        const [whiteSockets, blackSockets] = await Promise.all([
            this.getSocketsByParticipant(whiteId),
            this.getSocketsByParticipant(blackId),
        ]);
        for (const socket of whiteSockets) {
            socket.join(gameId);
            socket.emit('gameStarted', {
                gameId,
                whiteId,
                blackId,
                inviteId,
                playerColor: 'WHITE',
            });
        }
        for (const socket of blackSockets) {
            socket.join(gameId);
            socket.emit('gameStarted', {
                gameId,
                whiteId,
                blackId,
                inviteId,
                playerColor: 'BLACK',
            });
        }
    }
    scheduleGameTimeout(gameId, durationMs, playerId) {
        this.clearGameTimer(gameId);
        const bufferMs = 500;
        const timeoutMs = Math.max(0, durationMs + bufferMs);
        this.logger.log(`Scheduling timeout for game ${gameId} in ${timeoutMs}ms (Player: ${playerId})`);
        const timer = setTimeout(async () => {
            this.gameTimers.delete(gameId);
            try {
                await this.endGameUseCase.timeout(gameId, playerId);
            }
            catch (error) {
                this.logger.error(`Timeout enforcement failed for game=${gameId} user=${playerId}`, error);
            }
        }, timeoutMs);
        this.gameTimers.set(gameId, timer);
    }
    clearGameTimer(gameId) {
        const timer = this.gameTimers.get(gameId);
        if (timer) {
            clearTimeout(timer);
            this.gameTimers.delete(gameId);
        }
    }
    disconnectKey(gameId, userId) {
        return `${gameId}:${userId}`;
    }
    async emitDisconnectEventToParticipants(gameId, payload) {
        const game = await this.gameRepository.findById(gameId);
        if (!game)
            return;
        const participantIds = [game.whitePlayerId, game.blackPlayerId].filter((id) => Boolean(id));
        await Promise.all(participantIds.map((participantId) => this.emitToParticipant(participantId, 'playerDisconnected', {
            gameId,
            ...payload,
        })));
    }
    async emitReconnectedEventToParticipants(gameId, playerId) {
        const game = await this.gameRepository.findById(gameId);
        if (!game)
            return;
        const participantIds = [game.whitePlayerId, game.blackPlayerId].filter((id) => Boolean(id));
        await Promise.all(participantIds.map((participantId) => this.emitToParticipant(participantId, 'playerReconnected', {
            gameId,
            playerId,
        })));
    }
    async hasConnectedSocket(userId, roomId) {
        const sockets = roomId
            ? await this.server.in(roomId).fetchSockets()
            : await this.server.fetchSockets();
        return sockets.some((socket) => this.getSocketParticipantId(socket) === userId);
    }
    getSocketParticipantId(client) {
        return client.data.user?.id || client.data.guestId || null;
    }
    async scheduleDisconnectForfeit(userId) {
        if (await this.hasConnectedSocket(userId)) {
            this.logger.log(`Skipping disconnect forfeit scheduling for user=${userId} (another socket is still connected)`);
            return;
        }
        let activeGames = [];
        try {
            activeGames = await this.gameRepository.findActiveGamesByPlayer(userId);
        }
        catch (error) {
            this.logger.warn(`Failed to load active games for disconnect user=${userId}. Skipping disconnect forfeit scheduling.`, error);
            return;
        }
        for (const game of activeGames) {
            if (game.status !== game_constants_1.GameStatus.ACTIVE) {
                continue;
            }
            const connectedInGameRoom = await this.hasConnectedSocket(userId, game.id);
            if (connectedInGameRoom) {
                this.logger.log(`Skipping disconnect forfeit game=${game.id} user=${userId} (still connected in room)`);
                continue;
            }
            const key = this.disconnectKey(game.id, userId);
            if (this.disconnectTimers.has(key))
                continue;
            const deadlineMs = Date.now() + this.DISCONNECT_GRACE_MS;
            const timer = setTimeout(async () => {
                this.disconnectTimers.delete(key);
                this.disconnectState.delete(key);
                try {
                    this.logger.warn(`Disconnect timer fired key=${key} game=${game.id} user=${userId}`);
                    const sockets = await this.server.in(game.id).fetchSockets();
                    const reconnectedInRoom = sockets.some((socket) => this.getSocketParticipantId(socket) === userId);
                    this.logger.log(`Disconnect timer check key=${key} game=${game.id} user=${userId} sockets=${sockets.length} reconnected=${reconnectedInRoom}`);
                    if (reconnectedInRoom) {
                        await this.emitReconnectedEventToParticipants(game.id, userId);
                        this.logger.log(`Disconnect forfeit skipped key=${key} game=${game.id} user=${userId} (user already reconnected)`);
                        return;
                    }
                    const latestGame = await this.gameRepository.findById(game.id);
                    if (!latestGame || latestGame.status !== game_constants_1.GameStatus.ACTIVE) {
                        this.logger.log(`Disconnect forfeit skipped key=${key} game=${game.id} user=${userId} (game no longer active)`);
                        return;
                    }
                    await this.endGameUseCase.disconnectForfeit(game.id, userId);
                }
                catch (error) {
                    this.logger.error(`Disconnect forfeit failed for game=${game.id} user=${userId}`, error);
                }
            }, this.DISCONNECT_GRACE_MS);
            this.disconnectTimers.set(key, timer);
            this.disconnectState.set(key, {
                gameId: game.id,
                playerId: userId,
                deadlineMs,
            });
            await this.emitDisconnectEventToParticipants(game.id, {
                playerId: userId,
                timeoutSec: Math.floor(this.DISCONNECT_GRACE_MS / 1000),
                deadlineMs,
            });
            this.logger.warn(`Player ${userId} disconnected in game ${game.id}. key=${key} deadlineMs=${deadlineMs} timeoutMs=${this.DISCONNECT_GRACE_MS}`);
        }
    }
    async clearDisconnectForfeit(userId) {
        let activeGames = [];
        try {
            activeGames = await this.gameRepository.findActiveGamesByPlayer(userId);
        }
        catch (error) {
            this.logger.warn(`Failed to load active games for reconnect user=${userId}. Skipping disconnect forfeit cleanup.`, error);
            return;
        }
        for (const game of activeGames) {
            const key = this.disconnectKey(game.id, userId);
            const timer = this.disconnectTimers.get(key);
            if (!timer)
                continue;
            clearTimeout(timer);
            this.disconnectTimers.delete(key);
            this.disconnectState.delete(key);
            this.logger.log(`Disconnect timer cleared key=${key} game=${game.id} user=${userId}`);
            await this.emitReconnectedEventToParticipants(game.id, userId);
            this.logger.log(`Player ${userId} reconnected in game ${game.id}. Disconnect forfeit cancelled.`);
        }
    }
};
exports.GamesGateway = GamesGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], GamesGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('requestDraw'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", Promise)
], GamesGateway.prototype, "handleRequestDraw", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('respondDraw'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", Promise)
], GamesGateway.prototype, "handleRespondDraw", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('cancelDraw'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", Promise)
], GamesGateway.prototype, "handleCancelDraw", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('joinWaitingRoom'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", Promise)
], GamesGateway.prototype, "handleJoinWaitingRoom", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('readyForGame'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", Promise)
], GamesGateway.prototype, "handleReadyForGame", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('joinGame'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", Promise)
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
    (0, websockets_1.SubscribeMessage)('findMatch'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", void 0)
], GamesGateway.prototype, "handleFindMatch", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('resignGame'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", Promise)
], GamesGateway.prototype, "handleResignGame", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('abortGame'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", Promise)
], GamesGateway.prototype, "handleAbortGame", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('cancelMatch'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket]),
    __metadata("design:returntype", void 0)
], GamesGateway.prototype, "handleCancelMatch", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('requestRematch'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", Promise)
], GamesGateway.prototype, "handleRequestRematch", null);
exports.GamesGateway = GamesGateway = __decorate([
    (0, websockets_1.WebSocketGateway)({
        cors: {
            origin: process.env.NODE_ENV === 'production'
                ? process.env.FRONTEND_URL || 'https://tzdraft.com'
                : true,
            credentials: true,
        },
        namespace: 'games',
    }),
    (0, common_1.UseGuards)(ws_optional_jwt_guard_1.WsOptionalJwtGuard),
    __param(0, (0, common_2.Inject)((0, common_2.forwardRef)(() => matchmaking_service_1.MatchmakingService))),
    __param(1, (0, common_2.Inject)((0, common_2.forwardRef)(() => end_game_use_case_1.EndGameUseCase))),
    __param(2, (0, common_2.Inject)((0, common_2.forwardRef)(() => make_move_use_case_1.MakeMoveUseCase))),
    __param(3, (0, common_2.Inject)((0, common_2.forwardRef)(() => bot_move_use_case_1.BotMoveUseCase))),
    __param(6, (0, common_2.Inject)('IGameRepository')),
    __metadata("design:paramtypes", [matchmaking_service_1.MatchmakingService,
        end_game_use_case_1.EndGameUseCase,
        make_move_use_case_1.MakeMoveUseCase,
        bot_move_use_case_1.BotMoveUseCase,
        create_game_use_case_1.CreateGameUseCase,
        prisma_service_1.PrismaService, Object])
], GamesGateway);
//# sourceMappingURL=games.gateway.js.map