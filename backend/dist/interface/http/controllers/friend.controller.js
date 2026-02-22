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
exports.FriendController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const jwt_auth_guard_1 = require("../../../auth/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../../../auth/decorators/current-user.decorator");
const use_cases_1 = require("../../../application/use-cases");
const games_gateway_1 = require("../../../infrastructure/messaging/games.gateway");
const dtos_1 = require("../dtos");
let FriendController = class FriendController {
    sendFriendRequestUseCase;
    acceptFriendRequestUseCase;
    rejectFriendRequestUseCase;
    getFriendsUseCase;
    getPendingFriendRequestsUseCase;
    removeFriendUseCase;
    getSentFriendRequestsUseCase;
    cancelFriendRequestUseCase;
    gamesGateway;
    constructor(sendFriendRequestUseCase, acceptFriendRequestUseCase, rejectFriendRequestUseCase, getFriendsUseCase, getPendingFriendRequestsUseCase, removeFriendUseCase, getSentFriendRequestsUseCase, cancelFriendRequestUseCase, gamesGateway) {
        this.sendFriendRequestUseCase = sendFriendRequestUseCase;
        this.acceptFriendRequestUseCase = acceptFriendRequestUseCase;
        this.rejectFriendRequestUseCase = rejectFriendRequestUseCase;
        this.getFriendsUseCase = getFriendsUseCase;
        this.getPendingFriendRequestsUseCase = getPendingFriendRequestsUseCase;
        this.removeFriendUseCase = removeFriendUseCase;
        this.getSentFriendRequestsUseCase = getSentFriendRequestsUseCase;
        this.cancelFriendRequestUseCase = cancelFriendRequestUseCase;
        this.gamesGateway = gamesGateway;
    }
    async sendFriendRequest(user, dto) {
        return await this.sendFriendRequestUseCase.execute(user.id, dto.friendId);
    }
    async acceptFriendRequest(user, requesterId) {
        return await this.acceptFriendRequestUseCase.execute(requesterId, user.id);
    }
    async rejectFriendRequest(user, requesterId) {
        return await this.rejectFriendRequestUseCase.execute(requesterId, user.id);
    }
    async cancelFriendRequest(user, requesteeId) {
        await this.cancelFriendRequestUseCase.execute(user.id, requesteeId);
    }
    async getFriends(user) {
        return await this.getFriendsUseCase.execute(user.id);
    }
    async getOnlineFriends(user) {
        const friends = await this.getFriendsUseCase.execute(user.id);
        const friendIds = (friends || []).map((f) => f.id);
        const onlineIds = await this.gamesGateway.getOnlineParticipantIds(friendIds);
        return {
            onlineIds,
            onlineMap: friendIds.reduce((acc, id) => {
                acc[id] = onlineIds.includes(id);
                return acc;
            }, {}),
        };
    }
    async getPendingRequests(user) {
        return await this.getPendingFriendRequestsUseCase.execute(user.id);
    }
    async getSentRequests(user) {
        return await this.getSentFriendRequestsUseCase.execute(user.id);
    }
    async removeFriend(user, friendId) {
        return await this.removeFriendUseCase.execute(user.id, friendId);
    }
};
exports.FriendController = FriendController;
__decorate([
    (0, common_1.Post)('requests/send'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, swagger_1.ApiOperation)({ summary: 'Send a friend request to another user' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Friend request sent successfully' }),
    (0, swagger_1.ApiResponse)({
        status: 400,
        description: 'Bad request - invalid data or already friends',
    }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'User not found' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, dtos_1.SendFriendRequestDto]),
    __metadata("design:returntype", Promise)
], FriendController.prototype, "sendFriendRequest", null);
__decorate([
    (0, common_1.Post)('requests/:requesterId/accept'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Accept a friend request from another user' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Friend request accepted successfully',
    }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Bad request - invalid request' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Friend request not found' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('requesterId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], FriendController.prototype, "acceptFriendRequest", null);
__decorate([
    (0, common_1.Post)('requests/:requesterId/reject'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Reject a friend request from another user' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Friend request rejected successfully',
    }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Bad request - invalid request' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Friend request not found' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('requesterId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], FriendController.prototype, "rejectFriendRequest", null);
__decorate([
    (0, common_1.Delete)('requests/:requesteeId'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    (0, swagger_1.ApiOperation)({ summary: 'Cancel a sent friend request' }),
    (0, swagger_1.ApiResponse)({
        status: 204,
        description: 'Friend request canceled successfully',
    }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Friend request not found' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('requesteeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], FriendController.prototype, "cancelFriendRequest", null);
__decorate([
    (0, common_1.Get)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Get all friends of the current user' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Friends retrieved successfully' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], FriendController.prototype, "getFriends", null);
__decorate([
    (0, common_1.Get)('online'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: "Get current user's online friends" }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Online friend IDs returned' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], FriendController.prototype, "getOnlineFriends", null);
__decorate([
    (0, common_1.Get)('requests/pending'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({
        summary: 'Get all pending friend requests for the current user',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Pending requests retrieved successfully',
    }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], FriendController.prototype, "getPendingRequests", null);
__decorate([
    (0, common_1.Get)('requests/sent'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({
        summary: 'Get all sent friend requests for the current user',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Sent requests retrieved successfully',
    }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], FriendController.prototype, "getSentRequests", null);
__decorate([
    (0, common_1.Delete)(':friendId'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    (0, swagger_1.ApiOperation)({ summary: 'Remove a friend' }),
    (0, swagger_1.ApiResponse)({ status: 204, description: 'Friend removed successfully' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Friendship not found' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('friendId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], FriendController.prototype, "removeFriend", null);
exports.FriendController = FriendController = __decorate([
    (0, swagger_1.ApiTags)('friends'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('friends'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [use_cases_1.SendFriendRequestUseCase,
        use_cases_1.AcceptFriendRequestUseCase,
        use_cases_1.RejectFriendRequestUseCase,
        use_cases_1.GetFriendsUseCase,
        use_cases_1.GetPendingFriendRequestsUseCase,
        use_cases_1.RemoveFriendUseCase,
        use_cases_1.GetSentFriendRequestsUseCase,
        use_cases_1.CancelFriendRequestUseCase,
        games_gateway_1.GamesGateway])
], FriendController);
//# sourceMappingURL=friend.controller.js.map