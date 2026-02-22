"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var GameStateCacheService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameStateCacheService = void 0;
const common_1 = require("@nestjs/common");
let GameStateCacheService = GameStateCacheService_1 = class GameStateCacheService {
    logger = new common_1.Logger(GameStateCacheService_1.name);
    cache = new Map();
    TTL_MS = 60 * 60 * 1000;
    set(game) {
        const existing = this.cache.get(game.id);
        if (existing)
            clearTimeout(existing.ttlTimer);
        const ttlTimer = setTimeout(() => {
            this.cache.delete(game.id);
            this.logger.debug(`Cache entry evicted (TTL) for game ${game.id}`);
        }, this.TTL_MS);
        if (typeof ttlTimer.unref === 'function')
            ttlTimer.unref();
        this.cache.set(game.id, {
            game,
            expiresAt: Date.now() + this.TTL_MS,
            ttlTimer,
        });
    }
    get(gameId) {
        return this.cache.get(gameId)?.game ?? null;
    }
    invalidate(gameId) {
        const entry = this.cache.get(gameId);
        if (!entry)
            return;
        clearTimeout(entry.ttlTimer);
        this.cache.delete(gameId);
        this.logger.debug(`Cache invalidated for game ${gameId}`);
    }
    get size() {
        return this.cache.size;
    }
};
exports.GameStateCacheService = GameStateCacheService;
exports.GameStateCacheService = GameStateCacheService = GameStateCacheService_1 = __decorate([
    (0, common_1.Injectable)()
], GameStateCacheService);
//# sourceMappingURL=game-state-cache.service.js.map