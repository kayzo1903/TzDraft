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
exports.UserController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../../../auth/guards/jwt-auth.guard");
const user_service_1 = require("../../../domain/user/user.service");
const string_similarity_util_1 = require("../../../lib/string-similarity.util");
let UserController = class UserController {
    userService;
    constructor(userService) {
        this.userService = userService;
    }
    async searchUsers(query) {
        if (!query || query.trim().length === 0) {
            throw new common_1.BadRequestException('Search term required');
        }
        if (query.length > 50) {
            throw new common_1.BadRequestException('Search term too long');
        }
        try {
            const users = await this.userService.findAll();
            const results = (0, string_similarity_util_1.fuzzySearch)(query, users, (user) => [
                { value: user.displayName, weight: 1.0 },
            ], 100);
            return results.slice(0, 10).map(({ item, score }) => ({
                id: item.id,
                username: item.username,
                displayName: item.displayName,
                rating: item.rating?.rating || 1200,
                matchScore: score,
                isVerified: item.isVerified,
            }));
        }
        catch (error) {
            console.error('Search error:', error);
            throw new common_1.BadRequestException('Search failed');
        }
    }
};
exports.UserController = UserController;
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Get)('search'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Query)('q')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "searchUsers", null);
exports.UserController = UserController = __decorate([
    (0, common_1.Controller)('users'),
    __metadata("design:paramtypes", [user_service_1.UserService])
], UserController);
//# sourceMappingURL=user.controller.js.map