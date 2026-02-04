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
let GamesGateway = class GamesGateway {
    server;
    logger = new common_1.Logger('GamesGateway');
    handleConnection(client) {
        this.logger.log(`Client connected: ${client.id}`);
    }
    handleDisconnect(client) {
        this.logger.log(`Client disconnected: ${client.id}`);
    }
    handleJoinGame(gameId, client) {
        if (!gameId) {
            return { status: 'error', message: 'Game ID required' };
        }
        client.join(gameId);
        this.logger.log(`Client ${client.id} joined game room: ${gameId}`);
        return { status: 'success', message: `Joined game ${gameId}` };
    }
    emitGameStateUpdate(gameId, gameState) {
        this.server.to(gameId).emit('gameStateUpdated', gameState);
        this.logger.log(`Emitted gameStateUpdated for game: ${gameId}`);
    }
    emitGameOver(gameId, result) {
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
exports.GamesGateway = GamesGateway = __decorate([
    (0, websockets_1.WebSocketGateway)({
        cors: {
            origin: '*',
        },
        namespace: 'games',
    })
], GamesGateway);
//# sourceMappingURL=games.gateway.js.map