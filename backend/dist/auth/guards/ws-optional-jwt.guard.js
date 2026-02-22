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
Object.defineProperty(exports, "__esModule", { value: true });
exports.WsOptionalJwtGuard = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
let WsOptionalJwtGuard = class WsOptionalJwtGuard {
    jwtService;
    config;
    constructor(jwtService, config) {
        this.jwtService = jwtService;
        this.config = config;
    }
    async canActivate(context) {
        const client = context.switchToWs().getClient();
        const guestId = this.extractGuestId(client);
        if (guestId) {
            client.data.guestId = guestId;
        }
        const token = this.extractToken(client);
        if (!token) {
            return true;
        }
        try {
            const payload = this.jwtService.verify(token, {
                secret: this.config.get('JWT_SECRET'),
            });
            client.data.user = {
                id: payload.sub,
            };
        }
        catch (error) {
        }
        return true;
    }
    extractToken(client) {
        const authToken = typeof client.handshake.auth?.token === 'string'
            ? client.handshake.auth.token
            : null;
        if (authToken)
            return authToken;
        const authHeader = client.handshake.headers.authorization;
        if (!authHeader)
            return null;
        const [type, token] = authHeader.split(' ');
        return type === 'Bearer' ? token : null;
    }
    extractGuestId(client) {
        const value = client.handshake.auth?.guestId;
        if (typeof value !== 'string')
            return null;
        const guestId = value.trim();
        if (!guestId || guestId.length > 100)
            return null;
        return guestId;
    }
};
exports.WsOptionalJwtGuard = WsOptionalJwtGuard;
exports.WsOptionalJwtGuard = WsOptionalJwtGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [jwt_1.JwtService,
        config_1.ConfigService])
], WsOptionalJwtGuard);
//# sourceMappingURL=ws-optional-jwt.guard.js.map