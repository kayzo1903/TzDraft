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
exports.CreatePvEGameDto = exports.CreatePvPGameDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
const game_constants_1 = require("../../../shared/constants/game.constants");
class CreatePvPGameDto {
    whitePlayerId;
    blackPlayerId;
    whiteElo;
    blackElo;
}
exports.CreatePvPGameDto = CreatePvPGameDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'White player ID' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreatePvPGameDto.prototype, "whitePlayerId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Black player ID' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreatePvPGameDto.prototype, "blackPlayerId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'White player ELO rating', required: false }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], CreatePvPGameDto.prototype, "whiteElo", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Black player ELO rating', required: false }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], CreatePvPGameDto.prototype, "blackElo", void 0);
class CreatePvEGameDto {
    playerId;
    playerColor;
    playerElo;
    aiLevel;
    initialTimeMs;
}
exports.CreatePvEGameDto = CreatePvEGameDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Player ID' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreatePvEGameDto.prototype, "playerId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Player color', enum: game_constants_1.PlayerColor }),
    (0, class_validator_1.IsEnum)(game_constants_1.PlayerColor),
    __metadata("design:type", String)
], CreatePvEGameDto.prototype, "playerColor", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Player ELO rating', required: false }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], CreatePvEGameDto.prototype, "playerElo", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'AI difficulty level (1-7)',
        minimum: 1,
        maximum: 7,
    }),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], CreatePvEGameDto.prototype, "aiLevel", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Initial time in milliseconds', required: false }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], CreatePvEGameDto.prototype, "initialTimeMs", void 0);
//# sourceMappingURL=create-game.dto.js.map