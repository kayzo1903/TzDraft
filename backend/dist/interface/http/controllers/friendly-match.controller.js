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
exports.FriendlyMatchController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const current_user_decorator_1 = require("../../../auth/decorators/current-user.decorator");
const public_decorator_1 = require("../../../auth/decorators/public.decorator");
const jwt_auth_guard_1 = require("../../../auth/guards/jwt-auth.guard");
const create_game_use_case_1 = require("../../../application/use-cases/create-game.use-case");
const game_constants_1 = require("../../../shared/constants/game.constants");
const friendly_match_service_1 = require("../../../domain/friend/friendly-match.service");
const games_gateway_1 = require("../../../infrastructure/messaging/games.gateway");
const prisma_service_1 = require("../../../infrastructure/database/prisma/prisma.service");
const crypto_1 = require("crypto");
const jsonwebtoken_1 = require("jsonwebtoken");
let FriendlyMatchController = class FriendlyMatchController {
    friendlyMatchService;
    createGameUseCase;
    gamesGateway;
    prisma;
    gameRepository;
    inviteViewers = new Map();
    constructor(friendlyMatchService, createGameUseCase, gamesGateway, prisma, gameRepository) {
        this.friendlyMatchService = friendlyMatchService;
        this.createGameUseCase = createGameUseCase;
        this.gamesGateway = gamesGateway;
        this.prisma = prisma;
        this.gameRepository = gameRepository;
    }
    async createInvite(user, dto) {
        const payload = dto || {};
        let gameId;
        if (payload.friendId) {
            const friendBusy = await this.hasBlockingActiveGame(payload.friendId);
            if (friendBusy) {
                throw new common_1.BadRequestException('Friend is in another match right now');
            }
            const hostBusy = await this.hasBlockingActiveGame(user.id);
            if (hostBusy) {
                throw new common_1.BadRequestException('You are already in another match');
            }
            const preGame = await this.createGameUseCase.createFriendlyGame(user.id, payload.friendId, 500, 500, undefined, undefined, game_constants_1.GameType.CASUAL, payload.initialTimeMs);
            gameId = preGame.id;
        }
        let invite;
        try {
            invite = await this.friendlyMatchService.createInvite(user.id, {
                ...payload,
                gameId,
            });
        }
        catch (error) {
            if (gameId) {
                await this.gameRepository.delete(gameId);
            }
            throw error;
        }
        const locale = payload.locale === 'en' ? 'en' : payload.locale === 'sw' ? 'sw' : 'en';
        const frontendBase = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
        const inviteUrl = `${frontendBase}/${locale}/game/friendly/${invite.inviteToken}`;
        const waitingUrl = `${frontendBase}/${locale}/game/friendly/wait/${invite.id}`;
        if (invite.invitedFriendId) {
            const isOnline = await this.gamesGateway.isParticipantOnline(invite.invitedFriendId);
            if (isOnline) {
                await this.gamesGateway.emitToParticipant(invite.invitedFriendId, 'friendlyMatchInvited', {
                    inviteId: invite.id,
                    inviteToken: invite.inviteToken,
                    hostId: invite.hostId,
                    hostDisplayName: invite.host.displayName,
                    inviteUrl,
                    expiresAt: invite.expiresAt,
                });
            }
        }
        return {
            ...invite,
            gameId: invite.gameId || gameId || null,
            inviteUrl,
            waitingUrl,
            whatsappShareText: locale === 'sw'
                ? `🎯 Nakuchallenge mchezo wa Tanzania Draughts! Bonyeza hapa ucheze: ${inviteUrl}`
                : `🎯 I challenge you to a game of Tanzania Draughts! Click here to play: ${inviteUrl}`,
        };
    }
    async getInvite(user, token, guestId, req) {
        const invite = await this.friendlyMatchService.getInviteByToken(token);
        const actorId = user?.id || this.normalizeGuestId(guestId) || null;
        const canAccept = invite.status === 'PENDING' &&
            invite.hostId !== actorId &&
            (!invite.invitedFriendId || invite.invitedFriendId === actorId);
        if (invite.status === 'PENDING' && invite.hostId !== actorId) {
            const viewerKey = actorId || req?.ip || `anon-${Date.now()}`;
            let viewers = this.inviteViewers.get(invite.id);
            if (!viewers) {
                viewers = new Set();
                this.inviteViewers.set(invite.id, viewers);
            }
            viewers.add(String(viewerKey));
            await this.gamesGateway.emitToParticipant(invite.hostId, 'friendlyInviteLinkViewed', {
                inviteId: invite.id,
                totalViews: viewers.size,
            });
        }
        return { ...invite, canAccept };
    }
    async incoming(user) {
        return this.friendlyMatchService.listIncoming(user.id);
    }
    async outgoing(user) {
        return this.friendlyMatchService.listOutgoing(user.id);
    }
    async getById(user, id, guestId) {
        const actorId = user?.id || this.resolveGuestId(guestId) || null;
        try {
            return await this.friendlyMatchService.getInviteById(id, actorId);
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException) {
                throw error;
            }
            throw new common_1.BadRequestException(error instanceof Error ? error.message : 'Failed to retrieve invite');
        }
    }
    async accept(user, token, req, body) {
        const actorId = this.resolveActorId(user, req, body?.guestId);
        if (!actorId) {
            throw new common_1.BadRequestException('Missing player identity');
        }
        if (!user?.id) {
            await this.ensureGuestParticipant(actorId, body?.guestName);
        }
        const invite = await this.friendlyMatchService.reserveInviteForAccept(token, actorId);
        try {
            let gameId = invite.gameId;
            if (!gameId) {
                const game = await this.createGameUseCase.createFriendlyGame(invite.hostId, actorId, 500, 500, undefined, undefined, game_constants_1.GameType.CASUAL, invite.initialTimeMs);
                gameId = game.id;
                await this.friendlyMatchService.attachGame(invite.id, gameId);
            }
            await this.gamesGateway.emitToParticipant(invite.hostId, 'friendlyInviteOpponentJoined', {
                inviteId: invite.id,
                gameId,
                guestId: actorId,
                guestDisplayName: invite.guest?.displayName || body?.guestName || 'Opponent',
            });
            const persistedGame = await this.gameRepository.findById(gameId);
            const playerColor = persistedGame?.whitePlayerId === actorId
                ? 'WHITE'
                : persistedGame?.blackPlayerId === actorId
                    ? 'BLACK'
                    : null;
            return { status: 'success', gameId, inviteId: invite.id, playerColor };
        }
        catch (error) {
            await this.friendlyMatchService.rollbackAcceptance(invite.id);
            throw error;
        }
    }
    async decline(user, id) {
        const invite = await this.friendlyMatchService.declineInvite(id, user.id);
        if (invite?.hostId) {
            await this.gamesGateway.emitToParticipant(invite.hostId, 'friendlyInviteDeclined', {
                inviteId: invite.id,
                declinedBy: user.id,
            });
        }
        return { status: 'success' };
    }
    async cancel(user, id) {
        await this.friendlyMatchService.cancelInvite(id, user.id);
        return { status: 'success' };
    }
    normalizeGuestId(input) {
        if (!input)
            return null;
        const cleaned = String(input).trim();
        if (!/^\d{9}$/.test(cleaned))
            return null;
        return cleaned;
    }
    resolveGuestId(input) {
        const normalized = this.normalizeGuestId(input);
        if (normalized)
            return normalized;
        return (0, crypto_1.randomInt)(0, 1_000_000_000).toString().padStart(9, '0');
    }
    resolveActorId(user, req, guestId) {
        if (user?.id)
            return user.id;
        const authHeader = req?.headers?.authorization || req?.headers?.Authorization;
        if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
            const token = authHeader.slice('Bearer '.length).trim();
            const secret = process.env.JWT_SECRET;
            if (token && secret) {
                try {
                    const payload = (0, jsonwebtoken_1.verify)(token, secret);
                    if (typeof payload?.sub === 'string' && payload.sub.length > 0) {
                        return payload.sub;
                    }
                }
                catch {
                }
            }
        }
        return this.normalizeGuestId(guestId);
    }
    async ensureGuestParticipant(guestId, guestName) {
        const id = this.resolveGuestId(guestId);
        const token = id.replace(/[^a-zA-Z0-9_-]/g, '_');
        const baseName = guestName?.trim() || 'Guest';
        const displayName = `${baseName}-${token.slice(0, 6)}`;
        await this.prisma.user.upsert({
            where: { id },
            update: { displayName },
            create: {
                id,
                phoneNumber: `guest-${token}`,
                username: `guest_${token}`,
                displayName,
                passwordHash: null,
            },
        });
    }
    async hasBlockingActiveGame(playerId) {
        const activeGames = await this.gameRepository.findActiveGamesByPlayer(playerId);
        if (activeGames.length === 0)
            return false;
        const activeIds = activeGames.map((g) => g.id);
        const pendingInvites = await this.prisma.friendlyMatch.findMany({
            where: {
                gameId: { in: activeIds },
                status: 'PENDING',
            },
            select: { gameId: true },
        });
        const pendingIds = new Set(pendingInvites
            .map((invite) => invite.gameId)
            .filter((id) => Boolean(id)));
        return activeGames.some((game) => !pendingIds.has(game.id));
    }
};
exports.FriendlyMatchController = FriendlyMatchController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, swagger_1.ApiOperation)({ summary: 'Create a friendly (unranked) invite' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Invite created' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], FriendlyMatchController.prototype, "createInvite", null);
__decorate([
    (0, common_1.Get)('invites/:token'),
    (0, public_decorator_1.Public)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Get invite details by token' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Invite details' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('token')),
    __param(2, (0, common_1.Query)('guestId')),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, Object]),
    __metadata("design:returntype", Promise)
], FriendlyMatchController.prototype, "getInvite", null);
__decorate([
    (0, common_1.Get)('incoming'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'List incoming direct friend challenges' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], FriendlyMatchController.prototype, "incoming", null);
__decorate([
    (0, common_1.Get)('outgoing'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'List outgoing friendly invites/challenges' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], FriendlyMatchController.prototype, "outgoing", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, public_decorator_1.Public)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({
        summary: 'Get a specific invite by id (host, guest, or invited friend)',
    }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Query)('guestId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], FriendlyMatchController.prototype, "getById", null);
__decorate([
    (0, common_1.Post)('invites/:token/accept'),
    (0, public_decorator_1.Public)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Accept invite and start unranked friendly game' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('token')),
    __param(2, (0, common_1.Req)()),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object, Object]),
    __metadata("design:returntype", Promise)
], FriendlyMatchController.prototype, "accept", null);
__decorate([
    (0, common_1.Post)(':id/decline'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Decline a direct friend challenge' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], FriendlyMatchController.prototype, "decline", null);
__decorate([
    (0, common_1.Post)(':id/cancel'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Cancel your pending invite' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], FriendlyMatchController.prototype, "cancel", null);
exports.FriendlyMatchController = FriendlyMatchController = __decorate([
    (0, swagger_1.ApiTags)('friendly-matches'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('friends/matches'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(4, (0, common_1.Inject)('IGameRepository')),
    __metadata("design:paramtypes", [friendly_match_service_1.FriendlyMatchService,
        create_game_use_case_1.CreateGameUseCase,
        games_gateway_1.GamesGateway,
        prisma_service_1.PrismaService, Object])
], FriendlyMatchController);
//# sourceMappingURL=friendly-match.controller.js.map