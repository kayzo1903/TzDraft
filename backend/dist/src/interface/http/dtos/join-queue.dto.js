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
exports.JoinQueueDto = exports.QUEUE_TIME_OPTIONS = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
exports.QUEUE_TIME_OPTIONS = [180000, 300000, 600000, 1800000];
class JoinQueueDto {
    timeMs;
    socketId;
}
exports.JoinQueueDto = JoinQueueDto;
__decorate([
    (0, swagger_1.ApiProperty)({
        description: 'Time control in milliseconds (3min=180000, 5min=300000, 10min=600000, 30min=1800000)',
        enum: exports.QUEUE_TIME_OPTIONS,
    }),
    (0, class_validator_1.IsIn)(exports.QUEUE_TIME_OPTIONS),
    __metadata("design:type", Number)
], JoinQueueDto.prototype, "timeMs", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: 'Socket.IO socket ID of the requesting client' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], JoinQueueDto.prototype, "socketId", void 0);
//# sourceMappingURL=join-queue.dto.js.map