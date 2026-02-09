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
exports.ResetPasswordPhoneDto = exports.VerifyOtpDto = exports.SendOtpDto = void 0;
const class_validator_1 = require("class-validator");
class SendOtpDto {
    phoneNumber;
}
exports.SendOtpDto = SendOtpDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/^(0|255|\+255)?[67]\d{8}$/, {
        message: 'Phone number must be a valid Tanzanian number',
    }),
    __metadata("design:type", String)
], SendOtpDto.prototype, "phoneNumber", void 0);
class VerifyOtpDto {
    phoneNumber;
    code;
}
exports.VerifyOtpDto = VerifyOtpDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/^(0|255|\+255)?[67]\d{8}$/, {
        message: 'Phone number must be a valid Tanzanian number',
    }),
    __metadata("design:type", String)
], VerifyOtpDto.prototype, "phoneNumber", void 0);
__decorate([
    (0, class_validator_1.Matches)(/^\d{6}$/, {
        message: 'OTP code must be 6 digits',
    }),
    __metadata("design:type", String)
], VerifyOtpDto.prototype, "code", void 0);
class ResetPasswordPhoneDto {
    phoneNumber;
    code;
    newPassword;
}
exports.ResetPasswordPhoneDto = ResetPasswordPhoneDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/^(0|255|\+255)?[67]\d{8}$/, {
        message: 'Phone number must be a valid Tanzanian number',
    }),
    __metadata("design:type", String)
], ResetPasswordPhoneDto.prototype, "phoneNumber", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.Matches)(/^\d{6}$/, {
        message: 'OTP code must be 6 digits',
    }),
    __metadata("design:type", String)
], ResetPasswordPhoneDto.prototype, "code", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MinLength)(8, {
        message: 'Password must be at least 8 characters long',
    }),
    __metadata("design:type", String)
], ResetPasswordPhoneDto.prototype, "newPassword", void 0);
//# sourceMappingURL=otp.dto.js.map