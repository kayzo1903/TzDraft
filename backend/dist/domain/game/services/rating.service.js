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
exports.RatingService = void 0;
const common_1 = require("@nestjs/common");
const game_constants_1 = require("../../../shared/constants/game.constants");
const user_service_1 = require("../../user/user.service");
let RatingService = class RatingService {
    userService;
    K_FACTOR = 32;
    constructor(userService) {
        this.userService = userService;
    }
    async updateRatings(game, winner) {
        if (game.gameType !== game_constants_1.GameType.RANKED) {
            return;
        }
        if (!game.whitePlayerId || !game.blackPlayerId) {
            return;
        }
        if (winner === game_constants_1.Winner.DRAW) {
            return;
        }
        else if (winner === game_constants_1.Winner.WHITE) {
            await this.calculateAndApply(game.whitePlayerId, game.blackPlayerId, 1);
        }
        else if (winner === game_constants_1.Winner.BLACK) {
            await this.calculateAndApply(game.whitePlayerId, game.blackPlayerId, 0);
        }
    }
    async calculateAndApply(playerAId, playerBId, actualScoreA) {
        const playerA = await this.userService.findById(playerAId);
        const playerB = await this.userService.findById(playerBId);
        if (!playerA || !playerB)
            return;
        const ratingA = playerA.rating?.rating || 1200;
        const ratingB = playerB.rating?.rating || 1200;
        const expectedScoreA = 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
        const expectedScoreB = 1 - expectedScoreA;
        const actualScoreB = 1 - actualScoreA;
        const newRatingA = Math.round(ratingA + this.K_FACTOR * (actualScoreA - expectedScoreA));
        const newRatingB = Math.round(ratingB + this.K_FACTOR * (actualScoreB - expectedScoreB));
        await this.userService.updateRating(playerAId, newRatingA);
        await this.userService.updateRating(playerBId, newRatingB);
    }
};
exports.RatingService = RatingService;
exports.RatingService = RatingService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [user_service_1.UserService])
], RatingService);
//# sourceMappingURL=rating.service.js.map